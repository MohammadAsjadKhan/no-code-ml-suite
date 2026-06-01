import os
import shutil
import json 
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
from fastapi.responses import StreamingResponse

from .database import engine, Base, get_db
from .models import MLClass, ClassImage, TrainingRun  
from . import schemas, ml_engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="No-Code ML Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "uploads")
PREDICT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "predict")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PREDICT_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

@app.post("/api/debug/wipe-logs")
def debug_wipe_logs(db: Session = Depends(get_db)):
    try:
        deleted_count = db.query(TrainingRun).delete()
        db.commit()
        return {"status": "success", "message": f"Wiped {deleted_count} logs successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
def seed_classes():
    db = next(get_db())
    try:
        count = db.query(MLClass).count()
        if count == 0:
            for i in range(10):
                new_class = MLClass(class_index=i, name=f"Class {i}", is_active=False)
                db.add(new_class)
            db.commit()
    finally:
        db.close()


@app.get("/api/classes", response_model=List[schemas.MLClassResponse])
def get_classes(db: Session = Depends(get_db)):
    return db.query(MLClass).order_by(MLClass.class_index).all()


@app.put("/api/classes/{class_index}", response_model=schemas.MLClassResponse)
def update_class_name(class_index: int, class_update: schemas.MLClassUpdate, db: Session = Depends(get_db)):
    if class_index < 0 or class_index > 9:
        raise HTTPException(status_code=400, detail="Class index must be between 0 and 9.")
    
    ml_class = db.query(MLClass).filter(MLClass.class_index == class_index).first()
    if not ml_class:
        raise HTTPException(status_code=404, detail="Class template structure missing.")
    
    ml_class.name = class_update.name
    db.commit()
    db.refresh(ml_class)
    return ml_class


# SEMANTIC FIX: Changed from async def to standard def to prevent blocking event loop I/O threads
@app.post("/api/classes/{class_index}/upload", response_model=schemas.MLClassResponse)
def upload_class_images(
    class_index: int, 
    files: List[UploadFile] = File(...), 
    dataset_type: str = "train", 
    db: Session = Depends(get_db)
):
    if class_index < 0 or class_index > 9:
        raise HTTPException(status_code=400, detail="Invalid target index layout assignment.")
    if dataset_type not in ["train", "test"]:
        raise HTTPException(status_code=400, detail="Dataset type must be 'train' or 'test'.")
        
    ml_class = db.query(MLClass).filter(MLClass.class_index == class_index).first()
    if not ml_class:
        raise HTTPException(status_code=404, detail="Target class slot reference not found.")

    class_folder = os.path.join(UPLOAD_DIR, f"class_{class_index}", dataset_type)
    os.makedirs(class_folder, exist_ok=True)
    
    for file in files:
        if not file.filename: continue
            
        file_path = os.path.join(class_folder, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        new_image = ClassImage(file_path=file_path, dataset_type=dataset_type, ml_class_id=ml_class.id)
        db.add(new_image)
    
    ml_class.is_active = True
    db.commit()
    db.refresh(ml_class)
    return ml_class


@app.post("/api/classes/{class_index}/reset", response_model=schemas.MLClassResponse)
def reset_class(class_index: int, db: Session = Depends(get_db)):
    ml_class = db.query(MLClass).filter(MLClass.class_index == class_index).first()
    if not ml_class:
        raise HTTPException(status_code=404, detail="Target class missing.")

    class_folder = os.path.join(UPLOAD_DIR, f"class_{class_index}")
    if os.path.exists(class_folder):
        shutil.rmtree(class_folder)

    ml_class.images = []
    ml_class.name = f"Class {class_index}"
    ml_class.is_active = False
    
    db.commit()
    db.refresh(ml_class)
    return ml_class


@app.get("/api/train/stream")
def train_pipeline_stream(
    depth: int = 3, 
    base_channels: int = 32, 
    use_batch_norm: bool = False, 
    dropout_p: float = 0.0,
    db: Session = Depends(get_db)
):
    active_classes = db.query(MLClass).filter(MLClass.is_active == True).all()
    if len(active_classes) < 2:
        raise HTTPException(status_code=400, detail="You must populate at least 2 separate active classes.")

    train_data = []
    test_data = []
    active_indices = sorted([c.class_index for c in active_classes])

    for c in active_classes:
        for img in c.images:
            payload = (img.file_path, c.class_index)
            if img.dataset_type == "test":
                test_data.append(payload)
            else:
                train_data.append(payload)

    if len(train_data) == 0:
        raise HTTPException(status_code=400, detail="No training data provided inside Train Set selections.")

    hyperparameters = {
        "depth": depth,
        "base_channels": base_channels,
        "use_batch_norm": use_batch_norm,
        "dropout_p": dropout_p
    }

    def tracking_wrapper():
        final_loss_val = 0.0
        final_f1_val = 0.0
        is_completed_successfully = False
        
        for chunk in ml_engine.train_model_stream(train_data, test_data, active_indices, hyperparameters):
            yield chunk
            
            if "status" in chunk:
                try:
                    # SEMANTIC FIX: More robust substring cleanup logic to preserve strict JSON bounds
                    start_idx = chunk.find("{")
                    end_idx = chunk.rfind("}") + 1
                    if start_idx != -1 and end_idx != 0:
                        data_dict = json.loads(chunk[start_idx:end_idx])
                        
                        if data_dict.get("status") == "completed":
                            final_loss_val = float(data_dict.get("loss", 0.0))
                            final_f1_val = float(data_dict.get("test_f1_score", 0.0))
                            is_completed_successfully = True
                except Exception as e:
                    print("Error parsing final run log metrics: ", e)

        # SEMANTIC FIX: Only write to the db database log file if the loop completely executed successfully
        if is_completed_successfully:
            standalone_db = next(get_db())
            try:
                run_log = TrainingRun(
                    depth=depth,
                    base_channels=base_channels,  
                    use_batch_norm=use_batch_norm,
                    dropout_p=dropout_p,
                    final_loss=final_loss_val,
                    test_f1_score=final_f1_val
                )
                standalone_db.add(run_log)
                standalone_db.commit()
            except Exception as db_err:
                print("Database transaction failed: ", db_err)
            finally:
                standalone_db.close()

    return StreamingResponse(
        tracking_wrapper(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# SEMANTIC FIX: Changed from async def to standard def to ensure synchronous prediction runs inside threadpools
@app.post("/api/predict", response_model=schemas.PredictionResponse)
def predict_pipeline(file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_path = os.path.join(PREDICT_DIR, file.filename)
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        predicted_idx, confidence = ml_engine.predict_image(temp_path)
        
        matched_class = db.query(MLClass).filter(MLClass.class_index == predicted_idx).first()
        class_name = matched_class.name if matched_class else f"Class {predicted_idx}"
        
        os.remove(temp_path)

        return {
            "predicted_class_index": predicted_idx,
            "predicted_class_name": class_name,
            "confidence": round(confidence * 100, 2)
        }
    except FileNotFoundError as fnf:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=400, detail=str(fnf))
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/runs", response_model=List[schemas.TrainingRunResponse])
def get_training_runs(db: Session = Depends(get_db)):
    return db.query(TrainingRun).order_by(TrainingRun.timestamp.desc()).all()