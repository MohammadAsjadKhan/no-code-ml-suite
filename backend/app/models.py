import os
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
import datetime
from sqlalchemy.orm import relationship
import torch
import torch.nn as nn
from torch.utils.data import Dataset
from PIL import Image
from .database import Base

# --- CONFIGURATION CONSTANTS ---
IMAGE_SIZE = 64
BATCH_SIZE = 32
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../data/model.pth")


# --- DATABASE SCHEMAS (SQLAlchemy) ---
class MLClass(Base):
    __tablename__ = "ml_classes"

    id = Column(Integer, primary_key=True, index=True)
    class_index = Column(Integer, unique=True, index=True)
    name = Column(String, index=True)
    is_active = Column(Boolean, default=False)

    images = relationship("ClassImage", back_populates="ml_class", cascade="all, delete-orphan")


class ClassImage(Base):
    __tablename__ = "class_images"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, index=True)
    dataset_type = Column(String, default="train", index=True) 
    
    # SEMANTIC FIX: Enforce engine-level cascading constraints to prevent database isolation bugs
    ml_class_id = Column(Integer, ForeignKey("ml_classes.id", ondelete="CASCADE"))

    ml_class = relationship("MLClass", back_populates="images")


# --- DYNAMIC PYTORCH ARCHITECTURE SANDBOX ---
class DynamicCNN(nn.Module):
    def __init__(self, num_classes: int, depth: int = 3, base_channels: int = 32, use_batch_norm: bool = False, dropout_p: float = 0.0):
        super(DynamicCNN, self).__init__()
        
        layers = []
        in_channels = 3  
        
        # 1. Programmatically stack Convolutional Block modules safely
        for i in range(depth):
            # SEMANTIC FIX: Stable linear-doubling sequence scaling (e.g., 32 -> 64 -> 128 -> 256)
            out_channels = base_channels if i == 0 else base_channels * (2 ** min(i, 3))
            
            layers.append(nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1))
            
            if use_batch_norm:
                layers.append(nn.BatchNorm2d(out_channels))
                
            layers.append(nn.ReLU())
            layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
            
            if dropout_p > 0:
                layers.append(nn.Dropout2d(p=dropout_p))
                
            in_channels = out_channels

        self.feature_extractor = nn.Sequential(*layers)
        
        # 2. SEMANTIC FIX: Use a dummy tensor pass to programmatically verify the flattened linear output shape.
        # This completely avoids spatial collapse math bugs regardless of the user's selected depth.
        with torch.no_grad():
            dummy_tensor = torch.zeros(1, 3, IMAGE_SIZE, IMAGE_SIZE)
            dummy_features = self.feature_extractor(dummy_tensor)
            linear_input_dim = dummy_features.numel()  # Total flattened parameter footprint counts
        
        # 3. Classification Linear Heads
        self.classifier = nn.Sequential(
            nn.Linear(linear_input_dim, 128),
            nn.ReLU(),
            nn.Dropout(p=dropout_p if dropout_p > 0 else 0.0),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.feature_extractor(x)
        x = x.view(x.size(0), -1)  
        x = self.classifier(x)
        return x


# --- PYTORCH DATASET WRAPPER ---
class NoCodeMLDataset(Dataset):
    def __init__(self, data_list, label_mapping, transform=None):
        self.data_list = data_list
        self.label_mapping = label_mapping
        self.transform = transform

    def __len__(self):
        return len(self.data_list)

    def __getitem__(self, idx):
        file_path, class_idx = self.data_list[idx]
        image = Image.open(file_path).convert('RGB')
        label = self.label_mapping[class_idx]
        if self.transform:
            image = self.transform(image)
        return image, label
    

class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Hyperparameters
    depth = Column(Integer)
    base_channels = Column(Integer)
    use_batch_norm = Column(Boolean)
    dropout_p = Column(Float)
    
    # Performance Metrics
    final_loss = Column(Float)
    test_f1_score = Column(Float)