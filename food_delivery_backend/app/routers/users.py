from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .. import models, schemas, utils, database
from typing import Dict
import random


router = APIRouter(prefix="/users", tags=["Users"])

otp_storage: Dict[str, str] = {}

# --- 1. SEND OTP (Simplified) ---
@router.post("/send-otp")
async def send_otp(phone_number: str):
    #  AUTO-FIX: Add +91 locally for matching storage key
    clean_phone = phone_number.strip()
    if not clean_phone.startswith("+"):
        clean_phone = "+91" + clean_phone

    # 1. Generate 6-digit Code
    otp = str(random.randint(100000, 999999))
    
    # 2. Store in Memory
    otp_storage[clean_phone] = otp
    
    # 3.  USE THE SHARED UTILITY TO SEND SMS
    message = f"Your FoodApp Verification Code is: {otp}"
    success = utils.send_sms(clean_phone, message)
    
    if success:
        return {"message": "OTP sent via SMS!"}
    else:
        # Fallback message (The console log happened inside utils.py)
        return {"message": "OTP sent (Check Backend Terminal for Fallback)"}


# --- 2. VERIFY OTP & CREATE USER (Stays the same) ---
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.UserOut)
async def create_user(user: schemas.UserCreate, otp: str, db: AsyncSession = Depends(database.get_db)):
    
    clean_phone = user.phone_number.strip()
    if not clean_phone.startswith("+"):
        clean_phone = "+91" + clean_phone
        
    # A. Verify Phone OTP
    if clean_phone not in otp_storage:
        raise HTTPException(status_code=400, detail="Please request OTP first")
    
    if otp_storage[clean_phone] != otp:
        raise HTTPException(status_code=400, detail="Invalid or Expired OTP")

    # B. Check Email
    result = await db.execute(select(models.User).filter(models.User.email == user.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # C. Create User
    hashed_pwd = utils.hash(user.password) # ✅ Uses the hash function from the same utils.py
    role_value = user.role.upper() if user.role else "CUSTOMER"

    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pwd, 
        phone_number=clean_phone,
        role=role_value
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Clear OTP after success
    del otp_storage[clean_phone]
    
    return new_user