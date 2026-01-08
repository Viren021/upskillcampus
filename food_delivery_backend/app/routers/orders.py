
import random
import razorpay
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from pydantic import BaseModel  # 👈 Added for Driver Update

# Internal Imports
from .. import models, schemas, database
from app import auth  
from app.socket_manager import manager
from app.utils import send_sms  

# --- CONFIGURATION ---
RAZORPAY_KEY_ID = "your_razorpay_key_id"
RAZORPAY_KEY_SECRET = "your_razorpay_key_secret"

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

# --- DRIVER UPDATE SCHEMA ---
class DriverUpdate(BaseModel):
    latitude: float
    longitude: float
    distance_text: str 
    time_text: str     
    message: str       

# -----------------------------------------------------------------------------
# 1. INITIATE PAYMENT
# -----------------------------------------------------------------------------
@router.post("/initiate")
async def initiate_payment(
    order_data: schemas.OrderCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Calculate Total Amount
    total_amount = 0
    for item in order_data.items:
        result = await db.execute(select(models.MenuItem).filter(models.MenuItem.id == item.menu_item_id))
        menu_item = result.scalars().first()
        if menu_item:
            total_amount += menu_item.price * item.quantity

    if total_amount == 0:
        raise HTTPException(status_code=400, detail="Order total cannot be zero")

    # Create Razorpay Order ID
    data = { "amount": int(total_amount * 100), "currency": "INR", "receipt": "order_receipt" }
    try:
        payment = client.order.create(data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay Error: {str(e)}")
    
    return {
        "order_id": payment['id'], 
        "amount": payment['amount'], 
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID
    }

# -----------------------------------------------------------------------------
# 2. VERIFY & SAVE
# -----------------------------------------------------------------------------
@router.post("/verify")
async def verify_payment(
    payload: dict, 
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    payment_data = payload['payment']
    order_data = payload['order']

    try:
        # A. Verify Signature
        client.utility.verify_payment_signature({
            'razorpay_order_id': payment_data['razorpay_order_id'],
            'razorpay_payment_id': payment_data['razorpay_payment_id'],
            'razorpay_signature': payment_data['razorpay_signature']
        })
        print("✅ Signature Verified!")

        # B. Calculate Total & Prepare Items
        total_amount = 0
        order_items_objects = []
        
        for item in order_data['items']:
            result = await db.execute(select(models.MenuItem).filter(models.MenuItem.id == item['menu_item_id']))
            menu_item = result.scalars().first()
            if menu_item:
                total_amount += menu_item.price * item['quantity']
                new_order_item = models.OrderItem(
                    menu_item_id=menu_item.id,
                    quantity=item['quantity'],
                    price_at_time_of_order=menu_item.price
                )
                order_items_objects.append(new_order_item)

        # C. HANDLE LOCATION
        lat = order_data.get('delivery_latitude')
        lon = order_data.get('delivery_longitude')
        address = order_data.get('delivery_address')

        delivery_geom = None
        if lat and lon:
            delivery_geom = f"POINT({lon} {lat})"

        # D. Create Order Object
        new_order = models.Order(
            customer_id=current_user.id,
            restaurant_id=int(order_data['restaurant_id']),
            total_amount=total_amount,
            status=models.OrderStatus.PENDING,
            stripe_payment_id=payment_data['razorpay_payment_id'],
            
            delivery_address=address,
            delivery_location=delivery_geom,
            delivery_latitude=lat,    
            delivery_longitude=lon,
            
            # Default visibility
            visible_to_customer=True,
            visible_to_owner=True
        )

        db.add(new_order)
        await db.flush() 

        for obj in order_items_objects:
            obj.order_id = new_order.id
            db.add(obj)

        await db.commit()
        await db.refresh(new_order)
        return {"status": "success", "order_id": new_order.id}

    except Exception as e:
        print(f"❌ DB Save Failed: {e}. Refund Initiated...")
        await db.rollback()
        try:
            client.payment.refund(payment_data['razorpay_payment_id'], {
                "amount": int(total_amount * 100)
            })
            print("↩️ Refund Successful")
        except:
            print("CRITICAL: Manual Refund Required")

        raise HTTPException(status_code=500, detail="Order Failed. Refund Initiated.")

# -----------------------------------------------------------------------------
# 3. OWNER: UPDATE STATUS
# -----------------------------------------------------------------------------
@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
async def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Order)
        .filter(models.Order.id == order_id)
        .options(
            selectinload(models.Order.restaurant),
            selectinload(models.Order.customer)
        ) 
    )
    order = result.scalars().first()

    if not order: 
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.restaurant or order.restaurant.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        new_status = models.OrderStatus(status_update.status)
        order.status = new_status
        await db.commit()
        await db.refresh(order)

        # Broadcast
        await manager.broadcast({"status": str(order.status.value)})

        # SMS Notification
        customer_phone = order.customer.phone_number 
        restaurant_name = order.restaurant.name

        if customer_phone:
            msg = ""
            if new_status == models.OrderStatus.PREPARING:
                msg = f"✅ Order Accepted! {restaurant_name} is preparing your food. 🍳"
            elif new_status == models.OrderStatus.OUT_FOR_DELIVERY:
                msg = f"🚀 Food on the way! Your driver has left {restaurant_name}. Track live on the app!"
            elif new_status == models.OrderStatus.DELIVERED:
                msg = f"😋 Delivered! Enjoy your meal from {restaurant_name}."

            if msg:
                send_sms(customer_phone, msg)

        return order
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

# -----------------------------------------------------------------------------
# 4. OWNER: GET ALL ORDERS (👁️ FILTERED)
# -----------------------------------------------------------------------------
@router.get("/owner/orders", response_model=List[schemas.OrderOut])
async def get_owner_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    if current_user.role != "OWNER":
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(models.Restaurant).where(models.Restaurant.owner_id == current_user.id)
    )
    restaurant = result.scalars().first()

    if not restaurant:
        return []

    result = await db.execute(
        select(models.Order)
        .where(models.Order.restaurant_id == restaurant.id)
        .where(models.Order.visible_to_owner == True) # 👈 ONLY SHOW IF NOT DELETED BY OWNER
        .order_by(models.Order.created_at.desc())
        .options(selectinload(models.Order.restaurant)) 
    )
    
    return result.scalars().all()

