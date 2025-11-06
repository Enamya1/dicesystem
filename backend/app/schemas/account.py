from pydantic import BaseModel
from typing import Optional


class AccountResponse(BaseModel):
    id: int
    balance: float
    card_number: Optional[str] = None
    card_active: bool

    class Config:
        from_attributes = True
