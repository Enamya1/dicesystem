from sqlalchemy import Column, Integer, Numeric, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    balance = Column(Numeric(12, 2), default=0)
    card_number = Column(String, unique=True, index=True)
    card_active = Column(Boolean, default=False)

    user = relationship("User", back_populates="account")
