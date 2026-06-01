no-code-ml-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          <-- FastAPI App entry point
│   │   ├── database.py      <-- SQL Alchemy configuration
│   │   ├── models.py        <-- SQL Database models (Classes, Images)
│   │   ├── schemas.py       <-- Pydantic validation schemas
│   │   ├── ml_engine.py     <-- PyTorch CNN model definition & training loop
│   │   └── data/            <-- Directory to store uploaded images & trained weights
│   ├── requirements.txt
│   └── data.db
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ClassManager.tsx  <-- Sidebar/Grid to manage the 10 classes
    │   │   ├── ImageUploader.tsx <-- Upload component per selected class
    │   │   ├── Trainer.tsx       <-- Triggers training and shows status
    │   │   └── Predictor.tsx     <-- Uploads test image and shows result
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
    ├── package.json
    └── tsconfig.json
