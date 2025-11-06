import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Numeric, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database import Base


class TxType(enum.Enum):
    sent = "sent"
    received = "received"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True)

    amount = Column(Numeric(12, 2), nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tx_type = Column(Enum(TxType), nullable=False)

    
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
