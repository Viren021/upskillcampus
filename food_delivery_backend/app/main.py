from fastapi import FastAPI, Depends, HTTPException, WebSocket, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.middleware.cors import CORSMiddleware


from app.socket_manager import manager

# 1. Imports with Alias to prevent conflicts

from . import models, schemas, database, auth as auth_utils
from .routers import auth as auth_router, orders, restaurants, users, menu, analytics

app = FastAPI(title="Food Delivery API")

# 2. CORS (Allow Frontend Access)
origins = [
    "http://localhost:5173",    # React Dev Server
    "http://127.0.0.1:5173",    # Alternative Localhost
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Specific origins are safer/better for cookies
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Connect the Routers
app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(restaurants.router)
app.include_router(menu.router)
app.include_router(orders.router)
# app.include_router(tracking.router)
app.include_router(analytics.router)

# Setup for Login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@app.on_event("startup")
async def startup():
    # This creates the tables in the database automatically
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Food Delivery Backend 🍕"}

# --- AUTH ROUTES (Signup/Login) ---

@app.post("/signup", response_model=schemas.UserOut)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.User).filter(models.User.email == user.email))
    db_user = result.scalars().first()
    
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth_utils.get_password_hash(user.password)
    
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pwd,
        phone_number=user.phone_number,
        role=user.role
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.User).filter(models.User.email == form_data.username))
    user = result.scalars().first()

    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Add 'role' to the token payload so we can check it on the frontend easily
    access_token = auth_utils.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}


# --- 4. WEBSOCKET ENDPOINT (The Shared Listener) ---
@app.websocket("/ws/tracking")
async def websocket_endpoint(websocket: WebSocket):
    print(f"👂 DEBUG: Main.py Manager ID: {id(manager)}")
    #  Connects the user to the shared manager
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)