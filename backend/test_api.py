import sys
import urllib.request
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    endpoints = [
        "/api/health",
        "/api/wards",
        "/api/routes",
        "/api/maintenance-alerts",
        "/api/complaints",
        "/api/reliability-scores",
        "/api/hotspots",
        "/api/waste-segregation",
        "/api/driver-performance"
    ]
    
    print("Testing CleanTrack API Endpoints:")
    for ep in endpoints:
        try:
            req = urllib.request.Request(f"{BASE_URL}{ep}")
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                status = resp.status
                item_count = len(data) if isinstance(data, list) else len(data.keys())
                print(f"✅ {ep} -> HTTP {status} (Items/Keys: {item_count})")
        except Exception as e:
            print(f"❌ {ep} -> Error: {e}")

    # Test Complaint Submission (No login required)
    complaint_payload = {
        "ward_id": 7,
        "resident_name": "Test Citizen",
        "contact_phone": "+91 99999 88888",
        "address": "40-1-52, Near Benz Circle",
        "latitude": 16.4985,
        "longitude": 80.6558,
        "waste_category": "ORGANIC",
        "missed_date": "2026-10-27",
        "missed_time_slot": "06:00 AM - 09:00 AM",
        "description": "Test automated missed pickup verification."
    }
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/complaints",
            data=json.dumps(complaint_payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            tracking_id = data.get("tracking_id")
            print(f"✅ POST /api/complaints -> HTTP {resp.status} (Generated Tracking ID: {tracking_id}, Status: {data.get('status')})")

            # Test tracking by ID
            track_req = urllib.request.Request(f"{BASE_URL}/api/complaints/{tracking_id}")
            with urllib.request.urlopen(track_req) as t_resp:
                t_data = json.loads(t_resp.read().decode('utf-8'))
                print(f"✅ GET /api/complaints/{tracking_id} -> HTTP {t_resp.status} (Status: {t_data.get('status')})")
    except Exception as e:
        print(f"❌ Complaint submission test failed: {e}")

    # Test Weekly CSV Export
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/reports/weekly-summary/export")
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            lines = content.strip().split('\n')
            print(f"✅ GET /api/reports/weekly-summary/export -> HTTP {resp.status} (CSV Rows: {len(lines)})")
    except Exception as e:
        print(f"❌ CSV Export test failed: {e}")

if __name__ == "__main__":
    test_endpoints()
