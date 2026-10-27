<<<<<<< HEAD
# CleanTrack: Ward-Level Waste Pickup Reliability Tracker

**CleanTrack** is a modern geospatial waste monitoring and reliability tracking platform built for municipal corporations (customized for **Vijayawada, Andhra Pradesh**). It correlates municipal schedules against GPS logs and geotagged citizen complaints with operator verification workflows.

---

## 🌟 Key Features

1. **Vijayawada Geospatial Operations & Re-route Map (Leaflet)**:
   - Full polygon coverage of 10 Vijayawada municipal wards (One Town, Bhavanipuram, Governorpet, Suryaraopet, Benz Circle, Patamata, Gunadala, Autonagar, etc.).
   - Starting pickup depots with scheduled start times (**06:00 AM**, **06:15 AM**, **06:30 AM**).
   - Dynamic **Re-Route visualization** showing how routes are updated when trucks experience issues.
   - **Maintenance & Breakdown Alerts**: Displays real-time alerts when a vehicle is changed (e.g., Truck AP-16-TX-4521 hydraulic failure replaced with Standby AP-16-TY-1088).
   - **Recurring Failure Hotspots**: Flagged areas with frequent delays and citizen complaints.

2. **Citizen Complaint Module (No Login Required)**:
   - Residents can file missed waste pickup reports directly without creating an account or logging in.
   - Form supports ward auto-selection, Leaflet pin-drop coordinates, street address, waste category, and descriptions.
   - Every complaint generates a unique Tracking ID (e.g., `CT-VIJ-2026-XXXX`).
   - **Complaints are treated as UNVERIFIED** until an operator cross-references vehicle GPS telemetry.

3. **Complaint Tracking & Audit Timeline**:
   - Public tracking page for residents to monitor their report.
   - 3-step audit timeline: `Complaint Submitted` ➔ `Operator GPS Verification` ➔ `Resolution Action`.

4. **Operator Verification Queue**:
   - Municipal operators review citizen claims side-by-side with vehicle GPS telemetry and collection timestamps.
   - Actions to **Verify Missed Pickup**, **Mark Duplicate**, or **Mark Resolved**.

5. **Waste Segregation Tracking**:
   - Tracks daily collected waste organized into:
     - 🍏 **Organic Waste** (Wet / Kitchen / Compostable)
     - 📦 **Recyclable Waste** (Dry / Plastics / Paper)
     - 🗑️ **Landfill Waste** (Non-recyclable / Sanitary / Inert)
   - Visual proportion bar and ward-level segregation compliance rates (%).

6. **Driver Performance & Fleet Leaderboard**:
   - Driver on-time arrival rate, route completion %, citizen complaint count, ratings, and vehicle duty status.

7. **Weekly Ward-Level Summary & Export (Pandas)**:
   - Automated aggregation of schedules, completed stops, complaints, and waste metrics.
   - **CSV Export** button powered by Pandas backend.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Leaflet, OpenStreetMap, Modern Vanilla CSS (Green & White municipal design)
- **Backend**: Python 3.14, FastAPI, Uvicorn, Pydantic
- **Data Processing**: Pandas
- **Database**: PostgreSQL with PostGIS (Compatible schema provided in `schema.sql` and SQLite local engine)

---

## 🚀 How to Run

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Launch the Application
```bash
python run.py
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

- Interactive API Documentation: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
- Automated Test Suite: `python backend/test_api.py`

---

## 📂 Project Structure

```
CleanTrack/
├── backend/
│   ├── app.py                # FastAPI endpoints & static file serving
│   ├── database.py           # Database engine & table definitions
│   ├── models.py             # Pydantic schemas (Complaints, Reviews, Alerts)
│   ├── seed_data.py          # Real Vijayawada wards & operational data
│   ├── analytics.py          # Pandas reliability scoring & CSV export
│   └── test_api.py           # Comprehensive API verification test suite
├── frontend/
│   ├── index.html            # HTML entry point (Leaflet, React 18, Babel)
│   ├── app.jsx               # React frontend component & tabs
│   └── style.css             # Green (#10B981) and White design system
├── schema.sql                # PostgreSQL + PostGIS production DDL
├── requirements.txt          # Python dependencies
├── run.py                    # One-command application launcher
└── README.md
```
=======
# CleanTrack
CleanTrack is a ward-level waste pickup reliability tracker that helps municipalities monitor collection performance, track citizen complaints, identify recurring failure hotspots, and manage route disruptions through a centralized dashboard.
>>>>>>> 6c82116766ebcc30750e36a4d867b89f17712d7c
