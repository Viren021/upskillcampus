from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import shutil
import os
import uuid

# Internal Imports
from .. import models, schemas, database, auth

router = APIRouter(
    prefix="/menu",
    tags=["Menu"]
)

# -----------------------------------------------------------------------------
# 1. ADD MENU ITEM (Owner Only + Image Upload 📸)
# -----------------------------------------------------------------------------
@router.post("/add") # Frontend calls: /menu/add
async def add_menu_item(
    name: str = Form(...),
    price: float = Form(...),
    description: str = Form(...),
    category: str = Form("Fast Food"), # Default value
    image: UploadFile = File(...),     # 👈 Handles the Image File
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # 1. Check Permissions
    # Checking against string "OWNER" to match your Signup/Login logic
    if current_user.role != "OWNER" and getattr(current_user.role, "value", None) != "OWNER":
         raise HTTPException(status_code=403, detail="Not authorized. Only Owners can add items.")
    
    # 2. Check if Owner has a Restaurant
    result = await db.execute(select(models.Restaurant).filter(models.Restaurant.owner_id == current_user.id))
    restaurant = result.scalars().first()

    if not restaurant:
        raise HTTPException(status_code=404, detail="You must create a restaurant first")

    # 3. SAVE IMAGE TO DISK 💾
    # Create unique filename to avoid overwriting (e.g., "burger_uuid123.jpg")
    file_extension = image.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_location = f"app/uploads/{unique_filename}"
    
    # Ensure directory exists
    if not os.path.exists("app/uploads"):
        os.makedirs("app/uploads")

    # Write file
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # 4. Generate Public URL
    # This URL is what you save in the database
    image_url = f"http://127.0.0.1:8000/static/{unique_filename}"

    # 5. Save to Database
    new_item = models.MenuItem(
        restaurant_id=restaurant.id,
        name=name,
        description=description,
        price=price,
        category=category,
        image_url=image_url, # 👈 Saving the link
        is_available=True
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    
    return {"status": "success", "item": new_item}


# -----------------------------------------------------------------------------
# 2. GET MENU (Public)
# -----------------------------------------------------------------------------
@router.get("/{restaurant_id}", response_model=List[schemas.MenuItemOut])
async def get_menu(restaurant_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.MenuItem).filter(models.MenuItem.restaurant_id == restaurant_id))
    items = result.scalars().all()
    return items