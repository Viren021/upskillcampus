from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..websockets import manager

router = APIRouter(
    tags=["Tracking"]
)

# This is the WebSocket Endpoint
# URL: ws://127.0.0.1:8000/ws/tracking
@router.websocket("/ws/tracking")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Wait for data from the client (Driver)
            data = await websocket.receive_text()
            
            # Send that data to everyone else (Customers)
            await manager.broadcast(f"Live Update: {data}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast("A user left the chat")