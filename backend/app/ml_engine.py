import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import transforms
from PIL import Image
import json
import random
import numpy as np

# Import the centralized dynamic model architectures and shared constants
from .models import DynamicCNN, NoCodeMLDataset, IMAGE_SIZE, BATCH_SIZE, MODEL_PATH

# Ensure the data directory exists for model weights checkpoint serialization
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

def seed_everything(seedValue=42):
    random.seed(seedValue)
    np.random.seed(seedValue)
    torch.manual_seed(seedValue)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seedValue)
    # Forces CUDNN backend to select deterministic algorithms
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

# Call it before initializing your model weights or loaders
seed_everything(42)

def train_model_stream(train_data: list, test_data: list, active_class_indices: list, config: dict):
    """
    Executes training and computes a manual confusion matrix across active classes.
    """
    label_mapping = {img_idx: i for i, img_idx in enumerate(active_class_indices)}
    num_classes = len(active_class_indices)

    transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_dataset = NoCodeMLDataset(train_data, label_mapping, transform=transform)
    train_loader = DataLoader(train_dataset, batch_size=min(BATCH_SIZE, len(train_data)), shuffle=True)

    model = DynamicCNN(
        num_classes=num_classes,
        depth=config.get("depth", 3),
        base_channels=config.get("base_channels", 32),
        use_batch_norm=config.get("use_batch_norm", False),
        dropout_p=config.get("dropout_p", 0.0)
    )
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    EPOCHS = 10
    
    # --- TRAINING LOOP ---
    for epoch in range(EPOCHS):
        model.train()  # SEMANTIC FIX: Ensure model is explicitly in training mode each epoch
        epoch_loss = 0.0
        for images, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * images.size(0)
            
        total_loss = epoch_loss / len(train_data)
        train_error = round(total_loss, 4)
        yield f"data: {json.dumps({'epoch': epoch + 1, 'total_epochs': EPOCHS, 'loss': train_error, 'status': 'training'})}\n\n"

    # --- EVALUATION RUNTIME WITH CONFUSION MATRIX ---
    test_accuracy = 0.0
    matrix_size = len(active_class_indices)
    confusion_matrix = [[0] * matrix_size for _ in range(matrix_size)]

    if len(test_data) > 0:
        test_dataset = NoCodeMLDataset(test_data, label_mapping, transform=transform)
        # Using a reasonable batch size for evaluation to maintain memory safety
        test_loader = DataLoader(test_dataset, batch_size=min(BATCH_SIZE, len(test_data)), shuffle=False)
        
        model.eval()
        total_correct = 0  # SEMANTIC FIX: Track total correct predictions globally across all batches
        
        with torch.no_grad():
            for images, labels in test_loader:
                outputs = model(images)
                _, preds = torch.max(outputs, 1)
                
                total_correct += (preds == labels).sum().item()

                # Populate the confusion matrix coordinates manually
                for true_lbl, pred_lbl in zip(labels.tolist(), preds.tolist()):
                    confusion_matrix[true_lbl][pred_lbl] += 1
                    
        # SEMANTIC FIX: Compute final accuracy across the entire dataset out of the loop context
        test_accuracy = total_correct / len(test_data)
    else:
        test_accuracy = 1.0

    # Save weights checkpoint state
    torch.save({
        'model_state_dict': model.state_dict(),
        'active_class_indices': active_class_indices,
        'label_mapping': label_mapping,
        'num_classes': num_classes,
        'config': config
    }, MODEL_PATH)

    # Yield terminal final summary packet including our corrected evaluation accuracy metrics
    yield f"data: {json.dumps({
        'epoch': EPOCHS, 
        'total_epochs': EPOCHS, 
        'loss': train_error, 
        'test_f1_score': round(test_accuracy * 100, 2),  # Kept key name consistent for frontend mapping stability
        'status': 'completed',
        'confusion_matrix': confusion_matrix,
        'matrix_labels': active_class_indices 
    })}\n\n"


# --- 2. DYNAMIC MATCHING INFERENCE PREDICTION ENGINE ---
def predict_image(image_path: str):
    """
    Extracts checkpoint states, determines the model scale properties used to train it, 
    reconstructs a matching layout instance, and evaluates single-instance inference values.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("No trained model found. Please train the model first.")

    # Load custom state dictionaries and structural configuration parameters safely onto CPU fallback if needed
    checkpoint = torch.load(MODEL_PATH, map_location=torch.device('cpu'))
    active_class_indices = checkpoint['active_class_indices']
    label_mapping = checkpoint['label_mapping']
    num_classes = checkpoint['num_classes']
    config = checkpoint.get('config', {}) 

    # Inverse mapping index tracker (Maps contiguous model indexes 0-N back to user db class IDs)
    reverse_mapping = {v: k for k, v in label_mapping.items()}

    # Initialize a DynamicCNN matching the checkpoint's unique structural configuration
    model = DynamicCNN(
        num_classes=num_classes,
        depth=config.get("depth", 3),
        base_channels=config.get("base_channels", 32),
        use_batch_norm=config.get("use_batch_norm", False),
        dropout_p=config.get("dropout_p", 0.0)
    )
    
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()  # Enforce evaluation parameters (freeze dropouts/batch-norm statistics)

    # Apply tensor transformation normalization functions
    transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    image = Image.open(image_path).convert("RGB")
    image_tensor = transform(image).unsqueeze(0)  # Inject uniform batch matrix wrapper dimension

    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted_mapped_idx = torch.max(probabilities, 1)

    # Reverse reference values back to standard workspace allocation designations (0-9)
    final_class_index = reverse_mapping[predicted_mapped_idx.item()]
    
    return final_class_index, confidence.item()