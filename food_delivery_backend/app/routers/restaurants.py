from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
from .. import models, schemas, database, auth

router = APIRouter(
    prefix="/restaurants",
    tags=["Restaurants"]
)

# 1. Create a Restaurant (Only for Restaurant Owners)
# LOCKED: Only logged-in owners can do this
@router.post("/", response_model=schemas.RestaurantOut)
async def create_restaurant(
    restaurant: schemas.RestaurantCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Check if user is a restaurant owner
    if current_user.role != "OWNER" and current_user.role != "restaurant_owner":
        raise HTTPException(status_code=403, detail="Only restaurant owners can create restaurants")

    # Check if owner already has a restaurant
    existing_restaurant = await db.execute(select(models.Restaurant).filter(models.Restaurant.owner_id == current_user.id))
    if existing_restaurant.scalars().first():
        raise HTTPException(status_code=400, detail="You already have a restaurant listed")

    # Convert Lat/Long to WKT (Well Known Text) format for PostGIS
    # Format: POINT(longitude latitude) -> Note the order!
    location_point = f"POINT({restaurant.longitude} {restaurant.latitude})"

    new_restaurant = models.Restaurant(
        name=restaurant.name,
        owner_id=current_user.id,
        address=restaurant.address,
        location=location_point,
        image_url=restaurant.image_url or "https://placehold.co/600x400?text=No+Image"
    )

    db.add(new_restaurant)
    await db.commit()
    await db.refresh(new_restaurant)
    return new_restaurant


# 2. Get Nearby Restaurants (Geospatial Query)
# PUBLIC: Anyone can search nearby
@router.get("/nearby", response_model=List[schemas.RestaurantOut])
async def get_nearby_restaurants(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0, # Default search radius 5km
    db: AsyncSession = Depends(database.get_db)
):
    # PostGIS query: ST_DWithin checks if location is within distance
    # We cast to Geography to use meters/kilometers
    user_location = func.ST_GeographyFromText(f"POINT({longitude} {latitude})")
    
    query = select(models.Restaurant).filter(
        func.ST_DWithin(
            models.Restaurant.location, 
            user_location, 
            radius_km * 1000 
        )
    )
    
    result = await db.execute(query)
    return result.scalars().all()


# 3. Get All Restaurants (For the Home Page)
# PUBLIC: No login required! (Fixed the 401 Error)
@router.get("/", response_model=List[schemas.RestaurantOut])
async def get_restaurants(
    db: AsyncSession = Depends(database.get_db)
    # ❌ Removed "current_user" dependency here to allow public access
):
    # Fetch all restaurants from the database
    result = await db.execute(select(models.Restaurant))
    return result.scalars().all()