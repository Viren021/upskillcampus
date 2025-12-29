from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from .. import models, schemas, database, auth

# THIS IS THE VARIABLE 'router' THAT main.py IS LOOKING FOR
router = APIRouter(
    prefix="/menu",
    tags=["Menu"]
)

# 1. Add a Menu Item (Owner Only)
@router.post("/", response_model=schemas.MenuItemOut)
async def add_menu_item(
    item: schemas.MenuItemCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    if current_user.role != models.UserRole.restaurant_owner:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if owner has a restaurant
    result = await db.execute(select(models.Restaurant).filter(models.Restaurant.owner_id == current_user.id))
    restaurant = result.scalars().first()

    if not restaurant:
        raise HTTPException(status_code=404, detail="You must create a restaurant first")

    new_item = models.MenuItem(
        restaurant_id=restaurant.id,
        name=item.name,
        description=item.description,
        price=item.price,
        is_available=True
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

# 2. Get Menu for a specific Restaurant (Public)
@router.get("/{restaurant_id}", response_model=List[schemas.MenuItemOut])
async def get_menu(restaurant_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.MenuItem).filter(models.MenuItem.restaurant_id == restaurant_id))
    items = result.scalars().all()
    return items