# -----------------------------------------------------------------------------
# 5. AI RECOMMENDATIONS
# -----------------------------------------------------------------------------
@router.get("/recommend", response_model=List[schemas.MenuItemOut])
async def get_recommendations(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    result = await db.execute(select(models.OrderItem).join(models.Order).filter(models.Order.customer_id == current_user.id))
    past_orders = result.scalars().all()

    if not past_orders:
        popular = await db.execute(select(models.MenuItem).limit(3))
        return popular.scalars().all()

    all_menu_res = await db.execute(select(models.MenuItem))
    all_menu = all_menu_res.scalars().all()

    data = []
    for item in all_menu:
        content = f"{item.name} {item.description}" 
        data.append({"id": item.id, "content": content, "obj": item})
    
    if not data: return [] 

    df = pd.DataFrame(data)
    tfidf = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = tfidf.fit_transform(df['content'])
    except ValueError:
        return all_menu[:3] 

    liked_indices = []
    eaten_ids = set()
    for past_item in past_orders:
        if past_item.menu_item_id: 
            eaten_ids.add(past_item.menu_item_id)
            idx = df.index[df['id'] == past_item.menu_item_id].tolist()
            if idx: liked_indices.append(idx[0])

    if not liked_indices: return all_menu[:3]

    cosine_sim = linear_kernel(tfidf_matrix[liked_indices], tfidf_matrix)
    sim_scores = cosine_sim.sum(axis=0)
    sorted_indices = sim_scores.argsort()[::-1]

    recommendations = []
    count = 0
    for idx in sorted_indices:
        item_id = df.iloc[idx]['id']
        if item_id not in eaten_ids:
            recommendations.append(df.iloc[idx]['obj'])
            count += 1
        if count >= 3: break
            
    return recommendations

# -----------------------------------------------------------------------------
# 6. CUSTOMER: GET LATEST ORDER
# -----------------------------------------------------------------------------
@router.get("/my-latest", response_model=schemas.OrderOut)
async def get_my_latest_order(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Order)
        .filter(models.Order.customer_id == current_user.id)
        .order_by(models.Order.created_at.desc())
        .options(selectinload(models.Order.restaurant))
        .limit(1)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(status_code=404, detail="No orders found")
    
    return order

# -----------------------------------------------------------------------------
# 7. CUSTOMER: GET ALL PAST ORDERS (👁️ FILTERED)
# -----------------------------------------------------------------------------
@router.get("/my-orders", response_model=List[schemas.OrderOut])
async def get_my_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Order)
        .filter(models.Order.customer_id == current_user.id)
        .filter(models.Order.visible_to_customer == True) # 👈 ONLY SHOW IF NOT DELETED BY CUSTOMER
        .order_by(models.Order.created_at.desc())
        .options(selectinload(models.Order.restaurant))
    )
    return result.scalars().all()


