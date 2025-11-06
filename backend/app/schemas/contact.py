from pydantic import BaseModel
from datetime import datetime

class ContactBase(BaseModel):
    contact_id: int
    alias: str | None = None

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
