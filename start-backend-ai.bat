@echo off
cd /d "%~dp0backend"
echo [AI Backend] Starting FastAPI with CUDA PyTorch + Ultralytics YOLOv8...
"..\datasets\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
