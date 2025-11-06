from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.account import Account
from app.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

def _mask_card(card: str | None) -> str | None:
    if not card or len(card) < 8:
        return card
    return f"{card[:4]} **** **** {card[-4:]}"

@router.get("/me")
def my_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acct = db.query(Account).filter(Account.user_id == current_user.id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    return {
        "user_id": acct.user_id,
        "balance": str(acct.balance or Decimal("0.00")),
        "card_number": _mask_card(acct.card_number),
        "card_active": acct.card_active,
    }

@router.patch("/activate")
def activate_my_card(
    active: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    acct = db.query(Account).filter(Account.user_id == current_user.id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    acct.card_active = active
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return {"card_active": acct.card_active}


@router.patch("/{user_id}/activate")
def admin_activate_card(
    user_id: int,
    active: bool,
    _: User = Depends(require_roles([RoleEnum.admin, RoleEnum.account_manager])),
    db: Session = Depends(get_db)
):
    acct = db.query(Account).filter(Account.user_id == user_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    acct.card_active = active
    db.add(acct)
    db.commit()
    return {"user_id": user_id, "card_active": acct.card_active}
