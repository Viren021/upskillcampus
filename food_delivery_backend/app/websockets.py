from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # Holds active connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    # 👇 UPDATED: Use 'send_json' instead of 'send_text'
    async def broadcast(self, message: dict):
        # Loop through a copy of the list to avoid errors if connections drop mid-loop
        for connection in self.active_connections[:]: 
            try:
                await connection.send_json(message) # 👈 Automatically handles JSON format
            except Exception:
                # If sending fails (user disconnected), remove them
                self.disconnect(connection)

# Global Instance
manager = ConnectionManager()