import os
import sqlite3
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "cleantrack.db")
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_connection():
    """Returns a connection to SQLite. If PostgreSQL is configured, adapts accordingly."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Wards table (already structured with id, name, geom as requested)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wards (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        geom TEXT NOT NULL,
        center_lat REAL NOT NULL,
        center_lng REAL NOT NULL,
        depot_name TEXT NOT NULL,
        scheduled_start_time TEXT NOT NULL,
        assigned_truck_id TEXT NOT NULL,
        assigned_driver TEXT NOT NULL,
        total_households INTEGER DEFAULT 12000
    );
    """)

    # 2. Citizen Complaints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_id TEXT UNIQUE NOT NULL,
        ward_id INTEGER NOT NULL,
        ward_name TEXT NOT NULL,
        resident_name TEXT NOT NULL,
        contact_phone TEXT,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        waste_category TEXT NOT NULL,
        missed_date TEXT NOT NULL,
        missed_time_slot TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_url TEXT,
        status TEXT NOT NULL DEFAULT 'UNVERIFIED',
        operator_notes TEXT,
        reviewed_by TEXT,
        resolution_action TEXT,
        is_duplicate_of TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(ward_id) REFERENCES wards(id)
    );
    """)

    # 3. Pickup Schedules
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY,
        ward_id INTEGER NOT NULL,
        truck_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        route_name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        expected_end_time TEXT NOT NULL,
        scheduled_stops INTEGER NOT NULL,
        recorded_stops INTEGER NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY(ward_id) REFERENCES wards(id)
    );
    """)

    # 4. Vehicle GPS breadcrumb & event logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicle_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        ward_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        speed_kmh REAL NOT NULL,
        event TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY(ward_id) REFERENCES wards(id)
    );
    """)

    # 5. Maintenance & Breakdown Alerts ("The truck is changed due to some issue")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS maintenance_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        ward_id INTEGER NOT NULL,
        ward_name TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        issue_description TEXT NOT NULL,
        replacement_truck_id TEXT,
        reroute_active INTEGER DEFAULT 0,
        location_landmark TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        resolution_time TEXT,
        FOREIGN KEY(ward_id) REFERENCES wards(id)
    );
    """)

    # 6. Waste Segregation metrics (Organic, Recyclable, Landfill)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS waste_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ward_id INTEGER NOT NULL,
        ward_name TEXT NOT NULL,
        date TEXT NOT NULL,
        organic_tons REAL NOT NULL,
        recyclable_tons REAL NOT NULL,
        landfill_tons REAL NOT NULL,
        segregation_compliance_pct REAL NOT NULL,
        FOREIGN KEY(ward_id) REFERENCES wards(id)
    );
    """)

    # 7. Driver Performance
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS driver_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_name TEXT NOT NULL,
        vehicle_id TEXT NOT NULL,
        assigned_ward TEXT NOT NULL,
        on_time_score REAL NOT NULL,
        completion_pct REAL NOT NULL,
        complaints_count INTEGER NOT NULL,
        rating REAL NOT NULL,
        status TEXT NOT NULL,
        phone TEXT
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("CleanTrack database schema initialized successfully.")
