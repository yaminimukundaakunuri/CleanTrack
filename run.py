import os
import sys

# Force UTF-8 on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

import uvicorn
from backend.seed_data import seed_database

if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(__file__), "backend", "cleantrack.db")
    if not os.path.exists(db_file):
        print("Initializing CleanTrack database and seeding Vijayawada wards...")
        seed_database()

    print("=================================================================")
    print(">> CleanTrack: Ward-Level Waste Pickup Reliability Tracker")
    print(">> Municipal Operations: Vijayawada, Andhra Pradesh")
    print(">> Web Server Running at: http://127.0.0.1:8000")
    print(">> Interactive API Docs at: http://127.0.0.1:8000/docs")
    print("=================================================================")
    
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
