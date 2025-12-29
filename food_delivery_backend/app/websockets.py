from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # This list holds all the active "phone calls"
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept() # Answer the phone
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket) # Hang up

    # This function shouts a message to everyone listening
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

# Create a global instance of the manager
manager = ConnectionManager()