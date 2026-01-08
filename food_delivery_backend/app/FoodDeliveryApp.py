from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Internal Imports
from . import models, database
from app.socket_manager import manager

# Import Routers
from .routers import auth, orders, restaurants, users, menu, analytics

app = FastAPI(title="Food Delivery API")

# ---------------------------------------------------------
# 1. 📸 STATIC FILES SETUP (For Image Uploads)
# ---------------------------------------------------------
if not os.path.exists("app/uploads"):
    os.makedirs("app/uploads")

# Access images via: http://127.0.0.1:8000/static/filename.jpg
app.mount("/static", StaticFiles(directory="app/uploads"), name="static")


# ---------------------------------------------------------
# 2. CORS (Allow Frontend Access)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)


# ---------------------------------------------------------
# 3. 🛣️ CONNECT ROUTERS
# ---------------------------------------------------------


app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

app.include_router(users.router)
app.include_router(restaurants.router)
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(analytics.router)


# ---------------------------------------------------------
# 4. DATABASE STARTUP
# ---------------------------------------------------------
@app.on_event("startup")
async def startup():
    # Creates tables if they don't exist
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


# ---------------------------------------------------------
# 5. ROOT ENDPOINT
# ---------------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "✅ Server is running. Docs at /docs"}


# ---------------------------------------------------------
# 6. ⚡ WEBSOCKET ENDPOINT (Live Tracking)
# ---------------------------------------------------------
@app.websocket("/ws/tracking")
async def websocket_endpoint(websocket: WebSocket):
    # Connects the user to the shared manager
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open to listen for messages
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)