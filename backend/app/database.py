from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "postgresql://postgres:1234@localhost:5432/dicebank"



class Base(DeclarativeBase):
    pass



engine = create_engine(
    DATABASE_URL,
    echo=True,  
)
# test


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def create_db_and_tables():
    Base.metadata.create_all(bind=engine)
