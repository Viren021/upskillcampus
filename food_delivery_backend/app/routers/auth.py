from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
# 1. CHANGE THIS IMPORT: Remove 'oauth2', add 'auth'
from .. import database, schemas, models, utils, auth 

router = APIRouter(tags=['Authentication'])

@router.post('/login', response_model=schemas.Token)
async def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(database.get_db)):
    
    # 1. Async Database Query to find the user by Email
    result = await db.execute(select(models.User).filter(models.User.email == user_credentials.username))
    user = result.scalars().first()

    # 2. Check if user exists
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Credentials")

    # 3. Check password
    if not utils.verify(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Credentials")

    # 4. Generate Token (Includes Role)
    # This ensures the token is signed with the SAME key that orders.py uses to verify it!
    access_token = auth.create_access_token(data={"user_id": str(user.id), "role": user.role})

    return {"access_token": access_token, "token_type": "bearer", "role": user.role}