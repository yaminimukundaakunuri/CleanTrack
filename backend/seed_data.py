import json
import random
from datetime import datetime, timedelta
from backend.database import get_connection, init_db

# Real Vijayawada Wards with realistic polygonal GeoJSON boundaries
VIJAYAWADA_WARDS = [
    {
        "id": 1,
        "name": "Ward 1 - One Town (Kothapeta & Panja Centre)",
        "center_lat": 16.5165,
        "center_lng": 80.6125,
        "depot_name": "Prakasham Barrage North Depot",
        "scheduled_start_time": "06:00 AM",
        "assigned_truck_id": "AP-16-TX-1001",
        "assigned_driver": "S. Rambabu",
        "total_households": 14200,
        "coords": [
            [80.6050, 16.5110], [80.6200, 16.5120], [80.6220, 16.5230],
            [80.6080, 16.5220], [80.6050, 16.5110]
        ]
    },
    {
        "id": 2,
        "name": "Ward 2 - Bhavanipuram",
        "center_lat": 16.5310,
        "center_lng": 80.5980,
        "depot_name": "Bhavanipuram Central Solid Waste Depot",
        "scheduled_start_time": "06:00 AM",
        "assigned_truck_id": "AP-16-TX-2004",
        "assigned_driver": "K. Venkatesh",
        "total_households": 15800,
        "coords": [
            [80.5880, 16.5220], [80.6070, 16.5230], [80.6090, 16.5400],
            [80.5900, 16.5390], [80.5880, 16.5220]
        ]
    },
    {
        "id": 3,
        "name": "Ward 3 - Vidyadharapuram",
        "center_lat": 16.5360,
        "center_lng": 80.6160,
        "depot_name": "Bhavanipuram Central Solid Waste Depot",
        "scheduled_start_time": "06:15 AM",
        "assigned_truck_id": "AP-16-TX-3112",
        "assigned_driver": "M. Satyanarayana",
        "total_households": 13400,
        "coords": [
            [80.6070, 16.5280], [80.6250, 16.5290], [80.6260, 16.5450],
            [80.6080, 16.5440], [80.6070, 16.5280]
        ]
    },
    {
        "id": 4,
        "name": "Ward 4 - Governorpet",
        "center_lat": 16.5120,
        "center_lng": 80.6280,
        "depot_name": "Governorpet Sub-Depot (Eluru Road)",
        "scheduled_start_time": "06:30 AM",
        "assigned_truck_id": "AP-16-TX-4040",
        "assigned_driver": "T. Nageswara Rao",
        "total_households": 11500,
        "coords": [
            [80.6210, 16.5050], [80.6350, 16.5060], [80.6360, 16.5190],
            [80.6220, 16.5180], [80.6210, 16.5050]
        ]
    },
    {
        "id": 5,
        "name": "Ward 5 - Suryaraopet",
        "center_lat": 16.5135,
        "center_lng": 80.6410,
        "depot_name": "Governorpet Sub-Depot (Eluru Road)",
        "scheduled_start_time": "06:00 AM",
        "assigned_truck_id": "AP-16-TX-5091",
        "assigned_driver": "B. Sivaji",
        "total_households": 12800,
        "coords": [
            [80.6340, 16.5060], [80.6480, 16.5070], [80.6490, 16.5210],
            [80.6350, 16.5200], [80.6340, 16.5060]
        ]
    },
    {
        "id": 6,
        "name": "Ward 6 - Moghalrajpuram",
        "center_lat": 16.5060,
        "center_lng": 80.6520,
        "depot_name": "Moghalrajpuram Hillside Depot",
        "scheduled_start_time": "06:30 AM",
        "assigned_truck_id": "AP-16-TX-6120",
        "assigned_driver": "D. Anji Reddy",
        "total_households": 10900,
        "coords": [
            [80.6440, 16.4980], [80.6600, 16.4990], [80.6610, 16.5140],
            [80.6450, 16.5130], [80.6440, 16.4980]
        ]
    },
    {
        "id": 7,
        "name": "Ward 7 - Benz Circle",
        "center_lat": 16.4990,
        "center_lng": 80.6560,
        "depot_name": "Bandar Road Transit Station",
        "scheduled_start_time": "06:00 AM",
        "assigned_truck_id": "AP-16-TX-4521",
        "assigned_driver": "V. Suresh Babu",
        "total_households": 16500,
        "coords": [
            [80.6480, 16.4900], [80.6650, 16.4910], [80.6660, 16.5070],
            [80.6490, 16.5060], [80.6480, 16.4900]
        ]
    },
    {
        "id": 8,
        "name": "Ward 8 - Patamata",
        "center_lat": 16.4950,
        "center_lng": 80.6710,
        "depot_name": "Autonagar Waste Transfer Station",
        "scheduled_start_time": "06:00 AM",
        "assigned_truck_id": "AP-16-TX-8022",
        "assigned_driver": "P. Srinivasa Rao",
        "total_households": 17200,
        "coords": [
            [80.6620, 16.4860], [80.6800, 16.4870], [80.6810, 16.5040],
            [80.6630, 16.5030], [80.6620, 16.4860]
        ]
    },
    {
        "id": 9,
        "name": "Ward 9 - Gunadala",
        "center_lat": 16.5260,
        "center_lng": 80.6650,
        "depot_name": "Gunadala Station Depot",
        "scheduled_start_time": "06:30 AM",
        "assigned_truck_id": "AP-16-TX-9015",
        "assigned_driver": "G. Krishna Mohan",
        "total_households": 14100,
        "coords": [
            [80.6540, 16.5160], [80.6760, 16.5170], [80.6770, 16.5360],
            [80.6550, 16.5350], [80.6540, 16.5160]
        ]
    },
    {
        "id": 10,
        "name": "Ward 10 - Autonagar",
        "center_lat": 16.4900,
        "center_lng": 80.6850,
        "depot_name": "Autonagar Waste Transfer Station",
        "scheduled_start_time": "06:00 AM",
        "assigned_truck_id": "AP-16-TX-1099",
        "assigned_driver": "Ch. Appa Rao",
        "total_households": 18500,
        "coords": [
            [80.6750, 16.4780], [80.6960, 16.4790], [80.6970, 16.5010],
            [80.6760, 16.5000], [80.6750, 16.4780]
        ]
    }
]

