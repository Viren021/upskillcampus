from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

# --- FASTAPI & DB IMPORTS ---
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import database, models

# 1. LOAD ENVIRONMENT VARIABLES
load_dotenv()

#  SECRET CONFIGURATION
# IMPORTANT: This key MUST match the one used to create the token in main.py
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 2. PASSWORD HASHING SETUP
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 3. AUTHENTICATION DEPENDENCY
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 🕵️‍♂️ DEBUG LOG: Check if the server is even receiving the request
    print(f"\n🕵️‍♂️ AUTH DEBUG: Received Token (First 10 chars): {token[:10]}...")

    try:
        # A. Decode the Token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        #  DEBUG LOG: Check what is inside the token
        print(f"✅ AUTH DEBUG: Decoded Payload: {payload}")

        # B. Extract Data (Support BOTH 'user_id' and 'sub'/email)
        user_id = payload.get("user_id")
        email = payload.get("sub")

        if user_id is None and email is None:
            print("❌ AUTH DEBUG: Token is empty (No user_id or sub)")
            raise credentials_exception
            
    except JWTError as e:
        print(f"❌ AUTH DEBUG: JWT Decoding Error: {e}")
        print(f"   (Hint: Check if SECRET_KEY matches in main.py and auth.py)")
        raise credentials_exception
    
    # C. Find User in Database
    if user_id:
        # Priority: Look up by ID (Faster & matches your current token)
        print(f"🔎 AUTH DEBUG: Looking for User ID: {user_id}")
        result = await db.execute(select(models.User).filter(models.User.id == int(user_id)))
    else:
        # Fallback: Look up by Email
        print(f"🔎 AUTH DEBUG: Looking for Email: {email}")
        result = await db.execute(select(models.User).filter(models.User.email == email))

    user = result.scalars().first()
    
    if user is None:
        print("❌ AUTH DEBUG: User found in token but NOT in Database (Deleted user?)")
        raise credentials_exception
        
    print(f" AUTH DEBUG: Access Granted for {user.email} (Role: {user.role})")
    return user