# -----------------------------------------------------------------------------
# 8. GENERATE OTP
# -----------------------------------------------------------------------------
@router.post("/{order_id}/generate-otp")
async def generate_delivery_otp(
    order_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    result = await db.execute(
        select(models.Order)
        .filter(models.Order.id == order_id)
        .options(selectinload(models.Order.customer)) 
    )
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    otp_code = str(random.randint(1000, 9999))
    order.delivery_otp = otp_code
    await db.commit()

    customer_phone = order.customer.phone_number
    
    if customer_phone:
        print(f"📤 Sending Real SMS to {customer_phone}...")
        send_sms(customer_phone, f"Your Food Delivery OTP is: {otp_code}")
    else:
        print("⚠️ Error: Customer has no phone number in DB")

    return {"message": "OTP sent to your registered mobile number."}

# -----------------------------------------------------------------------------
# 9. VERIFY OTP
# -----------------------------------------------------------------------------
@router.post("/{order_id}/complete-delivery")
async def complete_delivery_with_otp(
    order_id: int,
    otp_payload: dict,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    result = await db.execute(select(models.Order).filter(models.Order.id == order_id))
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    input_otp = otp_payload.get("otp")

    if order.delivery_otp != input_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    order.status = models.OrderStatus.DELIVERED
    await db.commit()
    await db.refresh(order)

    await manager.broadcast({"status": "DELIVERED"})

    return {"status": "success", "message": "Order Delivered Successfully!"}


# -----------------------------------------------------------------------------
# 10. DRIVER: SHARE LOCATION 🚀 (SECURED)
# -----------------------------------------------------------------------------
@router.post("/{order_id}/driver-location")
async def update_driver_location(
    order_id: int,
    update: DriverUpdate,
    db: AsyncSession = Depends(database.get_db),
    # 👇 ADDED SECURITY: Must be logged in
    current_user: models.User = Depends(auth.get_current_user) 
):
    # 👇 ADDED SECURITY: Check Role
    if current_user.role != "DRIVER" and current_user.role != "OWNER":
        raise HTTPException(status_code=403, detail="Not authorized to share location")

    # 1. BROADCAST TO WEB PAGE (Live Map & Text)
    tracking_data = {
        "event": "DRIVER_UPDATE",
        "order_id": order_id,
        "lat": update.latitude,
        "lng": update.longitude,
        "distance": update.distance_text,
        "time": update.time_text,
        "message": update.message
    }
    await manager.broadcast(tracking_data)

    # 2. SEND SMS (Only if there is a written message)
    if update.message:
        result = await db.execute(
            select(models.Order)
            .filter(models.Order.id == order_id)
            .options(selectinload(models.Order.customer))
        )
        order = result.scalars().first()
        
        if order and order.customer.phone_number:
            print(f"📩 Sending SMS: {update.message}")
            send_sms(order.customer.phone_number, f"Driver Update: {update.message}")

    return {"status": "Location shared"}


# -----------------------------------------------------------------------------
# 11. DELETE ORDER (CUSTOMER) - 👻 SOFT DELETE
# -----------------------------------------------------------------------------
@router.delete("/{order_id}/customer")
async def delete_order_customer(
    order_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    result = await db.execute(select(models.Order).filter(models.Order.id == order_id))
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if order.status not in [models.OrderStatus.DELIVERED, models.OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Cannot delete active orders.")

    # 👇 JUST HIDE IT
    order.visible_to_customer = False
    
    await db.commit()
    return {"status": "success", "message": "Order removed from history"}

# -----------------------------------------------------------------------------
# 12. DELETE ORDER (OWNER) - 👻 SOFT DELETE
# -----------------------------------------------------------------------------
@router.delete("/{order_id}/owner")
async def delete_order_owner(
    order_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    result = await db.execute(
        select(models.Order)
        .filter(models.Order.id == order_id)
        .options(selectinload(models.Order.restaurant))
    )
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.restaurant or order.restaurant.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 👇 JUST HIDE IT
    order.visible_to_owner = False
    
    await db.commit()
    return {"status": "success", "message": "Order removed from dashboard"}