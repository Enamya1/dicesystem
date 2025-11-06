import random
from sqlalchemy.orm import Session
from app.models.account import Account


def generate_unique_card_number(db: Session) -> str:
    
    while True:
        number = ''.join(str(random.randint(0, 9)) for _ in range(16))
        exists = db.query(Account).filter(Account.card_number == number).first()
        if not exists:
            return number
