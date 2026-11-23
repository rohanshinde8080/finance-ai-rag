@echo off
echo =====================================================================
echo                FinanceAI - Docker Production Orchestrator
echo =====================================================================
echo.

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not running on this machine.
    echo Please install Docker Desktop or run in development mode using run_dev.bat.
    pause
    exit /b 1
)

echo [INFO] Building and starting containers: PostgreSQL (pgvector) + FastAPI + Nginx/React...
docker compose up --build -d

echo.
echo =====================================================================
echo FinanceAI Production Stack is live!
echo - Main Application:  http://localhost
echo - Admin Portal:      http://localhost/admin/login
echo - REST API Docs:     http://localhost/docs
echo.
echo To view real-time logs:  docker compose logs -f
echo To stop containers:      docker compose down
echo =====================================================================

