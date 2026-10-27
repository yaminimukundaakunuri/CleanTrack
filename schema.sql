-- ============================================================================
-- CleanTrack: Ward-Level Waste Pickup Reliability Tracker
-- PostgreSQL + PostGIS Schema Definition
-- Target City: Vijayawada, Andhra Pradesh
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Municipal Wards Table (Pre-loaded with id, name, geom)
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    depot_name VARCHAR(150) NOT NULL,
    scheduled_start_time VARCHAR(20) NOT NULL,
    assigned_truck_id VARCHAR(50) NOT NULL,
    assigned_driver VARCHAR(100) NOT NULL,
    total_households INTEGER DEFAULT 12000
);

CREATE INDEX IF NOT EXISTS idx_wards_geom ON wards USING GIST(geom);

-- 2. Citizen Complaints Table
CREATE TYPE complaint_status_enum AS ENUM (
    'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED_MISSED', 'DUPLICATE', 'RESOLVED', 'REJECTED'
);

CREATE TYPE waste_category_enum AS ENUM (
    'ORGANIC', 'RECYCLABLE', 'LANDFILL', 'MIXED'
);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(50) UNIQUE NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    ward_name VARCHAR(100) NOT NULL,
    resident_name VARCHAR(100) NOT NULL DEFAULT 'Anonymous Resident',
    contact_phone VARCHAR(50),
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    waste_category VARCHAR(50) NOT NULL DEFAULT 'MIXED',
    missed_date DATE NOT NULL,
    missed_time_slot VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
    operator_notes TEXT,
    reviewed_by VARCHAR(100),
    resolution_action TEXT,
    is_duplicate_of VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_geom ON complaints USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_complaints_tracking_id ON complaints(tracking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_ward_id ON complaints(ward_id);

-- 3. Pickup Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    truck_id VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    route_name VARCHAR(150) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    expected_end_time VARCHAR(20) NOT NULL,
    scheduled_stops INTEGER NOT NULL,
    recorded_stops INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL
);

-- 4. Vehicle GPS Breadcrumb & Event Logs
CREATE TABLE IF NOT EXISTS vehicle_logs (
    id BIGSERIAL PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    speed_kmh DOUBLE PRECISION NOT NULL,
    event VARCHAR(100) NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_geom ON vehicle_logs USING GIST(geom);

-- 5. Maintenance & Breakdown Alerts
CREATE TABLE IF NOT EXISTS maintenance_alerts (
    id SERIAL PRIMARY KEY,
    truck_id VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    ward_name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    replacement_truck_id VARCHAR(50),
    reroute_active BOOLEAN DEFAULT FALSE,
    location_landmark VARCHAR(150) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    resolution_time TIMESTAMP WITH TIME ZONE
);

-- 6. Waste Segregation Daily Metrics
CREATE TABLE IF NOT EXISTS waste_metrics (
    id SERIAL PRIMARY KEY,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    ward_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    organic_tons DOUBLE PRECISION NOT NULL,
    recyclable_tons DOUBLE PRECISION NOT NULL,
    landfill_tons DOUBLE PRECISION NOT NULL,
    segregation_compliance_pct DOUBLE PRECISION NOT NULL
);

-- 7. Driver Performance Table
CREATE TABLE IF NOT EXISTS driver_performance (
    id SERIAL PRIMARY KEY,
    driver_name VARCHAR(100) NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    assigned_ward VARCHAR(100) NOT NULL,
    on_time_score DOUBLE PRECISION NOT NULL,
    completion_pct DOUBLE PRECISION NOT NULL,
    complaints_count INTEGER NOT NULL DEFAULT 0,
    rating DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    status VARCHAR(50) NOT NULL,
    phone VARCHAR(50)
);

-- Spatial Query Helpers
-- 1. Identify which ward a citizen complaint falls inside:
-- SELECT w.id, w.name FROM wards w WHERE ST_Contains(w.geom, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
