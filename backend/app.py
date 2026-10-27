import os
import json
import random
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, PlainTextResponse

from backend.database import get_connection, init_db
from backend.models import ComplaintCreate, ComplaintReview, MaintenanceAlertCreate, ComplaintStatus
from backend.analytics import (
    calculate_ward_reliability_scores,
    identify_failure_hotspots,
    export_weekly_summary_csv
)

app = FastAPI(
    title="CleanTrack - Ward-Level Waste Pickup Reliability Tracker",
    description="Geospatial waste monitoring platform correlating municipal schedules, GPS vehicle logs, and geotagged citizen complaints with operator verification workflows in Vijayawada.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

@app.on_event("startup")
def startup_event():
    init_db()

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "CleanTrack Vijayawada",
        "city": "Vijayawada, Andhra Pradesh",
        "time": datetime.now().isoformat()
    }

@app.get("/api/wards")
def get_wards():
    """Returns all municipal wards with GeoJSON geometries and operational metadata."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, geom, center_lat, center_lng, depot_name,
               scheduled_start_time, assigned_truck_id, assigned_driver, total_households
        FROM wards
        ORDER BY id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    wards = []
    for r in rows:
        wards.append({
            "id": r["id"],
            "name": r["name"],
            "geom": json.loads(r["geom"]),
            "center_lat": r["center_lat"],
            "center_lng": r["center_lng"],
            "depot_name": r["depot_name"],
            "scheduled_start_time": r["scheduled_start_time"],
            "assigned_truck_id": r["assigned_truck_id"],
            "assigned_driver": r["assigned_driver"],
            "total_households": r["total_households"]
        })
    return wards

@app.get("/api/routes")
def get_routes():
    """
    Returns pickup routes for Vijayawada including starting depots,
    pickup start times, and re-routed paths due to vehicle maintenance.
    """
    routes = [
        {
            "ward_id": 7,
            "ward_name": "Ward 7 - Benz Circle",
            "route_name": "Benz Circle - MG Road Corridor",
            "truck_id": "AP-16-TX-4521 (Original) / AP-16-TY-1088 (Standby)",
            "driver_name": "V. Suresh Babu / K. Somaraju",
            "depot_name": "Bandar Road Transit Station",
            "depot_lat": 16.4910,
            "depot_lng": 80.6490,
            "pickup_start_time": "06:00 AM",
            "status": "REROUTED_ACTIVE",
            "reroute_reason": "Maintenance Breakdown (Hydraulic packer failure at Benz Circle)",
            "original_path": [
                [16.4910, 80.6490], [16.4940, 80.6510], [16.4975, 80.6540],
                [16.4990, 80.6560], [16.5020, 80.6590], [16.5050, 80.6620]
            ],
            "rerouted_path": [
                [16.4990, 80.6560], # Breakdown location
                [16.4998, 80.6585], # Detour via Bandar Road Service lane
                [16.5030, 80.6610], # Resumed circuit
                [16.5060, 80.6640]  # Final collection point
            ],
            "breakdown_point": {
                "lat": 16.4990,
                "lng": 80.6560,
                "title": "Vehicle Breakdown Point",
                "desc": "AP-16-TX-4521 stopped here at 07:15 AM. Standby truck AP-16-TY-1088 took over detour."
            }
        },
        {
            "ward_id": 8,
            "ward_name": "Ward 8 - Patamata",
            "route_name": "Patamata Colony Main Loop",
            "truck_id": "AP-16-TX-8022",
            "driver_name": "P. Srinivasa Rao",
            "depot_name": "Autonagar Waste Transfer Station",
            "depot_lat": 16.4880,
            "depot_lng": 80.6800,
            "pickup_start_time": "06:00 AM",
            "status": "NORMAL_COLLECTION",
            "reroute_reason": None,
            "original_path": [
                [16.4880, 80.6800], [16.4910, 80.6760], [16.4935, 80.6720],
                [16.4950, 80.6690], [16.4980, 80.6680], [16.5010, 80.6710]
            ],
            "rerouted_path": None,
            "breakdown_point": None
        },
        {
            "ward_id": 1,
            "ward_name": "Ward 1 - One Town",
            "route_name": "One Town Heritage Market Loop",
            "truck_id": "AP-16-TX-1001",
            "driver_name": "S. Rambabu",
            "depot_name": "Prakasham Barrage North Depot",
            "depot_lat": 16.5080,
            "depot_lng": 80.6100,
            "pickup_start_time": "06:00 AM",
            "status": "NORMAL_COLLECTION",
            "reroute_reason": None,
            "original_path": [
                [16.5080, 80.6100], [16.5120, 80.6110], [16.5150, 80.6125],
                [16.5180, 80.6140], [16.5210, 80.6170]
            ],
            "rerouted_path": None,
            "breakdown_point": None
        },
        {
            "ward_id": 4,
            "ward_name": "Ward 4 - Governorpet",
            "route_name": "Governorpet Commercial Grid",
            "truck_id": "AP-16-TX-4040",
            "driver_name": "T. Nageswara Rao",
            "depot_name": "Governorpet Sub-Depot (Eluru Road)",
            "depot_lat": 16.5100,
            "depot_lng": 80.6250,
            "pickup_start_time": "06:30 AM",
            "status": "NORMAL_COLLECTION",
            "reroute_reason": None,
            "original_path": [
                [16.5100, 80.6250], [16.5125, 80.6275], [16.5150, 80.6300],
                [16.5170, 80.6330]
            ],
            "rerouted_path": None,
            "breakdown_point": None
        }
    ]
    return routes

@app.get("/api/maintenance-alerts")
def get_maintenance_alerts():
    """Returns vehicle maintenance and replacement alerts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, truck_id, driver_name, ward_id, ward_name, alert_type,
               issue_description, replacement_truck_id, reroute_active,
               location_landmark, timestamp, status, resolution_time
        FROM maintenance_alerts
        ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/maintenance-alerts", status_code=status.HTTP_201_CREATED)
