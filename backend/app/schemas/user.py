from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import RoleEnum


class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    phone_number: str


class UserRegister(UserBase):
    password: str
    country: Optional[str] = None
    city: Optional[str] = None
    role: RoleEnum = RoleEnum.user


class UserResponse(UserBase):
    id: int
    role: RoleEnum
    is_active: bool

    class Config:
        from_attributes = True


class LoginSchema(BaseModel):
    username: str
    password: str


class UserSearchResult(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: RoleEnum
