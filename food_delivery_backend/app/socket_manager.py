from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("🔌 Client Connected via WebSocket")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("❌ Client Disconnected")

    async def broadcast(self, message: dict):
        print(f"📣 Broadcasting: {message}")
        # Iterate over a copy to avoid modification errors during loop
        for connection in self.active_connections[:]:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Error broadcasting: {e}")
                self.disconnect(connection)

manager = ConnectionManager()