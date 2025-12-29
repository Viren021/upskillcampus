from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- USER SCHEMAS ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone_number: str
    #  Update: Default to Uppercase "CUSTOMER" to match DB Enum
    role: str = "CUSTOMER" 

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    phone_number: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- AUTH SCHEMAS ---

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str 

class TokenData(BaseModel):
    id: Optional[str] = None


# --- RESTAURANT SCHEMAS ---

class RestaurantCreate(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float

class RestaurantOut(BaseModel):
    id: int
    name: str
    address: str
    is_open: bool
    image_url: Optional[str] = None
    latitude: float 
    longitude: float
    
    class Config:
        from_attributes = True


# --- MENU SCHEMAS ---

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: int

class MenuItemOut(BaseModel):
    id: int
    name: str
    description: str
    price: int
    is_available: bool
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


# --- ORDER SCHEMAS ---

class OrderItemSchema(BaseModel):
    menu_item_id: int
    quantity: int

class OrderCreate(BaseModel):
    restaurant_id: int
    items: List[OrderItemSchema]
    delivery_latitude: float
    delivery_longitude: float
    delivery_address: str

class OrderOut(BaseModel):
    id: int
    status: str
    total_amount: int
    created_at: datetime # The Order model DOES have created_at, so we keep this here
    restaurant: Optional[RestaurantOut] = None
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str