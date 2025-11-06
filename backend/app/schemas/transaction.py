from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TransactionCreate(BaseModel):
    receiver_id: int
    amount: float = Field(..., gt=0)
    description: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    amount: float
    description: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
