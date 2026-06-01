from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import datetime 

# --- IMAGE SCHEMAS ---
class ClassImageBase(BaseModel):
    file_path: str

class ClassImageResponse(ClassImageBase):
    id: int
    ml_class_id: int
    dataset_type: str

    class Config:
        from_attributes = True


# --- ML CLASS SCHEMAS ---
class MLClassBase(BaseModel):
    name: Optional[str] = None

class MLClassUpdate(MLClassBase):
    name: str = Field(..., min_length=1, max_length=50)

    @field_validator('name')
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError('Class name cannot consist of empty spaces only.')
        return stripped


class MLClassResponse(BaseModel):
    id: int
    class_index: int
    name: str  
    is_active: bool
    images: List[ClassImageResponse] = []

    class Config:
        from_attributes = True


# --- TRAINING & PREDICTION SCHEMAS ---
class TrainStatusResponse(BaseModel):
    status: str
    message: str
    trained_classes: List[str]

class PredictionResponse(BaseModel):
    predicted_class_index: int
    predicted_class_name: str
    confidence: float


class RealtimeMetricProgress(BaseModel):
    epoch: int
    total_epochs: int
    loss: float
    status: str
    test_f1_score: Optional[float] = None
    confusion_matrix: Optional[List[List[int]]] = None
    matrix_labels: Optional[List[int]] = None


class TrainingRunResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    depth: int
    base_channels: int
    use_batch_norm: bool
    dropout_p: float
    final_loss: float
    test_f1_score: float

    class Config:
        from_attributes = True