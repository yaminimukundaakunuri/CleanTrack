@echo off
echo =================================================================
echo   Starting CleanTrack: Ward-Level Waste Pickup Reliability Tracker
echo   Municipal Operations: Vijayawada, Andhra Pradesh
echo =================================================================
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.9+.
    pause
    exit /b 1
)

echo Installing dependencies...
python -m pip install -r requirements.txt

echo Launching CleanTrack Server...
python run.py
pause