def create_maintenance_alert(alert: MaintenanceAlertCreate):
    """Allows an operator or fleet dispatcher to report a vehicle breakdown and assign replacement."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get ward name
    cursor.execute("SELECT name FROM wards WHERE id = ?", (alert.ward_id,))
    w = cursor.fetchone()
    ward_name = w["name"] if w else f"Ward {alert.ward_id}"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    reroute = 1 if alert.replacement_vehicle_id else 0

    cursor.execute("""
        INSERT INTO maintenance_alerts (
            truck_id, driver_name, ward_id, ward_name, alert_type,
            issue_description, replacement_truck_id, reroute_active,
            location_landmark, timestamp, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        alert.vehicle_id, alert.driver_name, alert.ward_id, ward_name,
        alert.alert_type, alert.issue_description, alert.replacement_vehicle_id,
        reroute, alert.location_landmark, timestamp, alert.status
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"success": True, "id": new_id, "message": "Vehicle maintenance alert recorded and reroute registered."}

# --- Citizen Complaint Module ---

@app.post("/api/complaints", status_code=status.HTTP_201_CREATED)
def submit_complaint(complaint: ComplaintCreate):
    """
    Submits a missed pickup complaint without requiring login.
    All complaints start with status 'UNVERIFIED' until operator verification.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Look up ward name
    cursor.execute("SELECT name FROM wards WHERE id = ?", (complaint.ward_id,))
    w = cursor.fetchone()
    ward_name = w["name"] if w else f"Ward {complaint.ward_id}"

    # Generate human-friendly unique tracking ID (e.g. CT-VIJ-2026-XXXX)
    random_code = random.randint(1000, 9999)
    tracking_id = f"CT-VIJ-2026-{random_code}"
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO complaints (
            tracking_id, ward_id, ward_name, resident_name, contact_phone,
            address, latitude, longitude, waste_category, missed_date,
            missed_time_slot, description, photo_url, status,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNVERIFIED', ?, ?)
    """, (
        tracking_id, complaint.ward_id, ward_name,
        complaint.resident_name or "Anonymous Resident",
        complaint.contact_phone, complaint.address,
        complaint.latitude, complaint.longitude,
        complaint.waste_category.value, complaint.missed_date,
        complaint.missed_time_slot, complaint.description,
        complaint.photo_url, now_str, now_str
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "tracking_id": tracking_id,
        "status": ComplaintStatus.UNVERIFIED.value,
        "ward_name": ward_name,
        "message": "Complaint submitted successfully. Your complaint is queued as UNVERIFIED until our municipal operator cross-references vehicle GPS telemetry."
    }

