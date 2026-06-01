import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Get the directory where database.py is located (backend/app/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DB_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))


os.makedirs(TARGET_DB_DIR, exist_ok=True)

DATABASE_URL = f"sqlite:///{os.path.join(TARGET_DB_DIR, 'data.db')}"

# Create the SQLAlchemy engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class
Base = declarative_base()

# Dependency to get the database session for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # SEMANTIC FIX: Safe fallback rollback if an unhandled exception 
        # breaks an ongoing transactional context mid-route.
        db.rollback()
        raise
    finally:
        db.close()