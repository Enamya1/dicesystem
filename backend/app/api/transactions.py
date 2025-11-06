from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction, TxType
from app.schemas.transaction import SendRequest, TxItem

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

def _find_counterparty(db: Session, to_username: str | None, to_email: str | None) -> User | None:
    q = db.query(User)
    if to_username:
        return q.filter(User.username == to_username).first()
    if to_email:
        return q.filter(User.email == to_email).first()
    return None

@router.post("/send", status_code=status.HTTP_201_CREATED)
def send_money(payload: SendRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # locate receiver
    receiver = _find_counterparty(db, payload.to_username, payload.to_email)
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")

    # load accounts
    sender_acct = db.query(Account).filter(Account.user_id == current_user.id).with_for_update().first()
    recv_acct = db.query(Account).filter(Account.user_id == receiver.id).with_for_update().first()

    if not sender_acct or not recv_acct:
        raise HTTPException(status_code=404, detail="Account missing")

    if not sender_acct.card_active:
        raise HTTPException(status_code=403, detail="Your card is not active")
    if Decimal(sender_acct.balance or 0) < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # balance move
    sender_acct.balance = (Decimal(sender_acct.balance or 0) - payload.amount).quantize(Decimal("0.01"))
    recv_acct.balance = (Decimal(recv_acct.balance or 0) + payload.amount).quantize(Decimal("0.01"))
    db.add_all([sender_acct, recv_acct])

    # two rows: sender (sent) and receiver (received)
    t1 = Transaction(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        amount=payload.amount,
        note=payload.note,
        tx_type=TxType.sent
    )
    t2 = Transaction(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        amount=payload.amount,
        note=payload.note,
        tx_type=TxType.received
    )
    db.add_all([t1, t2])
    db.commit()

    return {"message": "Transfer completed"}

@router.get("", response_model=list[TxItem])
def list_transactions(
    direction: str | None = Query(None, description="sent | received (optional)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(
        or_(Transaction.sender_id == current_user.id, Transaction.receiver_id == current_user.id)
    ).order_by(Transaction.created_at.desc())

    if direction in ("sent", "received"):
        q = q.filter(Transaction.tx_type == direction)

    rows = q.offset(offset).limit(limit).all()

    out: list[TxItem] = []
    for r in rows:
        # pick counterparty relative to current user & tx_type
        if r.tx_type == TxType.sent:
            counter = db.query(User).filter(User.id == r.receiver_id).first()
        else:
            counter = db.query(User).filter(User.id == r.sender_id).first()

        out.append(TxItem(
            id=r.id,
            tx_type=r.tx_type.value,
            amount=r.amount,
            note=r.note,
            counterparty_username=counter.username if counter else None,
            counterparty_email=counter.email if counter else None,
        ))
    return out
