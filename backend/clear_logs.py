from app.database import SessionLocal  # Adjust based on where your session maker lives
from app.models import TrainingRun     # Adjust based on your model file name

def wipe_history():
    db = SessionLocal()
    try:
        deleted_count = db.query(TrainingRun).delete()
        db.commit()
        print(f"Success: Wiped {deleted_count} experiment logs clean!")
    except Exception as e:
        db.rollback()
        print(f"Error clearing logs: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    wipe_history()