def seed_database():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear existing data for fresh clean seed
    cursor.execute("DELETE FROM wards")
    cursor.execute("DELETE FROM schedules")
    cursor.execute("DELETE FROM vehicle_logs")
    cursor.execute("DELETE FROM maintenance_alerts")
    cursor.execute("DELETE FROM complaints")
    cursor.execute("DELETE FROM waste_metrics")
    cursor.execute("DELETE FROM driver_performance")

    # 1. Insert Wards
    for w in VIJAYAWADA_WARDS:
        geom_json = json.dumps({
            "type": "Polygon",
            "coordinates": [w["coords"]]
        })
        cursor.execute("""
            INSERT INTO wards (id, name, geom, center_lat, center_lng, depot_name, scheduled_start_time, assigned_truck_id, assigned_driver, total_households)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w["id"], w["name"], geom_json, w["center_lat"], w["center_lng"],
            w["depot_name"], w["scheduled_start_time"], w["assigned_truck_id"],
            w["assigned_driver"], w["total_households"]
        ))

    # 2. Insert Schedules
    schedules_data = [
        (1, 1, "AP-16-TX-1001", "S. Rambabu", "One Town Morning Loop", "06:00 AM", "10:30 AM", 85, 82, "COMPLETED"),
        (2, 2, "AP-16-TX-2004", "K. Venkatesh", "Bhavanipuram Sector A-D", "06:00 AM", "11:00 AM", 90, 88, "COMPLETED"),
        (3, 3, "AP-16-TX-3112", "M. Satyanarayana", "Vidyadharapuram Main Corridor", "06:15 AM", "11:15 AM", 75, 71, "COMPLETED"),
        (4, 4, "AP-16-TX-4040", "T. Nageswara Rao", "Governorpet Commercial Grid", "06:30 AM", "11:30 AM", 80, 78, "COMPLETED"),
        (5, 5, "AP-16-TX-5091", "B. Sivaji", "Suryaraopet Residential Circuit", "06:00 AM", "10:45 AM", 82, 68, "IN_PROGRESS"),
        (6, 6, "AP-16-TX-6120", "D. Anji Reddy", "Moghalrajpuram Hill Slopes", "06:30 AM", "11:45 AM", 65, 62, "COMPLETED"),
        (7, 7, "AP-16-TX-4521", "V. Suresh Babu", "Benz Circle - MG Road Corridor", "06:00 AM", "11:30 AM", 95, 61, "REROUTED_DELAYED"),
        (8, 8, "AP-16-TX-8022", "P. Srinivasa Rao", "Patamata Colony Loops", "06:00 AM", "11:00 AM", 100, 74, "IN_PROGRESS"),
        (9, 9, "AP-16-TX-9015", "G. Krishna Mohan", "Gunadala Hill & NH Route", "06:30 AM", "11:30 AM", 78, 75, "COMPLETED"),
        (10, 10, "AP-16-TX-1099", "Ch. Appa Rao", "Autonagar Industrial & Mixed", "06:00 AM", "11:00 AM", 110, 106, "COMPLETED")
    ]
    cursor.executemany("""
        INSERT INTO schedules (id, ward_id, truck_id, driver_name, route_name, start_time, expected_end_time, scheduled_stops, recorded_stops, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, schedules_data)

    # 3. Insert Maintenance & Breakdown Alert ("The truck is changed due to some issue")
    cursor.execute("""
        INSERT INTO maintenance_alerts (
            truck_id, driver_name, ward_id, ward_name, alert_type, issue_description,
            replacement_truck_id, reroute_active, location_landmark, timestamp, status
        ) VALUES (
            'AP-16-TX-4521', 'V. Suresh Babu', 7, 'Ward 7 - Benz Circle',
            'HYDRAULIC_COMPACTOR_BREAKDOWN',
            'Severe hydraulic compactor hose failure near Benz Circle Flyover service lane at 07:15 AM. Truck halted to prevent oil leak.',
            'AP-16-TY-1088', 1, 'Near Jyothi Mahal, Benz Circle Service Rd', '2026-10-27 07:22:00', 'ACTIVE_REROUTE'
        )
    """)
    cursor.execute("""
        INSERT INTO maintenance_alerts (
            truck_id, driver_name, ward_id, ward_name, alert_type, issue_description,
            replacement_truck_id, reroute_active, location_landmark, timestamp, status
        ) VALUES (
            'AP-16-TX-5091', 'B. Sivaji', 5, 'Ward 5 - Suryaraopet',
            'FLAT_TYRE_PUNCTURE',
            'Rear left dual-tyre puncture near Pushpa Hotel Centre. Quick repair completed within 25 minutes; original truck resumed.',
            NULL, 0, 'Pushpa Hotel Centre, Suryaraopet', '2026-10-27 08:05:00', 'RESOLVED'
        )
    """)

    # 4. Insert Citizen Complaints (Initial unverified + verified + duplicate)
    complaints_data = [
        (
            "CT-VIJ-2026-1041", 7, "Ward 7 - Benz Circle", "K. Rama Mohan", "+91 98480 12345",
            "D.No 40-1-52, Near D-Mart, Benz Circle", 16.4985, 80.6558, "ORGANIC",
            "2026-10-27", "06:00 AM - 09:00 AM",
            "Waste collection truck completely skipped our apartment lane today. Usually arrives at 7:15 AM.",
            None, "UNVERIFIED", None, None, None, None,
            "2026-10-27 08:30:15", "2026-10-27 08:30:15"
        ),
        (
            "CT-VIJ-2026-1042", 7, "Ward 7 - Benz Circle", "Smt. Annapurna", "+91 94401 56789",
            "Plot 18, Behind Jyothi Convention, Benz Circle", 16.5002, 80.6545, "MIXED",
            "2026-10-27", "06:00 AM - 09:00 AM",
            "Garbage bins are overflowing outside the complex. Truck was parked with hazard lights on and then left.",
            None, "UNVERIFIED", None, None, None, None,
            "2026-10-27 08:45:00", "2026-10-27 08:45:00"
        ),
        (
            "CT-VIJ-2026-0985", 8, "Ward 8 - Patamata", "N. Chandrasekhar", "+91 98852 99881",
            "High School Road, Near Rythu Bazar, Patamata", 16.4930, 80.6720, "RECYCLABLE",
            "2026-10-27", "06:00 AM - 09:00 AM",
            "Dry recyclable cartons and plastic bags left uncollected for the 2nd day consecutively.",
            None, "VERIFIED_MISSED",
            "Cross-referenced GPS telemetry. Vehicle AP-16-TX-8022 skipped High School Road due to unauthorized parked construction truck.",
            "Operator VMC-04", "Backup Tipper AP-16-TZ-0021 dispatched for catch-up pickup at 11:30 AM", None,
            "2026-10-27 07:50:00", "2026-10-27 09:10:00"
        ),
        (
            "CT-VIJ-2026-0988", 8, "Ward 8 - Patamata", "M. Bhavani Shankar", "+91 91234 56780",
            "Adjacent to Rythu Bazar Gate 2, Patamata", 16.4932, 80.6724, "RECYCLABLE",
            "2026-10-27", "06:00 AM - 09:00 AM",
            "Garbage not picked up on High School road near Rythu Bazar.",
            None, "DUPLICATE",
            "Verified as duplicate of complaint CT-VIJ-2026-0985. Merged into active ticket.",
            "Operator VMC-04", "Linked to CT-VIJ-2026-0985 dispatch", "CT-VIJ-2026-0985",
            "2026-10-27 08:12:00", "2026-10-27 09:12:00"
        ),
        (
            "CT-VIJ-2026-0910", 5, "Ward 5 - Suryaraopet", "Dr. K. Srinivas", "+91 98499 44332",
            "Governorpet-Suryaraopet Border, Karl Marx Road", 16.5140, 80.6390, "LANDFILL",
            "2026-10-26", "06:00 AM - 09:00 AM",
            "Non-recyclable sanitary waste was not cleared from community dump point.",
            None, "RESOLVED",
            "GPS inspection confirmed collection delay of 45 minutes due to flat tyre. Special clearance team completed clearance at 10:15 AM.",
            "Operator VMC-02", "Clearance photo uploaded and verified. Case closed.", None,
            "2026-10-26 08:20:00", "2026-10-26 10:30:00"
        ),
        (
            "CT-VIJ-2026-1050", 1, "Ward 1 - One Town", "Abdul Kareem", "+91 93930 77112",
            "Panja Centre, Near Kanyaka Parameswari Temple", 16.5170, 80.6130, "ORGANIC",
            "2026-10-27", "06:00 AM - 09:00 AM",
            "Vegetable waste from temple street shops not cleared during morning shift.",
            None, "UNVERIFIED", None, None, None, None,
            "2026-10-27 09:20:00", "2026-10-27 09:20:00"
        )
    ]
    cursor.executemany("""
        INSERT INTO complaints (
            tracking_id, ward_id, ward_name, resident_name, contact_phone, address,
            latitude, longitude, waste_category, missed_date, missed_time_slot,
            description, photo_url, status, operator_notes, reviewed_by,
            resolution_action, is_duplicate_of, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, complaints_data)

    # 5. Insert Waste Segregation Metrics (Organic, Recyclable, Landfill)
    waste_records = [
        (1, "Ward 1 - One Town", "2026-10-27", 18.4, 7.2, 3.1, 89.2),
        (2, "Ward 2 - Bhavanipuram", "2026-10-27", 21.0, 9.5, 3.8, 88.7),
        (3, "Ward 3 - Vidyadharapuram", "2026-10-27", 16.2, 6.8, 2.9, 88.5),
        (4, "Ward 4 - Governorpet", "2026-10-27", 19.8, 11.4, 4.2, 87.9),
        (5, "Ward 5 - Suryaraopet", "2026-10-27", 15.5, 7.1, 3.6, 85.8),
        (6, "Ward 6 - Moghalrajpuram", "2026-10-27", 14.2, 6.5, 2.4, 89.6),
        (7, "Ward 7 - Benz Circle", "2026-10-27", 17.5, 9.8, 5.1, 84.1),
        (8, "Ward 8 - Patamata", "2026-10-27", 22.4, 10.2, 4.9, 86.9),
        (9, "Ward 9 - Gunadala", "2026-10-27", 18.9, 7.6, 3.5, 88.3),
        (10, "Ward 10 - Autonagar", "2026-10-27", 24.5, 14.8, 6.7, 85.4)
    ]
    cursor.executemany("""
        INSERT INTO waste_metrics (ward_id, ward_name, date, organic_tons, recyclable_tons, landfill_tons, segregation_compliance_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, waste_records)

    # 6. Insert Driver Performance
    drivers_data = [
        ("S. Rambabu", "AP-16-TX-1001", "Ward 1 - One Town", 96.5, 96.4, 1, 4.8, "ON_DUTY", "+91 98481 00001"),
        ("K. Venkatesh", "AP-16-TX-2004", "Ward 2 - Bhavanipuram", 97.8, 97.7, 0, 4.9, "ON_DUTY", "+91 98481 00002"),
        ("M. Satyanarayana", "AP-16-TX-3112", "Ward 3 - Vidyadharapuram", 94.6, 94.6, 0, 4.7, "ON_DUTY", "+91 98481 00003"),
        ("T. Nageswara Rao", "AP-16-TX-4040", "Ward 4 - Governorpet", 97.5, 97.5, 0, 4.8, "ON_DUTY", "+91 98481 00004"),
        ("B. Sivaji", "AP-16-TX-5091", "Ward 5 - Suryaraopet", 83.0, 82.9, 1, 4.2, "DELAYED_PUNCTURE", "+91 98481 00005"),
        ("D. Anji Reddy", "AP-16-TX-6120", "Ward 6 - Moghalrajpuram", 95.4, 95.3, 0, 4.7, "COMPLETED", "+91 98481 00006"),
        ("V. Suresh Babu", "AP-16-TX-4521", "Ward 7 - Benz Circle", 64.2, 64.2, 3, 3.8, "BREAKDOWN_STANDBY_DEPLOYED", "+91 98481 00007"),
        ("P. Srinivasa Rao", "AP-16-TX-8022", "Ward 8 - Patamata", 74.0, 74.0, 2, 4.1, "ON_DUTY", "+91 98481 00008"),
        ("G. Krishna Mohan", "AP-16-TX-9015", "Ward 9 - Gunadala", 96.1, 96.1, 0, 4.8, "COMPLETED", "+91 98481 00009"),
        ("Ch. Appa Rao", "AP-16-TX-1099", "Ward 10 - Autonagar", 96.4, 96.3, 0, 4.8, "ON_DUTY", "+91 98481 00010"),
        ("K. Somaraju (Standby)", "AP-16-TY-1088", "Ward 7 - Benz Circle (Re-routed)", 91.0, 85.0, 0, 4.6, "ACTIVE_REROUTE", "+91 98481 00099")
    ]
    cursor.executemany("""
        INSERT INTO driver_performance (driver_name, vehicle_id, assigned_ward, on_time_score, completion_pct, complaints_count, rating, status, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, drivers_data)

    # 7. Insert Vehicle GPS breadcrumbs along Vijayawada routes
    # E.g. for Benz Circle route (AP-16-TX-4521 broke down, AP-16-TY-1088 taking re-route)
    vehicle_logs_data = [
        ("AP-16-TX-4521", "V. Suresh Babu", 7, "2026-10-27 06:00:00", 16.4910, 80.6490, 18.5, "DEPOT_DEPARTURE", "Departed Bandar Road Transit Station"),
        ("AP-16-TX-4521", "V. Suresh Babu", 7, "2026-10-27 06:30:00", 16.4950, 80.6520, 12.0, "PICKUP_STOP", "Completed MG Road block 1-4"),
        ("AP-16-TX-4521", "V. Suresh Babu", 7, "2026-10-27 07:05:00", 16.4980, 80.6550, 8.0, "PICKUP_STOP", "Collected commercial bins near Benz Circle"),
        ("AP-16-TX-4521", "V. Suresh Babu", 7, "2026-10-27 07:15:00", 16.4990, 80.6560, 0.0, "MECHANICAL_BREAKDOWN", "Hydraulic packer burst; alert triggered"),
        ("AP-16-TY-1088", "K. Somaraju", 7, "2026-10-27 07:35:00", 16.4900, 80.6850, 32.0, "STANDBY_DISPATCH", "Backup vehicle deployed from Autonagar"),
        ("AP-16-TY-1088", "K. Somaraju", 7, "2026-10-27 07:55:00", 16.4995, 80.6570, 14.0, "REROUTE_ACTIVE", "Took over remaining Benz Circle residential circuit"),
        ("AP-16-TX-8022", "P. Srinivasa Rao", 8, "2026-10-27 06:00:00", 16.4880, 80.6800, 20.0, "DEPOT_DEPARTURE", "Departed Autonagar Station for Patamata"),
        ("AP-16-TX-8022", "P. Srinivasa Rao", 8, "2026-10-27 07:10:00", 16.4925, 80.6705, 5.0, "OBSTRUCTION_BYPASS", "High School Rd blocked by cement lorry; skipped lane")
    ]
    cursor.executemany("""
        INSERT INTO vehicle_logs (truck_id, driver_name, ward_id, timestamp, lat, lng, speed_kmh, event, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, vehicle_logs_data)

    conn.commit()
    conn.close()
    print("Seed data successfully inserted into CleanTrack database.")

if __name__ == "__main__":
    seed_database()
