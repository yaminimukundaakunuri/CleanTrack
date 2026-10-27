#!/bin/bash
set -e

echo "================================================================="
echo "  Starting CleanTrack: Ward-Level Waste Pickup Reliability Tracker"
echo "  Municipal Operations: Vijayawada, Andhra Pradesh"
echo "================================================================="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed or not in PATH."
    exit 1
fi

echo "Installing dependencies..."
python3 -m pip install -r requirements.txt

echo "Launching CleanTrack Server on http://127.0.0.1:8000 ..."
python3 run.py
