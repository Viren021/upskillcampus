from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from .. import database, models, auth
import pandas as pd

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# ✅ 1. NEW ENDPOINT: Dashboard Stats (Cards)
@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != models.UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # A. Get Restaurant
    result = await db.execute(select(models.Restaurant).filter(models.Restaurant.owner_id == current_user.id))
    restaurant = result.scalars().first()
    
    if not restaurant:
        return {"total_orders": 0, "total_revenue": 0, "top_selling_item": "No Restaurant"}

    # B. Calculate Total Orders
    orders_query = await db.execute(select(func.count(models.Order.id)).filter(models.Order.restaurant_id == restaurant.id))
    total_orders = orders_query.scalar() or 0

    # C. Calculate Total Revenue
    revenue_query = await db.execute(
        select(func.sum(models.Order.total_amount))
        .filter(models.Order.restaurant_id == restaurant.id)
        .filter(models.Order.status == "DELIVERED") # Only count delivered money
    )
    total_revenue = revenue_query.scalar() or 0

    # D. Calculate Top Selling Item 🏆
    # We join OrderItems -> Orders -> Restaurant to count which item appears most
    top_item_query = await db.execute(
        select(models.MenuItem.name, func.count(models.OrderItem.id).label("count"))
        .join(models.OrderItem, models.OrderItem.menu_item_id == models.MenuItem.id)
        .join(models.Order, models.OrderItem.order_id == models.Order.id)
        .filter(models.Order.restaurant_id == restaurant.id)
        .group_by(models.MenuItem.name)
        .order_by(desc("count"))
        .limit(1)
    )
    
    top_row = top_item_query.first()
    top_selling_item = top_row[0] if top_row else "No Sales Yet"

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "top_selling_item": top_selling_item
    }


# ✅ 2. EXISTING ENDPOINT: Peak Hours (Chart)
@router.get("/peak-hours")
async def get_peak_hours(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != models.UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Unauthorized")

    res_query = await db.execute(select(models.Restaurant).filter(models.Restaurant.owner_id == current_user.id))
    restaurant = res_query.scalars().first()
    
    if not restaurant:
         return {"message": "No restaurant found", "total_revenue": 0, "peak_hours": {}}

    # Get all orders
    orders_query = await db.execute(select(models.Order).filter(models.Order.restaurant_id == restaurant.id))
    orders = orders_query.scalars().all()

    if not orders:
        return {"restaurant": restaurant.name, "total_revenue": 0, "peak_hours": {}}

    # Pandas Analysis
    data = [{"created_at": o.created_at, "total": o.total_amount} for o in orders]
    df = pd.DataFrame(data)

    df['created_at'] = pd.to_datetime(df['created_at'])
    df['hour'] = df['created_at'].dt.hour

    raw_peak_times = df.groupby('hour').size().to_dict()
    peak_times = {int(k): int(v) for k, v in raw_peak_times.items()}
    total_revenue = float(df['total'].sum())

    return {
        "restaurant": restaurant.name,
        "total_revenue": total_revenue, 
        "peak_hours": peak_times        
    }