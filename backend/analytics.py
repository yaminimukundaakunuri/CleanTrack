import io
import csv
from backend.database import get_connection

# Check if pandas is allowed or blocked by Windows Application Control
try:
    import pandas as pd
    HAS_PANDAS = True
except Exception as e:
    HAS_PANDAS = False
    print(f"[Notice] Pandas C-extension blocked by OS App Control ({e}); using Pure-Python Analytics Engine.")

def calculate_ward_reliability_scores():
    """
    Calculates transparent reliability scores per municipal ward
    combining scheduled vs recorded pickups and verified/unverified citizen complaints.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Fetch wards
    cursor.execute("""
        SELECT id, name, center_lat, center_lng, depot_name,
               scheduled_start_time, assigned_truck_id, assigned_driver, total_households
        FROM wards
        ORDER BY id ASC
    """)
    wards = [dict(r) for r in cursor.fetchall()]

    # Fetch schedules
    cursor.execute("""
        SELECT ward_id, SUM(scheduled_stops) as total_sched, SUM(recorded_stops) as total_rec
        FROM schedules
        GROUP BY ward_id
    """)
    schedules = {r["ward_id"]: r for r in cursor.fetchall()}

    # Fetch complaints by status
    cursor.execute("""
        SELECT ward_id, status, COUNT(*) as cnt
        FROM complaints
        GROUP BY ward_id, status
    """)
    complaint_counts = {}
    for r in cursor.fetchall():
        w_id = r["ward_id"]
        if w_id not in complaint_counts:
            complaint_counts[w_id] = {}
        complaint_counts[w_id][r["status"]] = r["cnt"]

    # Fetch waste metrics
    cursor.execute("""
        SELECT ward_id, organic_tons, recyclable_tons, landfill_tons, segregation_compliance_pct
        FROM waste_metrics
    """)
    waste_metrics = {r["ward_id"]: r for r in cursor.fetchall()}

    conn.close()

    results = []
    for w in wards:
        w_id = w["id"]
        sched_info = schedules.get(w_id, {"total_sched": 80, "total_rec": 75})
        sched = max(int(sched_info["total_sched"] or 1), 1)
        rec = int(sched_info["total_rec"] or 0)
        base_completion = (rec / sched) * 100.0

        c_status = complaint_counts.get(w_id, {})
        verified_missed = c_status.get("VERIFIED_MISSED", 0)
        unverified = c_status.get("UNVERIFIED", 0)
        resolved = c_status.get("RESOLVED", 0)
        duplicates = c_status.get("DUPLICATE", 0)

        # Transparent formula:
        # Base completion % minus penalty for confirmed missed and pending unverified
        penalty = (verified_missed * 4.5) + (unverified * 1.0)
        final_score = max(5.0, min(100.0, round(base_completion - penalty, 1)))

        if final_score >= 90:
            health = "HIGH_RELIABILITY"
            badge_color = "#10B981" # Emerald Green
            status_text = "Optimal Service"
        elif final_score >= 75:
            health = "MODERATE_ATTENTION"
            badge_color = "#F59E0B" # Amber
            status_text = "Minor Delays / Flags"
        else:
            health = "CRITICAL_FAILURE"
            badge_color = "#EF4444" # Red
            status_text = "Recurring Missed Pickups"

        wm = waste_metrics.get(w_id, {
            "organic_tons": 18.0,
            "recyclable_tons": 8.0,
            "landfill_tons": 3.0,
            "segregation_compliance_pct": 88.0
        })

        results.append({
            "ward_id": w_id,
            "ward_name": w["name"],
            "center_lat": float(w["center_lat"]),
            "center_lng": float(w["center_lng"]),
            "depot_name": w["depot_name"],
            "scheduled_start_time": w["scheduled_start_time"],
            "assigned_truck_id": w["assigned_truck_id"],
            "assigned_driver": w["assigned_driver"],
            "total_households": int(w["total_households"]),
            "scheduled_stops": sched,
            "recorded_stops": rec,
            "completion_rate_pct": round(base_completion, 1),
            "unverified_complaints": unverified,
            "verified_missed_complaints": verified_missed,
            "resolved_complaints": resolved,
            "duplicate_complaints": duplicates,
            "reliability_score": final_score,
            "health": health,
            "status_text": status_text,
            "badge_color": badge_color,
            "organic_tons": float(wm["organic_tons"]),
            "recyclable_tons": float(wm["recyclable_tons"]),
            "landfill_tons": float(wm["landfill_tons"]),
            "segregation_compliance_pct": float(wm["segregation_compliance_pct"])
        })

    return results

def identify_failure_hotspots():
    """
    Identifies recurring failure hotspots by analyzing complaint locations
    and cross-referencing vehicle delay events.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT tracking_id, ward_id, ward_name, address, latitude, longitude,
               waste_category, status, description, operator_notes
        FROM complaints
        WHERE status IN ('UNVERIFIED', 'VERIFIED_MISSED')
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not rows:
        return []

    # Group by ward_id
    grouped = {}
    for r in rows:
        w_id = r["ward_id"]
        if w_id not in grouped:
            grouped[w_id] = []
        grouped[w_id].append(r)

    hotspots = []
    for ward_id, items in grouped.items():
        ward_name = items[0]["ward_name"]
        count = len(items)
        verified_count = sum(1 for x in items if x["status"] == "VERIFIED_MISSED")
        avg_lat = sum(x["latitude"] for x in items) / count
        avg_lng = sum(x["longitude"] for x in items) / count

        severity = "HIGH" if verified_count >= 1 or count >= 2 else "MEDIUM"
        primary = items[0]

        hotspots.append({
            "ward_id": int(ward_id),
            "ward_name": ward_name,
            "lat": round(avg_lat, 5),
            "lng": round(avg_lng, 5),
            "total_reports": count,
            "verified_missed": verified_count,
            "severity": severity,
            "landmark": primary["address"],
            "evidence_note": primary["operator_notes"] or "Awaiting operator verification against GPS telemetry trail",
            "complaints": [
                {
                    "tracking_id": x["tracking_id"],
                    "address": x["address"],
                    "waste_category": x["waste_category"],
                    "status": x["status"]
                } for x in items
            ]
        })

    return hotspots

def export_weekly_summary_csv():
    """Generates weekly ward-level service performance summary as CSV string."""
    scores = calculate_ward_reliability_scores()
    
    headers = [
        'Ward ID', 'Ward Name', 'Total Households', 'Scheduled Pickups', 'Recorded Pickups',
        'Completion Rate (%)', 'Unverified Reports', 'Confirmed Missed',
        'Resolved Issues', 'Reliability Index (%)', 'Status Grade', 'Organic Waste (Tons)',
        'Recyclable Waste (Tons)', 'Landfill Waste (Tons)', 'Segregation Compliance (%)'
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)

    for s in scores:
        writer.writerow([
            s['ward_id'],
            s['ward_name'],
            s['total_households'],
            s['scheduled_stops'],
            s['recorded_stops'],
            s['completion_rate_pct'],
            s['unverified_complaints'],
            s['verified_missed_complaints'],
            s['resolved_complaints'],
            s['reliability_score'],
            s['status_text'],
            s['organic_tons'],
            s['recyclable_tons'],
            s['landfill_tons'],
            s['segregation_compliance_pct']
        ])

    return output.getvalue()
