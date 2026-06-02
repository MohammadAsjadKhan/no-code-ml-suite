# No-Code Vision Suite: Dynamic CNN Classifier Studio

A production-grade, full-stack, no-code deep learning dashboard that empowers users to build, configure, train, and test custom Convolutional Neural Networks (CNNs) directly from an interactive user interface. The platform bridges the gap between raw dataset operations and network training matrices by providing real-time telemetry streaming and automated evaluation pipelines.

---

## 🚀 Key Architectural Features

* **Dynamic Network Architecture Sandbox:** Adjust structural model layouts on the fly—including custom layer depth (1 to 5 Conv Blocks), base feature channel widths ($16, 32, or 64 \text{ ch}$), Batch Normalization layers, and variable Dropout regularizations.
* **Synchronized Telemetry Logging:** Features a persistent **Experiment Tracking Log** connected directly to an underlying SQLite database backend. State mutation hooks ensure historical tracking rows instantly sync when datasets are modified or cleared.
* **Server-Sent Events (SSE) Training Stream:** Real-time epoch-by-epoch loss tracking is broadcast from the Python back-end directly to the UI canvas without manual page-polling overhead.
* **Mathematically Hardened Evaluation Engine:** Processes validation holdouts by computing a true **Multi-Class Macro F1-Score** derived explicitly from an on-screen runtime Confusion Matrix matrix.
* **Deterministic Configuration Guard:** Includes absolute system seed locking across Python, NumPy, and PyTorch frameworks to maintain reproducible experimental baselines when evaluating identical training matrices.

---

## 🛠️ System Technology Stack

| Ecosystem Layer | Technologies Utilized |
| :--- | :--- |
| **Frontend Layout Core** | React 18+, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend Core Engine** | FastAPI, Python 3.10+, PyTorch, Torchvision, Uvicorn |
| **Database & ORM** | SQLite, SQLAlchemy Core |
| **Data Normalization** | Pillow (PIL), NumPy |

---

## 📂 Repository Directory Structure

```text
no-code-ml-app/
├── frontend/                # Vite + React Client SPA
│   ├── src/
│   │   ├── components/      # ClassManager, ImageUploader, Trainer, Predictor, ExperimentTracker
│   │   ├── App.tsx          # Main Root Workspace Orchestrator
│   │   └── main.tsx         # Virtual DOM Application Bootstrapper
│   ├── index.html           # Anti-Flash Fixed Canvas Entry Node
│   └── package.json
└── backend/                 # FastAPI Application Core
    ├── app/
    │   ├── main.py          # Routing Layouts and API Definitions
    │   ├── models.py        # SQLAlchemy Schema & Dynamic PyTorch CNN Subclasses
    │   ├── ml_engine.py     # Hardened Macro F1 Training Loops & Inference Pipelines
    │   └── database.py      # Session Handlers and Engine Connections
    └── requirements.txt     # Python Dependencies Matchlist
```

## ⚙️ Local Installation & Startup Guide
Follow these instructions to run the application in your local environment. Open two separate terminal windows to host your execution loops:

1. Backend Infrastructure Configuration (Terminal 1)
    Navigate to the backend repository root, establish a clean virtual environment space, and activate the local server context:
    # Navigate to the backend directory
    cd backend
    
    ```text Initialize your virtual environment structure
       python3 -m venv .venv
    ```
    
    ### Activate the environment path wrapper
     #### On macOS or Linux:
     ```source .venv/bin/activate ```
    ### On Windows (Command Prompt):
     ```.venv\Scripts\activate```
    
    ### Install essential deep learning and API framework binaries
    ```pip install -r requirements.txt```
    
    ### Launch the live-reloading Uvicorn development loop
    ``` uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 ```
2. Frontend Layout Compilation (Terminal 2)
Navigate to your frontend repository root block, download node engine modules, and boot up the asset building pipelines:
    ### Navigate to the frontend directory
    ```cd frontend```
    
    ### Download and map node dependencies
    ```npm install```
    
    ### Run the local Vite development instance
    ```npm run dev```
Once successfully loaded, navigate to ```http://localhost:5173``` inside your web browser to interact with your dashboard space!

Thank You!
