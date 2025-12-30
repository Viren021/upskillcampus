from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from .database import Base
import enum
from datetime import datetime
from geoalchemy2.shape import to_shape

class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    OWNER = "OWNER"      
    DRIVER = "DRIVER"

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Matches 'hashed_password' in users.py
    hashed_password = Column(String, nullable=False) 
    
    # Matches 'phone_number' in users.py
    phone_number = Column(String, nullable=True) 
    
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="owner", uselist=False)
    orders = relationship("Order", back_populates="customer")

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # PostGIS Geometry for Location
    location = Column(Geometry("POINT", srid=4326)) 
    address = Column(String)
    is_open = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)

    @property
    def latitude(self):
        return to_shape(self.location).y

    @property
    def longitude(self):
        return to_shape(self.location).x

    owner = relationship("User", back_populates="restaurant")
    menu_items = relationship("MenuItem", back_populates="restaurant")
    orders = relationship("Order", back_populates="restaurant")



class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Integer)
    is_available = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)

    restaurant = relationship("Restaurant", back_populates="menu_items")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)

    stripe_payment_id = Column(String, nullable=True)
    total_amount = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    delivery_address = Column(String, nullable=True)
    delivery_latitude = Column(Float, nullable=True)
    delivery_longitude = Column(Float, nullable=True)
    delivery_location = Column(Geometry('POINT', srid=4326), nullable=True)
    delivery_otp = Column(String, nullable=True)
    visible_to_customer = Column(Boolean, default=True)
    visible_to_owner = Column(Boolean, default=True)

    customer = relationship("User", back_populates="orders")
    restaurant = relationship("Restaurant", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"))
    quantity = Column(Integer)
    price_at_time_of_order = Column(Integer)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")