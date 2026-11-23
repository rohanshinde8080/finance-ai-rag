@echo off
echo =====================================================================
echo                FinanceAI - Development Environment Launcher
echo =====================================================================
echo.

:: Check for backend Python virtual environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in backend\.venv
    echo Please run: python -m venv backend\.venv ^&^& backend\.venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

:: Check for frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend npm dependencies...
    cd frontend && npm install && cd ..
)

echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start "FinanceAI Backend (FastAPI)" cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

echo [2/2] Starting React Frontend on http://localhost:5173...
start "FinanceAI Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo FinanceAI services launched successfully!
echo - User Portal:      http://localhost:5173
echo - Admin Portal:     http://localhost:5173/admin/login
echo - API Documentation: http://localhost:8000/docs
echo.
echo Default Admin Credentials:
echo Email:    admin@financeai.com
echo Password: AdminSecure#2026!
echo =====================================================================

