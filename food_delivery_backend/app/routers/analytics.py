from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .. import database, models, auth
import pandas as pd

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/peak-hours")
async def get_peak_hours(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role != models.UserRole.OWNER:
        # Returning a dictionary is okay, but raising HTTP 403 is better for frontend handling
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Get the restaurant owned by this user
    res_query = await db.execute(select(models.Restaurant).filter(models.Restaurant.owner_id == current_user.id))
    restaurant = res_query.scalars().first()
    
    if not restaurant:
         return {"message": "No restaurant found", "total_revenue": 0, "peak_hours": {}}

    # 2. Get all orders for this restaurant
    orders_query = await db.execute(select(models.Order).filter(models.Order.restaurant_id == restaurant.id))
    orders = orders_query.scalars().all()

    if not orders:
        return {"restaurant": restaurant.name, "total_revenue": 0, "peak_hours": {}}

    # 3. Load into Pandas
    data = [{"created_at": o.created_at, "total": o.total_amount} for o in orders]
    df = pd.DataFrame(data)

    # 4. Analyze Time
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['hour'] = df['created_at'].dt.hour

    # Group by Hour and count orders
    raw_peak_times = df.groupby('hour').size().to_dict()

    #  JSON Serialization Fix (Numpy types to Python Native types)
    peak_times = {int(k): int(v) for k, v in raw_peak_times.items()}
    total_revenue = float(df['total'].sum())

    return {
        "restaurant": restaurant.name,
        "total_revenue": total_revenue, 
        "peak_hours": peak_times        
    }