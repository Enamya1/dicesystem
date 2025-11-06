from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactResponse

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(payload: ContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # payload: contact_id, alias
    target = db.query(User).filter(User.id == payload.contact_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Contact user not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    exists = db.query(Contact).filter(
        Contact.owner_id == current_user.id,
        Contact.contact_id == target.id
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Contact already exists")

    c = Contact(owner_id=current_user.id, contact_id=target.id, alias=payload.alias)
    db.add(c)
    db.commit()
    db.refresh(c)

    return ContactResponse(
        id=c.id,
        contact_id=target.id,
        alias=c.alias,
        created_at=c.created_at,
    )

@router.get("", response_model=list[ContactResponse])
def list_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Contact).filter(Contact.owner_id == current_user.id).all()
    out: list[ContactResponse] = []
    for c in rows:
        out.append(ContactResponse(
            id=c.id,
            contact_id=c.contact_id,
            alias=c.alias,
            created_at=c.created_at,
        ))
    return out

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.owner_id == current_user.id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(c)
    db.commit()
    return None