@app.get("/api/complaints/{tracking_id}")
def track_complaint(tracking_id: str):
    """Public lookup for citizens to track their complaint status without logging in."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, tracking_id, ward_id, ward_name, resident_name, contact_phone,
               address, latitude, longitude, waste_category, missed_date,
               missed_time_slot, description, photo_url, status,
               operator_notes, reviewed_by, resolution_action, is_duplicate_of,
               created_at, updated_at
        FROM complaints
        WHERE UPPER(tracking_id) = UPPER(?)
    """, (tracking_id.strip(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Complaint tracking ID not found. Please verify the code.")

    data = dict(row)
    
    # Build transparent verification timeline
    timeline = [
        {
            "step": "Complaint Submitted",
            "time": data["created_at"],
            "description": f"Submitted by {data['resident_name']} for {data['waste_category']} waste pickup.",
            "completed": True
        },
        {
            "step": "Operator GPS Verification",
            "time": data["updated_at"] if data["status"] != "UNVERIFIED" else "Pending Operator Triage",
            "description": data["operator_notes"] or "Operator is cross-referencing truck GPS breadcrumbs and collection sensors.",
            "completed": data["status"] != "UNVERIFIED"
        },
        {
            "step": "Resolution Action",
            "time": data["updated_at"] if data["status"] in ["RESOLVED", "DUPLICATE", "REJECTED"] else "Scheduled Action",
            "description": data["resolution_action"] or "Action pending operator review.",
            "completed": data["status"] in ["RESOLVED", "DUPLICATE"]
        }
    ]
    data["timeline"] = timeline
    return data

@app.get("/api/complaints")
def list_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    ward_filter: Optional[int] = Query(None, alias="ward_id")
):
    """Operator queue endpoint to view and filter citizen reports."""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, tracking_id, ward_id, ward_name, resident_name, contact_phone,
               address, latitude, longitude, waste_category, missed_date,
               missed_time_slot, description, photo_url, status,
               operator_notes, reviewed_by, resolution_action, is_duplicate_of,
               created_at, updated_at
        FROM complaints
        WHERE 1=1
    """
    params = []
    if status_filter and status_filter.upper() != "ALL":
        query += " AND status = ?"
        params.append(status_filter.upper())
    if ward_filter:
        query += " AND ward_id = ?"
        params.append(ward_filter)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(r) for r in rows]

@app.patch("/api/complaints/{complaint_id}/review")
def review_complaint(complaint_id: int, review: ComplaintReview):
    """
    Operator endpoint to verify complaint, mark duplicate, or record resolution.
    Transparently attaches evidence notes and GPS findings.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, tracking_id FROM complaints WHERE id = ?", (complaint_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE complaints
        SET status = ?,
            operator_notes = ?,
            reviewed_by = ?,
            resolution_action = ?,
            is_duplicate_of = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        review.status.value,
        review.operator_notes,
        review.reviewed_by or "Municipal Operator",
        review.resolution_action,
        review.is_duplicate_of,
        now_str,
        complaint_id
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "complaint_id": complaint_id,
        "updated_status": review.status.value,
        "message": f"Complaint status updated to {review.status.value}."
    }

# --- Analytics & Reporting Endpoints (Pandas) ---

@app.get("/api/reliability-scores")
def get_reliability_scores():
    """Returns Pandas-computed transparent reliability scores per ward."""
    return calculate_ward_reliability_scores()

@app.get("/api/hotspots")
def get_failure_hotspots():
    """Returns recurring failure hotspots with evidence note and coordinate clusters."""
    return identify_failure_hotspots()

@app.get("/api/waste-segregation")
def get_waste_segregation():
    """Returns city-wide and ward-level waste segregation (Organic, Recyclable, Landfill)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ward_id, ward_name, date, organic_tons, recyclable_tons,
               landfill_tons, segregation_compliance_pct
        FROM waste_metrics
        ORDER BY ward_id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    records = [dict(r) for r in rows]
    total_organic = round(sum(r["organic_tons"] for r in records), 1)
    total_recyclable = round(sum(r["recyclable_tons"] for r in records), 1)
    total_landfill = round(sum(r["landfill_tons"] for r in records), 1)
    grand_total = round(total_organic + total_recyclable + total_landfill, 1)
    avg_compliance = round(sum(r["segregation_compliance_pct"] for r in records) / max(len(records), 1), 1)

    return {
        "summary": {
            "city": "Vijayawada",
            "date": "2026-10-27",
            "grand_total_tons": grand_total,
            "organic_tons": total_organic,
            "organic_pct": round((total_organic / max(grand_total, 1)) * 100, 1),
            "recyclable_tons": total_recyclable,
            "recyclable_pct": round((total_recyclable / max(grand_total, 1)) * 100, 1),
            "landfill_tons": total_landfill,
            "landfill_pct": round((total_landfill / max(grand_total, 1)) * 100, 1),
            "avg_compliance_pct": avg_compliance
        },
        "wards": records
    }

@app.get("/api/driver-performance")
def get_driver_performance():
    """Returns driver performance metrics, completion %, and on-time score."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, driver_name, vehicle_id, assigned_ward, on_time_score,
               completion_pct, complaints_count, rating, status, phone
        FROM driver_performance
        ORDER BY on_time_score DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/reports/weekly-summary/export")
def export_weekly_summary():
    """Exports weekly ward-level service performance summary as CSV generated by Pandas."""
    csv_string = export_weekly_summary_csv()
    filename = f"CleanTrack_Vijayawada_Weekly_Summary_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_string,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- Frontend Static Serving ---

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_frontend_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return PlainTextResponse("CleanTrack API is running. Frontend index.html not yet built.")
