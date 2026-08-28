# AI-Based Pest Detection System (Capstone Project)

An AI-assisted, crop-agnostic agricultural pest detection application designed for farmers and agricultural managers. This system enables farmers to upload or capture photos of crop pest infestations, receive pest identifications, confidence scores, visual bounding boxes, and actionable management recommendations.

---

## 🌟 Key Architectural Features

1. **Fully Configurable Target Crop System:**
   - Designed to be 100% target-crop agnostic.
   - Dynamic `crops`, `pests`, and `crop_pests` relational tables allow administrators to change or add target crops (e.g. Corn, Rice, Cabbage, Onion) dynamically via the Admin Panel without changing source code.

2. **Pluggable Mock / AI Detection Engine:**
   - Controlled via the environment variable `DETECTION_MODE` (`mock` or `ai`).
   - During initial development and pre-ML defense, the system uses `MockDetectionService` to generate controlled sample detections, confidence scores, and bounding boxes.
   - When the target crop and dataset are finalized, the trained model (YOLOv8 / PyTorch / TensorFlow) is imported into `backend/app/services/detection/ai_service.py` and activated by setting `DETECTION_MODE=ai`.

3. **Native Java Android Application:**
   - 100% Native Java Android Studio project (`android/`) communicating with FastAPI backend via REST API.
   - Implements **Retrofit 2** + **Gson**, **Glide** image loading, and custom **`BoundingBoxOverlayView`** canvas for displaying pest detection bounding boxes.
   - Native camera photo capture & gallery picking support.

---

## 🚀 Technology Stack

- **Backend:** Python 3.11+ with FastAPI, Pydantic, SQLAlchemy, PyJWT, and Bcrypt security.
- **Database:** Relational Database (SQLite for local dev, PostgreSQL for production) with seed data.
- **Frontend:** React 18 (Vite), Tailwind CSS, Lucide Icons.
- **Mobile Client:** Native Java Android Application (Android Studio + Retrofit 2 + Material Components + Glide).

---

## 🛠️ Quick Start & Running Locally

### 1. Backend Setup & Run

```bash
cd backend

# Create virtual environment (optional)
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed default database with roles, demo users, crops & pests
python seed.py

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive API Docs (`Swagger`): [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup & Run

```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
- Open Web Application: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Demo Account Credentials

- **Farmer Account:** `farmer@pestdetect.com` / `farmer123`
- **Admin Account:** `admin@pestdetect.com` / `admin123`

---

## 📱 Android App Setup

1. Open the `android/` directory in **Android Studio**.
2. Make sure your local IP or backend URL is configured in `MainActivity.java` (`APP_URL`).
3. Build and Run on an Android Emulator or connected smartphone.

---

## 🤖 Phase 6: How to Integrate the Final AI Model

When the target crop, pest classes, and dataset are finalized:

1. Install your framework (e.g. `pip install ultralytics torch` or `onnxruntime`).
2. Place model weights file (e.g., `yolov8n_pest.pt`) inside `backend/app/ml_models/`.
3. Update `backend/app/services/detection/ai_service.py` to load model weights in `__init__` and perform inference in `analyze_image()`.
4. Update `.env`: `DETECTION_MODE=ai`.
