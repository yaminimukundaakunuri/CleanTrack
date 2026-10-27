const { useState, useEffect, useRef } = React;

function CleanTrackApp() {
  const [activeTab, setActiveTab] = useState("map");
  const [mapMode, setMapMode] = useState("tiles"); // 'tiles' (Leaflet OSM) or 'schematic' (SVG vector)
  const [tileError, setTileError] = useState(false);
  const [schematicFocus, setSchematicFocus] = useState("city"); // 'city', 'benz_circle', 'patamata'
  
  const [wards, setWards] = useState([]);
  const [reliabilityScores, setReliabilityScores] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [wasteData, setWasteData] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  
  // Complaint Submission State (No Login Required)
  const [formData, setFormData] = useState({
    ward_id: 7,
    resident_name: "",
    contact_phone: "",
    address: "Near D-Mart, Benz Circle, Vijayawada",
    latitude: 16.4985,
    longitude: 80.6558,
    waste_category: "ORGANIC",
    missed_date: "2026-10-27",
    missed_time_slot: "06:00 AM - 09:00 AM",
    description: "Morning collection truck skipped our residential street completely."
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Tracking State
  const [trackingIdInput, setTrackingIdInput] = useState("CT-VIJ-2026-1041");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  // Operator Review Modal State
  const [reviewModalComplaint, setReviewModalComplaint] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: "VERIFIED_MISSED",
    operator_notes: "Cross-checked vehicle GPS logs. Truck AP-16-TX-4521 had mechanical breakdown at Benz Circle and did not reach this sector.",
    resolution_action: "Dispatched standby compacting truck AP-16-TY-1088 for clearance at 11:15 AM",
    is_duplicate_of: ""
  });
  const [queueFilter, setQueueFilter] = useState("ALL");

  // Maintenance Modal State
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({
    vehicle_id: "AP-16-TX-8022",
    driver_name: "P. Srinivasa Rao",
    ward_id: 8,
    alert_type: "ENGINE_OVERHEAT",
    issue_description: "Coolant temperature spike on Bandar Road. Pulling over for standby transfer.",
    replacement_vehicle_id: "AP-16-TZ-0021",
    location_landmark: "Near Benz Circle Flyover pillar 22",
    status: "ACTIVE"
  });

  const [selectedWard, setSelectedWard] = useState(null);
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const mapMarkersLayer = useRef(null);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [wRes, rRes, routesRes, alertsRes, spotsRes, wasteRes, drivRes, compRes] = await Promise.all([
        fetch("/api/wards").then(r => r.json()),
        fetch("/api/reliability-scores").then(r => r.json()),
        fetch("/api/routes").then(r => r.json()),
        fetch("/api/maintenance-alerts").then(r => r.json()),
        fetch("/api/hotspots").then(r => r.json()),
        fetch("/api/waste-segregation").then(r => r.json()),
        fetch("/api/driver-performance").then(r => r.json()),
        fetch("/api/complaints").then(r => r.json())
      ]);

      setWards(wRes);
      setReliabilityScores(rRes);
      setRoutes(routesRes);
      setMaintenanceAlerts(alertsRes);
      setHotspots(spotsRes);
      setWasteData(wasteRes);
      setDrivers(drivRes);
      setComplaints(compRes);

      if (rRes && rRes.length > 0) {
        setSelectedWard(rRes[6] || rRes[0]); // default to Ward 7 (Benz Circle)
      }
    } catch (err) {
      console.error("Failed to fetch initial CleanTrack data:", err);
    }
  };

  // Leaflet Map Lifecycle Management
  useEffect(() => {
    if (activeTab === "map" && mapMode === "tiles" && mapRef.current) {
      // Check if Leaflet L global is loaded
      if (typeof L === "undefined") {
        console.warn("Leaflet global object 'L' not found; switching to Vector Schematic Map.");
        setMapMode("schematic");
        return;
      }

      // Cleanup prior instance if it exists
      if (leafletMapInstance.current) {
        try {
          leafletMapInstance.current.remove();
        } catch (e) {
          console.warn("Map remove warning:", e);
        }
        leafletMapInstance.current = null;
      }
      if (mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }

      try {
        const map = L.map(mapRef.current, {
          center: [16.5080, 80.6480],
          zoom: 13,
          zoomControl: true,
          attributionControl: true
        });

        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors | CleanTrack VMC'
        });

        tileLayer.on("tileerror", () => {
          console.warn("OpenStreetMap tile error detected; schematic mode available.");
          setTileError(true);
        });

        tileLayer.addTo(map);

        mapMarkersLayer.current = L.layerGroup().addTo(map);
        leafletMapInstance.current = map;

        // Ensure proper layout recalculation after container mount
        setTimeout(() => {
          if (leafletMapInstance.current) {
            leafletMapInstance.current.invalidateSize();
          }
        }, 150);
        setTimeout(() => {
          if (leafletMapInstance.current) {
            leafletMapInstance.current.invalidateSize();
          }
        }, 500);

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(lat.toFixed(5)),
            longitude: parseFloat(lng.toFixed(5)),
            address: `Geotagged Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`
          }));
        });

        renderMapLayers();
      } catch (err) {
        console.error("Leaflet setup error, falling back to schematic map:", err);
        setMapMode("schematic");
      }
    }

    return () => {
      if (leafletMapInstance.current) {
        try {
          leafletMapInstance.current.remove();
        } catch (e) {}
        leafletMapInstance.current = null;
      }
    };
  }, [activeTab, mapMode]);

  // Re-render layers when data changes
  useEffect(() => {
    if (activeTab === "map" && mapMode === "tiles" && leafletMapInstance.current) {
      renderMapLayers();
    }
  }, [wards, reliabilityScores, routes, hotspots, activeTab, mapMode]);

  const renderMapLayers = () => {
    if (!leafletMapInstance.current || !mapMarkersLayer.current || typeof L === "undefined") return;
    const map = leafletMapInstance.current;
    const layer = mapMarkersLayer.current;
    layer.clearLayers();

    // 1. Draw Ward Polygons
    if (wards && wards.length > 0) {
      wards.forEach(ward => {
        const scoreObj = (reliabilityScores || []).find(s => s.ward_id === ward.id) || {};
        const score = scoreObj.reliability_score || 85;
        
        let fillColor = "#10B981"; // Green (High Reliability)
        if (score < 75) fillColor = "#EF4444"; // Red (Critical)
        else if (score < 90) fillColor = "#F59E0B"; // Amber

        if (ward.geom && ward.geom.coordinates) {
          const latLngs = ward.geom.coordinates[0].map(c => [c[1], c[0]]);
          const polygon = L.polygon(latLngs, {
            color: fillColor,
            weight: 2,
            opacity: 0.9,
            fillColor: fillColor,
            fillOpacity: 0.22
          }).addTo(layer);

          polygon.bindTooltip(`
            <div style="font-family: Inter, sans-serif; font-size: 13px;">
              <strong>${ward.name}</strong><br/>
              Reliability Score: <strong>${score}%</strong> (${scoreObj.status_text || 'Active'})<br/>
              Starting Depot: ${ward.depot_name}<br/>
              Pickup Start Time: <strong>${ward.scheduled_start_time}</strong><br/>
              Assigned Truck: ${ward.assigned_truck_id} (${ward.assigned_driver})
            </div>
          `);

          polygon.on("click", () => {
            setSelectedWard(scoreObj);
            setFormData(prev => ({
              ...prev,
              ward_id: ward.id,
              address: `Near Landmark in ${ward.name}`
            }));
          });
        }
      });
    }

    // 2. Draw Pickup Starting Points & Depots
    if (wards && wards.length > 0) {
      wards.forEach(ward => {
        const depotIcon = L.divIcon({
          className: 'ct-depot-marker',
          html: `<div style="background: #047857; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏁</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const depotMarker = L.marker([ward.center_lat, ward.center_lng], { icon: depotIcon }).addTo(layer);
        depotMarker.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <h4 style="margin: 0 0 4px 0; color: #064E3B; font-size: 14px;">🚩 Pickup Hub: ${ward.depot_name}</h4>
            <p style="margin: 0; font-size: 12px; color: #334155;"><strong>Ward:</strong> ${ward.name}</p>
            <p style="margin: 0; font-size: 12px; color: #334155;"><strong>Pickup Start Time:</strong> <span style="background: #ecfdf5; color: #047857; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${ward.scheduled_start_time}</span></p>
            <p style="margin: 0; font-size: 12px; color: #334155;"><strong>Assigned Vehicle:</strong> ${ward.assigned_truck_id}</p>
            <p style="margin: 0; font-size: 12px; color: #334155;"><strong>Driver:</strong> ${ward.assigned_driver}</p>
          </div>
        `);
      });
    }

    // 3. Draw Routes & Re-route Map of Vijayawada
    if (routes && routes.length > 0) {
      routes.forEach(rt => {
        // Original Path
        if (rt.original_path && rt.original_path.length > 0) {
          const isBroken = rt.status === "REROUTED_ACTIVE";
          const polyline = L.polyline(rt.original_path, {
            color: isBroken ? "#94A3B8" : "#10B981",
            weight: 4,
            dashArray: isBroken ? "6, 8" : null,
            opacity: isBroken ? 0.75 : 0.95
          }).addTo(layer);

          polyline.bindTooltip(`
            <strong>${rt.route_name}</strong><br/>
            Start Time: ${rt.pickup_start_time}<br/>
            Status: ${rt.status}
          `);
        }

        // Re-routed Path (Active for Benz Circle breakdown)
        if (rt.rerouted_path && rt.rerouted_path.length > 0) {
          const rerouteLine = L.polyline(rt.rerouted_path, {
            color: "#059669",
            weight: 5,
            opacity: 1
          }).addTo(layer);

          rerouteLine.bindTooltip(`
            <div style="font-family: Inter, sans-serif;">
              <strong style="color: #047857;">🔄 ACTIVE RE-ROUTE: ${rt.ward_name}</strong><br/>
              Replacement Truck: AP-16-TY-1088<br/>
              Detour via: Bandar Road Service Lane<br/>
              Reason: ${rt.reroute_reason}
            </div>
          `);
        }

        // Vehicle Breakdown Marker
        if (rt.breakdown_point) {
          const breakdownIcon = L.divIcon({
            className: 'ct-breakdown-icon',
            html: `<div style="background: #EF4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 2px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8); animation: pulse-ring 1.5s infinite;">⚠️</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const bdMarker = L.marker([rt.breakdown_point.lat, rt.breakdown_point.lng], { icon: breakdownIcon }).addTo(layer);
          bdMarker.bindPopup(`
            <div style="font-family: Inter, sans-serif;">
              <h4 style="color: #DC2626; margin: 0 0 4px 0;">⚠️ ${rt.breakdown_point.title}</h4>
              <p style="font-size: 12px; margin: 0; color: #475569;">${rt.breakdown_point.desc}</p>
              <div style="margin-top: 6px; padding: 4px 8px; background: #FEF2F2; border-left: 3px solid #EF4444; font-size: 11px; color: #991B1B;">
                Re-route active with standby truck AP-16-TY-1088
              </div>
            </div>
          `);
        }
      });
    }

    // 4. Draw Recurring Failure Hotspot Pins
    if (hotspots && hotspots.length > 0) {
      hotspots.forEach(hs => {
        const hotspotIcon = L.divIcon({
          className: 'ct-hotspot-pin',
          html: `<div style="background: #DC2626; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.6);">📍</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const spotMarker = L.marker([hs.lat, hs.lng], { icon: hotspotIcon }).addTo(layer);
        spotMarker.bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 12px;">
            <h4 style="color: #B91C1C; margin: 0 0 4px 0;">🔥 Failure Hotspot: ${hs.ward_name}</h4>
            <p style="margin: 0;"><strong>Location:</strong> ${hs.landmark}</p>
            <p style="margin: 0;"><strong>Total Missed Reports:</strong> ${hs.total_reports} (${hs.verified_missed} Verified)</p>
            <p style="margin: 0; color: #64748B;"><strong>Evidence:</strong> ${hs.evidence_note}</p>
          </div>
        `);
      });
    }
  };

  // Focus Button Handlers (Functional in both Leaflet and Schematic modes)
  const handleFocusBenzCircle = () => {
    const bz = (reliabilityScores || []).find(s => s.ward_id === 7);
    if (bz) setSelectedWard(bz);

    if (mapMode === "tiles" && leafletMapInstance.current) {
      leafletMapInstance.current.flyTo([16.4990, 80.6560], 15, { duration: 1.2 });
    } else {
      setSchematicFocus("benz_circle");
    }
  };

  const handleFocusPatamata = () => {
    const pt = (reliabilityScores || []).find(s => s.ward_id === 8);
    if (pt) setSelectedWard(pt);

    if (mapMode === "tiles" && leafletMapInstance.current) {
      leafletMapInstance.current.flyTo([16.4930, 80.6720], 15, { duration: 1.2 });
    } else {
      setSchematicFocus("patamata");
    }
  };

  const handleResetCityView = () => {
    if (reliabilityScores && reliabilityScores.length > 0) {
      setSelectedWard(reliabilityScores[6] || reliabilityScores[0]);
    }

    if (mapMode === "tiles" && leafletMapInstance.current) {
      leafletMapInstance.current.flyTo([16.5080, 80.6480], 13, { duration: 1.0 });
    } else {
      setSchematicFocus("city");
    }
  };

  // Submit Complaint (No login required)
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissionResult(data);
        setTrackingIdInput(data.tracking_id);
        fetchInitialData();
      } else {
        alert(data.detail || "Failed to submit complaint. Please check inputs.");
      }
    } catch (err) {
      alert("Error submitting complaint: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Track Complaint by ID
  const handleTrackComplaint = async (codeToSearch) => {
    const code = codeToSearch || trackingIdInput;
    if (!code) return;
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const res = await fetch(`/api/complaints/${code.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setTrackedComplaint(data);
      } else {
        const err = await res.json();
        setTrackingError(err.detail || "Tracking ID not found.");
        setTrackedComplaint(null);
      }
    } catch (err) {
      setTrackingError("Failed to track complaint: " + err.message);
      setTrackedComplaint(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Submit Operator Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalComplaint) return;
    try {
      const res = await fetch(`/api/complaints/${reviewModalComplaint.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewForm.status,
          operator_notes: reviewForm.operator_notes,
          reviewed_by: "VMC Senior Operator",
          resolution_action: reviewForm.resolution_action,
          is_duplicate_of: reviewForm.is_duplicate_of || null
        })
      });
      if (res.ok) {
        setReviewModalComplaint(null);
        fetchInitialData();
      } else {
        alert("Failed to submit review");
      }
    } catch (err) {
      alert("Error saving review: " + err.message);
    }
  };

  // Submit New Maintenance Alert
  const handleCreateMaintenanceAlert = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/maintenance-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlertForm)
      });
      if (res.ok) {
        setShowMaintenanceModal(false);
        fetchInitialData();
      } else {
        alert("Failed to create maintenance alert");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const filteredComplaints = (complaints || []).filter(c => {
    if (queueFilter === "ALL") return true;
    return c.status === queueFilter;
  });

  return (
    <div className="ct-app">
      {/* Top Navigation Bar */}
      <header className="ct-navbar">
        <div className="ct-navbar-container">
          <div className="ct-brand">
            <div className="ct-logo-badge">♻️</div>
            <div>
              <div className="ct-brand-title">
                CleanTrack <span className="ct-brand-tag">Vijayawada VMC</span>
              </div>
              <div className="ct-brand-sub">Ward-Level Waste Pickup Reliability & Geospatial Monitoring</div>
            </div>
          </div>

          <div className="ct-header-metrics">
            <div className="ct-live-pill">
              <span className="ct-pulse-dot"></span>
              Fleet Active: 10/10 Wards
            </div>
            <div className="ct-live-pill">
              <span className="ct-pulse-dot warning"></span>
              1 Active Re-Route (Benz Circle)
            </div>
            <button
              className="ct-btn-primary"
              onClick={() => setActiveTab("complaint")}
            >
              📢 Report Missed Pickup
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="ct-nav-tabs-wrapper">
        <div className="ct-nav-tabs">
          <button
            className={`ct-tab-btn ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            🗺️ Live Route & Wards Map
          </button>
          <button
            className={`ct-tab-btn ${activeTab === "complaint" ? "active" : ""}`}
            onClick={() => setActiveTab("complaint")}
          >
            📝 Citizen Complaint Portal
          </button>
          <button
            className={`ct-tab-btn ${activeTab === "track" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("track");
              handleTrackComplaint();
            }}
          >
            🔍 Track Complaint Status
          </button>
          <button
            className={`ct-tab-btn ${activeTab === "operator" ? "active" : ""}`}
            onClick={() => setActiveTab("operator")}
          >
            🛡️ Operator Review Queue
            <span className="ct-tab-badge alert">
              {(complaints || []).filter(c => c.status === "UNVERIFIED").length} Unverified
            </span>
          </button>
          <button
            className={`ct-tab-btn ${activeTab === "waste" ? "active" : ""}`}
            onClick={() => setActiveTab("waste")}
          >
            🌱 Waste Segregation Breakdown
          </button>
          <button
            className={`ct-tab-btn ${activeTab === "drivers" ? "active" : ""}`}
            onClick={() => setActiveTab("drivers")}
          >
            🚚 Driver Performance & Fleet
          </button>
          <button
            className={`ct-tab-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            📊 Weekly Ward Summary & Export
          </button>
        </div>
      </nav>

      {/* Main App Body */}
      <main className="ct-main-content">
        {/* Maintenance / Breakdown Alert Notification */}
        {(maintenanceAlerts || []).filter(a => a.status === 'ACTIVE_REROUTE' || a.reroute_active === 1).map(alert => (
          <div key={alert.id} className="ct-maintenance-banner">
            <div className="ct-banner-left">
              <div className="ct-banner-icon">⚠️</div>
              <div>
                <div className="ct-banner-title">
                  FLEET MAINTENANCE ALERT: Truck {alert.truck_id} Breakdown in {alert.ward_name}
                </div>
                <div className="ct-banner-desc">
                  {alert.issue_description} — Standby Replacement Truck <strong>{alert.replacement_truck_id}</strong> deployed on dynamic re-route.
                </div>
              </div>
            </div>
            <button
              className="ct-banner-action-btn"
              onClick={handleFocusBenzCircle}
            >
              Focus Re-Route on Map
            </button>
          </div>
        ))}

        {/* TAB 1: LIVE MAP & ROUTES */}
        {activeTab === "map" && (
          <div>
            {/* Top Quick Stats Grid */}
            <div className="ct-stats-grid">
              <div className="ct-stat-card emerald">
                <div className="ct-stat-header">
                  <span className="ct-stat-label">City Reliability Index</span>
                  <span className="ct-stat-icon">📈</span>
                </div>
                <div className="ct-stat-val">88.4%</div>
                <div className="ct-stat-sub">Aggregated across 10 municipal wards</div>
              </div>
              <div className="ct-stat-card blue">
                <div className="ct-stat-header">
                  <span className="ct-stat-label">Pickup Completion</span>
                  <span className="ct-stat-icon">🚛</span>
                </div>
                <div className="ct-stat-val">858 / 900</div>
                <div className="ct-stat-sub">Stops completed today</div>
              </div>
              <div className="ct-stat-card amber">
                <div className="ct-stat-header">
                  <span className="ct-stat-label">Unverified Citizen Reports</span>
                  <span className="ct-stat-icon">⏳</span>
                </div>
                <div className="ct-stat-val">
                  {(complaints || []).filter(c => c.status === "UNVERIFIED").length}
                </div>
                <div className="ct-stat-sub">Pending operator GPS review</div>
              </div>
              <div className="ct-stat-card red">
                <div className="ct-stat-header">
                  <span className="ct-stat-label">Active Failure Hotspots</span>
                  <span className="ct-stat-icon">🔥</span>
                </div>
                <div className="ct-stat-val">{(hotspots || []).length}</div>
                <div className="ct-stat-sub">Clustered recurring delays</div>
              </div>
            </div>

            {/* Map Layout */}
            <div className="ct-map-layout">
              <div className="ct-map-card">
                <div className="ct-map-header">
                  <div className="ct-map-title">
                    <span>📍</span> Vijayawada Geospatial Waste Operations Map
                  </div>
                  
                  {/* Map Mode Switcher & Quick Zoom Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div className="ct-map-view-pills">
                      <button
                        type="button"
                        className={`ct-mode-btn ${mapMode === "tiles" ? "active" : ""}`}
                        onClick={() => setMapMode("tiles")}
                      >
                        🗺️ Street Map
                      </button>
                      <button
                        type="button"
                        className={`ct-mode-btn ${mapMode === "schematic" ? "active" : ""}`}
                        onClick={() => setMapMode("schematic")}
                      >
                        📐 Schematic Vector
                      </button>
                    </div>

                    <button
                      type="button"
                      className="ct-btn-secondary"
                      style={{ padding: "4px 9px", fontSize: "0.8rem", background: "#ECFDF5", borderColor: "#10B981", color: "#065F46", fontWeight: 700 }}
                      onClick={handleFocusBenzCircle}
                    >
                      🔄 Focus Re-Route (Benz Circle)
                    </button>
                    <button
                      type="button"
                      className="ct-btn-secondary"
                      style={{ padding: "4px 9px", fontSize: "0.8rem", background: "#FEF2F2", borderColor: "#EF4444", color: "#991B1B", fontWeight: 700 }}
                      onClick={handleFocusPatamata}
                    >
                      🔥 Focus Hotspot (Patamata)
                    </button>
                    <button
                      type="button"
                      className="ct-btn-secondary"
                      style={{ padding: "4px 9px", fontSize: "0.8rem" }}
                      onClick={handleResetCityView}
                    >
                      🏙️ Reset City View
                    </button>
                  </div>
                </div>

                {/* MODE 1: LEAFLET MAP WITH OPENSTREETMAP */}
                <div style={{ display: mapMode === "tiles" ? "block" : "none", position: "relative" }}>
                  <div id="leaflet-map" ref={mapRef}></div>
                  <div className="ct-map-banner-sim">
                    <span>🟢</span>
                    <span><strong>Simulated VMC Shift Progression:</strong> Routes & timestamps based on 10 municipal ward shift schedules.</span>
                  </div>
                </div>

                {/* MODE 2: INTERACTIVE VECTOR SCHEMATIC MAP (GUARANTEED FALLBACK) */}
                {mapMode === "schematic" && (
                  <VijayawadaSchematicMap
                    wards={wards}
                    reliabilityScores={reliabilityScores}
                    routes={routes}
                    hotspots={hotspots}
                    selectedWard={selectedWard}
                    onSelectWard={(w) => {
                      setSelectedWard(w);
                      setFormData(prev => ({
                        ...prev,
                        ward_id: w.ward_id || w.id,
                        address: `Near Landmark in ${w.ward_name || w.name}`
                      }));
                    }}
                    schematicFocus={schematicFocus}
                  />
                )}
              </div>

              {/* Sidebar: Ward Selector & Hotspots */}
              <div className="ct-map-sidebar">
                {selectedWard && (
                  <div className="ct-side-card" style={{ borderTop: `4px solid ${selectedWard.badge_color || '#10B981'}` }}>
                    <div className="ct-side-title">
                      <span>{selectedWard.ward_name}</span>
                      <span className="ct-ward-score" style={{ background: `${selectedWard.badge_color || '#10B981'}20`, color: selectedWard.badge_color || '#10B981' }}>
                        {selectedWard.reliability_score || 85}%
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div><strong>Pickup Starting Depot:</strong> {selectedWard.depot_name}</div>
                      <div><strong>Scheduled Start Time:</strong> <span style={{ color: "#047857", fontWeight: 700 }}>{selectedWard.scheduled_start_time}</span></div>
                      <div><strong>Assigned Truck:</strong> {selectedWard.assigned_truck_id}</div>
                      <div><strong>Driver:</strong> {selectedWard.assigned_driver}</div>
                      <div><strong>Stops Progress:</strong> {selectedWard.recorded_stops} / {selectedWard.scheduled_stops} ({selectedWard.completion_rate_pct}%)</div>
                      <div><strong>Unverified Reports:</strong> {selectedWard.unverified_complaints} | <strong>Confirmed Missed:</strong> {selectedWard.verified_missed_complaints}</div>
                      <div style={{ marginTop: "0.5rem" }}>
                        <button
                          className="ct-btn-secondary"
                          style={{ width: "100%", justifyContent: "center" }}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              ward_id: selectedWard.ward_id,
                              address: `Near Landmark in ${selectedWard.ward_name}`
                            }));
                            setActiveTab("complaint");
                          }}
                        >
                          Report Missed Pickup in this Ward
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="ct-side-card">
                  <div className="ct-side-title">
                    <span>Municipal Wards Overview</span>
                    <span style={{ fontSize: "0.8rem", color: "#64748B" }}>10 Wards</span>
                  </div>
                  <div className="ct-ward-list">
                    {(reliabilityScores || []).map(w => (
                      <div
                        key={w.ward_id}
                        className={`ct-ward-item ${selectedWard && selectedWard.ward_id === w.ward_id ? "selected" : ""}`}
                        onClick={() => setSelectedWard(w)}
                      >
                        <div className="ct-ward-name">{w.ward_name}</div>
                        <div className="ct-ward-score" style={{ background: `${w.badge_color}18`, color: w.badge_color }}>
                          {w.reliability_score}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ct-side-card">
                  <div className="ct-side-title">
                    <span>Recurring Failure Hotspots</span>
                    <span style={{ fontSize: "0.8rem", color: "#EF4444", fontWeight: 700 }}>{(hotspots || []).length} Flagged</span>
                  </div>
                  <div>
                    {(hotspots || []).map((hs, i) => (
                      <div key={i} className="ct-hotspot-item">
                        <div className="ct-hotspot-header">
                          <span>{hs.ward_name}</span>
                          <span>{hs.total_reports} Reports</span>
                        </div>
                        <div className="ct-hotspot-body">
                          <div><strong>Location:</strong> {hs.landmark}</div>
                          <div><strong>Evidence:</strong> {hs.evidence_note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CITIZEN COMPLAINT MODULE (NO LOGIN REQUIRED) */}
        {activeTab === "complaint" && (
          <div className="ct-form-card">
            <div className="ct-form-header">
              <div className="ct-form-title">Report Missed Waste Pickup</div>
              <div className="ct-form-sub">
                No resident login required. Geotag your location, describe the missed pickup, and track your complaint live.
              </div>
              <div style={{ margin: "1rem auto 0", display: "inline-block", background: "#FEF3C7", color: "#92400E", padding: "4px 12px", borderRadius: "9999px", fontSize: "0.82rem", fontWeight: 700 }}>
                ℹ️ Note: Citizen complaints are treated as <strong>UNVERIFIED</strong> until an operator cross-references vehicle GPS telemetry.
              </div>
            </div>

            {submissionResult ? (
              <div style={{ textAlign: "center", padding: "1.5rem", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "12px" }}>
                <div style={{ fontSize: "3rem" }}>✅</div>
                <h3 style={{ color: "#065F46", margin: "0.5rem 0" }}>Complaint Successfully Lodged!</h3>
                <p style={{ color: "#047857", fontSize: "0.95rem" }}>{submissionResult.message}</p>
                <div style={{ margin: "1.5rem 0", padding: "1rem", background: "white", borderRadius: "8px", border: "1.5px dashed #059669", display: "inline-block" }}>
                  <div style={{ fontSize: "0.85rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Your Unique Tracking ID</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#065F46", letterSpacing: "1px" }}>{submissionResult.tracking_id}</div>
                  <div style={{ marginTop: "6px", display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                    <span className="ct-chip unverified">Status: UNVERIFIED</span>
                    <button
                      type="button"
                      className="ct-btn-secondary"
                      style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                      onClick={() => {
                        navigator.clipboard.writeText(submissionResult.tracking_id);
                        alert("Copied Tracking ID to clipboard: " + submissionResult.tracking_id);
                      }}
                    >
                      📋 Copy ID
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    className="ct-btn-primary"
                    onClick={() => {
                      setActiveTab("track");
                      handleTrackComplaint(submissionResult.tracking_id);
                    }}
                  >
                    Track This Complaint Status
                  </button>
                  <button
                    className="ct-btn-secondary"
                    style={{ marginLeft: "0.75rem" }}
                    onClick={() => setSubmissionResult(null)}
                  >
                    Lodge Another Report
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitComplaint}>
                <div className="ct-form-grid">
                  <div className="ct-form-group">
                    <label className="ct-label">Municipal Ward</label>
                    <select
                      className="ct-select"
                      value={formData.ward_id}
                      onChange={(e) => setFormData({ ...formData, ward_id: parseInt(e.target.value) })}
                      required
                    >
                      {(wards || []).map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Waste Category Missed</label>
                    <select
                      className="ct-select"
                      value={formData.waste_category}
                      onChange={(e) => setFormData({ ...formData, waste_category: e.target.value })}
                      required
                    >
                      <option value="ORGANIC">Organic (Wet / Kitchen / Compostable)</option>
                      <option value="RECYCLABLE">Recyclable (Dry / Plastics / Paper)</option>
                      <option value="LANDFILL">Landfill (Non-recyclable / Sanitary / Inert)</option>
                      <option value="MIXED">Mixed / Bulk Municipal Waste</option>
                    </select>
                  </div>

                  <div className="ct-form-group full-width">
                    <label className="ct-label">Street Address & Landmark</label>
                    <input
                      type="text"
                      className="ct-input"
                      placeholder="e.g. Near D-Mart, 40-1-52, Benz Circle, Vijayawada"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Geotag Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="ct-input"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Geotag Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="ct-input"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Missed Date</label>
                    <input
                      type="date"
                      className="ct-input"
                      value={formData.missed_date}
                      onChange={(e) => setFormData({ ...formData, missed_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Scheduled Pickup Slot Missed</label>
                    <select
                      className="ct-select"
                      value={formData.missed_time_slot}
                      onChange={(e) => setFormData({ ...formData, missed_time_slot: e.target.value })}
                    >
                      <option value="06:00 AM - 09:00 AM">Morning Slot (06:00 AM - 09:00 AM)</option>
                      <option value="09:00 AM - 12:00 PM">Mid-day Slot (09:00 AM - 12:00 PM)</option>
                      <option value="02:00 PM - 05:00 PM">Afternoon Commercial Slot (02:00 PM - 05:00 PM)</option>
                    </select>
                  </div>

                  <div className="ct-form-group full-width">
                    <label className="ct-label">Description & What Happened</label>
                    <textarea
                      rows="3"
                      className="ct-textarea"
                      placeholder="Describe what happened: e.g. Bins were placed outside at 6:30 AM but truck bypassed street..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    ></textarea>
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Resident Name (Optional)</label>
                    <input
                      type="text"
                      className="ct-input"
                      placeholder="Optional (defaults to Anonymous Resident)"
                      value={formData.resident_name}
                      onChange={(e) => setFormData({ ...formData, resident_name: e.target.value })}
                    />
                  </div>

                  <div className="ct-form-group">
                    <label className="ct-label">Contact Phone (For SMS updates)</label>
                    <input
                      type="tel"
                      className="ct-input"
                      placeholder="e.g. +91 98480 12345"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
                  <button type="submit" className="ct-btn-primary" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Complaint (No Login Required)"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: TRACK COMPLAINT STATUS */}
        {activeTab === "track" && (
          <div className="ct-form-card" style={{ maxWidth: "860px" }}>
            <div className="ct-form-header">
              <div className="ct-form-title">Track Citizen Complaint Status</div>
              <div className="ct-form-sub">
                Enter your CleanTrack ticket tracking code to view live verification status and operator audit trail.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <input
                type="text"
                className="ct-input"
                style={{ fontSize: "1.1rem", fontWeight: 700 }}
                placeholder="Enter Tracking ID (e.g. CT-VIJ-2026-1041)"
                value={trackingIdInput}
                onChange={(e) => setTrackingIdInput(e.target.value)}
              />
              <button
                className="ct-btn-primary"
                onClick={() => handleTrackComplaint()}
                disabled={trackingLoading}
              >
                {trackingLoading ? "Searching..." : "Track Status"}
              </button>
            </div>

            {trackingError && (
              <div style={{ padding: "1rem", background: "#FEF2F2", color: "#991B1B", borderRadius: "8px", border: "1px solid #FECACA" }}>
                {trackingError}
              </div>
            )}

            {trackedComplaint && (
              <div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Tracking Reference</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0F172A" }}>{trackedComplaint.tracking_id}</div>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>{trackedComplaint.ward_name} &bull; {trackedComplaint.address}</div>
                    </div>
                    <div>
                      <span className={`ct-chip ${trackedComplaint.status.toLowerCase().replace('_', '-')}`}>
                        {trackedComplaint.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem", fontSize: "0.85rem" }}>
                    <div><strong>Waste Category:</strong> {trackedComplaint.waste_category}</div>
                    <div><strong>Missed Date:</strong> {trackedComplaint.missed_date} ({trackedComplaint.missed_time_slot})</div>
                    <div><strong>Resident:</strong> {trackedComplaint.resident_name}</div>
                    <div><strong>Submitted At:</strong> {trackedComplaint.created_at}</div>
                    <div style={{ gridColumn: "1 / -1" }}><strong>Complaint Description:</strong> {trackedComplaint.description}</div>
                  </div>
                </div>

                {/* Transparent Verification Timeline */}
                <h4 style={{ margin: "1.5rem 0 0.5rem 0", color: "#064E3B" }}>Verification & Resolution Timeline</h4>
                <div className="ct-timeline">
                  {trackedComplaint.timeline && trackedComplaint.timeline.map((step, idx) => (
                    <div key={idx} className="ct-timeline-item">
                      <div className={`ct-timeline-dot ${step.completed ? "done" : ""}`}>
                        {step.completed ? "✓" : idx + 1}
                      </div>
                      <div className="ct-timeline-content">
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <strong style={{ color: "#0F172A" }}>{step.step}</strong>
                          <span style={{ color: "#64748B" }}>{step.time}</span>
                        </div>
                        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem", color: "#334155" }}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {trackedComplaint.status === "UNVERIFIED" && (
                  <div style={{ marginTop: "1.25rem", padding: "0.85rem", background: "#FEF3C7", borderRadius: "8px", border: "1px solid #FDE68A", fontSize: "0.85rem", color: "#92400E" }}>
                    <strong>Operator Audit Pending:</strong> This complaint is currently marked as <em>UNVERIFIED</em>. Our municipal control room cross-references GPS breadcrumbs from the assigned collection vehicle before dispatching an emergency recovery unit.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OPERATOR REVIEW QUEUE */}
        {activeTab === "operator" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#064E3B" }}>Municipal Operator Review Queue</h2>
                <p style={{ fontSize: "0.85rem", color: "#64748B" }}>
                  Verify citizen complaints against actual GPS vehicle breadcrumbs, mark duplicates, and dispatch corrective action.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["ALL", "UNVERIFIED", "VERIFIED_MISSED", "DUPLICATE", "RESOLVED"].map(st => (
                  <button
                    key={st}
                    className={`ct-btn-secondary ${queueFilter === st ? "active" : ""}`}
                    style={queueFilter === st ? { background: "#059669", color: "white", borderColor: "#059669" } : {}}
                    onClick={() => setQueueFilter(st)}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="ct-table-card">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Ward & Address</th>
                    <th>Waste Type</th>
                    <th>Reported Date</th>
                    <th>Status</th>
                    <th>GPS Telemetry Evidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#64748B" }}>
                        No complaints match filter "{queueFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map(comp => (
                      <tr key={comp.id}>
                        <td>
                          <strong>{comp.tracking_id}</strong>
                          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{comp.resident_name}</div>
                        </td>
                        <td>
                          <div><strong>{comp.ward_name}</strong></div>
                          <div style={{ fontSize: "0.8rem", color: "#475569" }}>{comp.address}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{comp.waste_category}</span>
                        </td>
                        <td>
                          <div>{comp.missed_date}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{comp.missed_time_slot}</div>
                        </td>
                        <td>
                          <span className={`ct-chip ${comp.status.toLowerCase().replace('_', '-')}`}>
                            {comp.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: "260px", fontSize: "0.8rem" }}>
                          {comp.operator_notes ? (
                            <span style={{ color: "#334155" }}>{comp.operator_notes}</span>
                          ) : (
                            <span style={{ color: "#F59E0B", fontStyle: "italic" }}>Awaiting GPS cross-reference</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="ct-btn-secondary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                            onClick={() => {
                              setReviewModalComplaint(comp);
                              setReviewForm({
                                status: comp.status === "UNVERIFIED" ? "VERIFIED_MISSED" : comp.status,
                                operator_notes: comp.operator_notes || `GPS telemetry inspected for ${comp.ward_name}. Vehicle breadcrumbs confirmed route deviation at ${comp.missed_time_slot}.`,
                                resolution_action: comp.resolution_action || "Dispatched emergency collection vehicle to clear missed waste.",
                                is_duplicate_of: comp.is_duplicate_of || ""
                              });
                            }}
                          >
                            Review & Verify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: WASTE SEGREGATION BREAKDOWN */}
        {activeTab === "waste" && wasteData && (
          <div>
            <div className="ct-waste-hero">
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#064E3B", marginBottom: "0.25rem" }}>
                Vijayawada Municipal Waste Segregation Tracking
              </h2>
              <p style={{ fontSize: "0.88rem", color: "#64748B" }}>
                Daily collected tonnage categorized into <strong>Organic</strong> (wet), <strong>Recyclable</strong> (dry), and <strong>Landfill</strong> waste across all municipal wards.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", margin: "1.25rem 0" }}>
                <div style={{ background: "#ECFDF5", padding: "1rem", borderRadius: "8px", border: "1px solid #A7F3D0" }}>
                  <div style={{ fontSize: "0.8rem", color: "#047857", fontWeight: 700, textTransform: "uppercase" }}>Total Collected Today</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#064E3B" }}>{wasteData.summary.grand_total_tons} MT</div>
                  <div style={{ fontSize: "0.75rem", color: "#047857" }}>Avg Compliance: {wasteData.summary.avg_compliance_pct}%</div>
                </div>
                <div style={{ background: "#F0FDF4", padding: "1rem", borderRadius: "8px", border: "1px solid #BBF7D0" }}>
                  <div style={{ fontSize: "0.8rem", color: "#15803D", fontWeight: 700, textTransform: "uppercase" }}>Organic (Wet Waste)</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#166534" }}>{wasteData.summary.organic_tons} MT</div>
                  <div style={{ fontSize: "0.75rem", color: "#15803D" }}>{wasteData.summary.organic_pct}% of total waste</div>
                </div>
                <div style={{ background: "#EFF6FF", padding: "1rem", borderRadius: "8px", border: "1px solid #BFDBFE" }}>
                  <div style={{ fontSize: "0.8rem", color: "#1D4ED8", fontWeight: 700, textTransform: "uppercase" }}>Recyclable (Dry Waste)</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1E40AF" }}>{wasteData.summary.recyclable_tons} MT</div>
                  <div style={{ fontSize: "0.75rem", color: "#1D4ED8" }}>{wasteData.summary.recyclable_pct}% of total waste</div>
                </div>
                <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Landfill (Non-Recyclable)</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#334155" }}>{wasteData.summary.landfill_tons} MT</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>{wasteData.summary.landfill_pct}% sent to landfill</div>
                </div>
              </div>

              {/* Citywide Multi-bar */}
              <div className="ct-waste-bar-wrapper">
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                  Citywide Waste Distribution Proportion:
                </div>
                <div className="ct-waste-multi-bar">
                  <div className="ct-bar-segment organic" style={{ width: `${wasteData.summary.organic_pct}%` }}>
                    Organic ({wasteData.summary.organic_pct}%)
                  </div>
                  <div className="ct-bar-segment recyclable" style={{ width: `${wasteData.summary.recyclable_pct}%` }}>
                    Recyclable ({wasteData.summary.recyclable_pct}%)
                  </div>
                  <div className="ct-bar-segment landfill" style={{ width: `${wasteData.summary.landfill_pct}%` }}>
                    Landfill ({wasteData.summary.landfill_pct}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Ward-Level Breakdown Table */}
            <div className="ct-table-card">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Ward Name</th>
                    <th>Organic (Wet) MT</th>
                    <th>Recyclable (Dry) MT</th>
                    <th>Landfill (Inert) MT</th>
                    <th>Total MT</th>
                    <th>Segregation Compliance</th>
                    <th>Visual Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {(wasteData.wards || []).map(w => {
                    const total = (w.organic_tons + w.recyclable_tons + w.landfill_tons).toFixed(1);
                    const orgPct = Math.round((w.organic_tons / total) * 100);
                    const recPct = Math.round((w.recyclable_tons / total) * 100);
                    const lndPct = 100 - orgPct - recPct;
                    return (
                      <tr key={w.ward_id}>
                        <td><strong>{w.ward_name}</strong></td>
                        <td style={{ color: "#059669", fontWeight: 700 }}>{w.organic_tons} MT</td>
                        <td style={{ color: "#2563EB", fontWeight: 700 }}>{w.recyclable_tons} MT</td>
                        <td style={{ color: "#475569", fontWeight: 700 }}>{w.landfill_tons} MT</td>
                        <td><strong>{total} MT</strong></td>
                        <td>
                          <span style={{ fontWeight: 800, color: w.segregation_compliance_pct >= 88 ? "#059669" : "#D97706" }}>
                            {w.segregation_compliance_pct}%
                          </span>
                        </td>
                        <td style={{ width: "180px" }}>
                          <div style={{ height: "12px", borderRadius: "9999px", display: "flex", overflow: "hidden" }}>
                            <div style={{ width: `${orgPct}%`, background: "#10B981" }}></div>
                            <div style={{ width: `${recPct}%`, background: "#3B82F6" }}></div>
                            <div style={{ width: `${lndPct}%`, background: "#64748B" }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: DRIVER PERFORMANCE */}
        {activeTab === "drivers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#064E3B" }}>Waste Collection Fleet & Driver Performance</h2>
                <p style={{ fontSize: "0.85rem", color: "#64748B" }}>
                  Driver on-time arrival rate, completion compliance, and citizen complaint correlations.
                </p>
              </div>
              <button
                className="ct-btn-secondary"
                onClick={() => setShowMaintenanceModal(true)}
              >
                ⚙️ Log Vehicle Issue / Standby Swap
              </button>
            </div>

            <div className="ct-table-card">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>Vehicle Reg.</th>
                    <th>Assigned Ward</th>
                    <th>On-Time Score</th>
                    <th>Completion %</th>
                    <th>Complaints Flagged</th>
                    <th>Rating</th>
                    <th>Duty Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(drivers || []).map(driver => (
                    <tr key={driver.id}>
                      <td>
                        <strong>{driver.driver_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{driver.phone}</div>
                      </td>
                      <td><code>{driver.vehicle_id}</code></td>
                      <td>{driver.assigned_ward}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: driver.on_time_score >= 90 ? "#059669" : driver.on_time_score >= 75 ? "#D97706" : "#DC2626" }}>
                          {driver.on_time_score}%
                        </span>
                      </td>
                      <td>{driver.completion_pct}%</td>
                      <td>
                        <span style={{ fontWeight: 700, color: driver.complaints_count > 0 ? "#DC2626" : "#059669" }}>
                          {driver.complaints_count}
                        </span>
                      </td>
                      <td>⭐ {driver.rating}</td>
                      <td>
                        <span className="ct-chip" style={{
                          background: driver.status.includes('BREAKDOWN') ? '#FEE2E2' : driver.status.includes('ACTIVE') ? '#D1FAE5' : '#F1F5F9',
                          color: driver.status.includes('BREAKDOWN') ? '#991B1B' : driver.status.includes('ACTIVE') ? '#065F46' : '#334155'
                        }}>
                          {driver.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: WEEKLY WARD SUMMARY & PANDAS EXPORT */}
        {activeTab === "reports" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#064E3B" }}>Weekly Ward-Level Service Performance Summary</h2>
                <p style={{ fontSize: "0.85rem", color: "#64748B" }}>
                  Pandas data processing engine aggregating municipal schedules, recorded stops, citizen complaints, and waste segregation.
                </p>
              </div>
              <a
                href="/api/reports/weekly-summary/export"
                download
                className="ct-btn-primary"
                style={{ textDecoration: "none" }}
              >
                📥 Export Weekly Summary (CSV)
              </a>
            </div>

            <div className="ct-table-card">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Ward ID & Name</th>
                    <th>Households</th>
                    <th>Scheduled Pickups</th>
                    <th>Recorded Pickups</th>
                    <th>Unverified</th>
                    <th>Confirmed Missed</th>
                    <th>Reliability Score</th>
                    <th>Service Health</th>
                    <th>Waste Segregation</th>
                  </tr>
                </thead>
                <tbody>
                  {(reliabilityScores || []).map(score => (
                    <tr key={score.ward_id}>
                      <td><strong>{score.ward_name}</strong></td>
                      <td>{score.total_households.toLocaleString()}</td>
                      <td>{score.scheduled_stops}</td>
                      <td>{score.recorded_stops} ({score.completion_rate_pct}%)</td>
                      <td><span style={{ color: "#D97706", fontWeight: 700 }}>{score.unverified_complaints}</span></td>
                      <td><span style={{ color: "#DC2626", fontWeight: 700 }}>{score.verified_missed_complaints}</span></td>
                      <td>
                        <span style={{ fontSize: "1.1rem", fontWeight: 900, color: score.badge_color }}>
                          {score.reliability_score}%
                        </span>
                      </td>
                      <td>
                        <span className="ct-chip" style={{ background: `${score.badge_color}20`, color: score.badge_color }}>
                          {score.status_text}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.8rem" }}>
                          Org: {score.organic_tons}T | Rec: {score.recyclable_tons}T
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* OPERATOR REVIEW MODAL */}
      {reviewModalComplaint && (
        <div className="ct-modal-backdrop" onClick={() => setReviewModalComplaint(null)}>
          <div className="ct-modal" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header">
              <h3 style={{ margin: 0, color: "#064E3B", fontSize: "1.15rem" }}>
                Operator Complaint Verification & GPS Audit
              </h3>
              <button
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer" }}
                onClick={() => setReviewModalComplaint(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitReview}>
              <div className="ct-modal-body">
                <div style={{ background: "#F8FAFC", padding: "0.85rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                  <div><strong>Ticket ID:</strong> {reviewModalComplaint.tracking_id}</div>
                  <div><strong>Resident Address:</strong> {reviewModalComplaint.address} ({reviewModalComplaint.ward_name})</div>
                  <div><strong>Reported Issue:</strong> {reviewModalComplaint.description}</div>
                  <div><strong>Coordinates:</strong> [{reviewModalComplaint.latitude}, {reviewModalComplaint.longitude}]</div>
                </div>

                <div className="ct-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="ct-label">Audit Verification Decision</label>
                  <select
                    className="ct-select"
                    value={reviewForm.status}
                    onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}
                    required
                  >
                    <option value="VERIFIED_MISSED">Verify as Missed Pickup (Penalize Reliability Score & Dispatch)</option>
                    <option value="DUPLICATE">Mark as Duplicate Report</option>
                    <option value="RESOLVED">Mark Resolved (Clearance Completed)</option>
                    <option value="REJECTED">Reject (False Report / Truck Was Present)</option>
                  </select>
                </div>

                {reviewForm.status === "DUPLICATE" && (
                  <div className="ct-form-group" style={{ marginBottom: "1rem" }}>
                    <label className="ct-label">Duplicate of Tracking ID</label>
                    <input
                      type="text"
                      className="ct-input"
                      placeholder="e.g. CT-VIJ-2026-0985"
                      value={reviewForm.is_duplicate_of}
                      onChange={e => setReviewForm({ ...reviewForm, is_duplicate_of: e.target.value })}
                    />
                  </div>
                )}

                <div className="ct-form-group" style={{ marginBottom: "1rem" }}>
                  <label className="ct-label">Operator Notes (GPS Cross-Reference Findings)</label>
                  <textarea
                    rows="3"
                    className="ct-textarea"
                    value={reviewForm.operator_notes}
                    onChange={e => setReviewForm({ ...reviewForm, operator_notes: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="ct-form-group">
                  <label className="ct-label">Resolution Action Taken</label>
                  <input
                    type="text"
                    className="ct-input"
                    value={reviewForm.resolution_action}
                    onChange={e => setReviewForm({ ...reviewForm, resolution_action: e.target.value })}
                    placeholder="e.g. Dispatched standby vehicle AP-16-TY-1088 for clearance..."
                  />
                </div>
              </div>
              <div className="ct-modal-footer">
                <button
                  type="button"
                  className="ct-btn-secondary"
                  onClick={() => setReviewModalComplaint(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="ct-btn-primary">
                  Confirm Operator Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MAINTENANCE ALERT MODAL */}
      {showMaintenanceModal && (
        <div className="ct-modal-backdrop" onClick={() => setShowMaintenanceModal(false)}>
          <div className="ct-modal" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header">
              <h3 style={{ margin: 0, color: "#92400E", fontSize: "1.15rem" }}>
                ⚙️ Log Vehicle Breakdown & Standby Swap
              </h3>
              <button
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer" }}
                onClick={() => setShowMaintenanceModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateMaintenanceAlert}>
              <div className="ct-modal-body">
                <div className="ct-form-grid">
                  <div className="ct-form-group">
                    <label className="ct-label">Affected Vehicle ID</label>
                    <input
                      type="text"
                      className="ct-input"
                      value={newAlertForm.vehicle_id}
                      onChange={e => setNewAlertForm({ ...newAlertForm, vehicle_id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ct-form-group">
                    <label className="ct-label">Driver Name</label>
                    <input
                      type="text"
                      className="ct-input"
                      value={newAlertForm.driver_name}
                      onChange={e => setNewAlertForm({ ...newAlertForm, driver_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ct-form-group">
                    <label className="ct-label">Municipal Ward</label>
                    <select
                      className="ct-select"
                      value={newAlertForm.ward_id}
                      onChange={e => setNewAlertForm({ ...newAlertForm, ward_id: parseInt(e.target.value) })}
                    >
                      {(wards || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="ct-form-group">
                    <label className="ct-label">Standby Replacement Vehicle</label>
                    <input
                      type="text"
                      className="ct-input"
                      value={newAlertForm.replacement_vehicle_id}
                      onChange={e => setNewAlertForm({ ...newAlertForm, replacement_vehicle_id: e.target.value })}
                      placeholder="e.g. AP-16-TY-1088"
                    />
                  </div>
                  <div className="ct-form-group full-width">
                    <label className="ct-label">Breakdown Location Landmark</label>
                    <input
                      type="text"
                      className="ct-input"
                      value={newAlertForm.location_landmark}
                      onChange={e => setNewAlertForm({ ...newAlertForm, location_landmark: e.target.value })}
                      placeholder="e.g. Near Benz Circle Flyover pillar 22"
                      required
                    />
                  </div>
                  <div className="ct-form-group full-width">
                    <label className="ct-label">Mechanical Issue Details</label>
                    <textarea
                      rows="2"
                      className="ct-textarea"
                      value={newAlertForm.issue_description}
                      onChange={e => setNewAlertForm({ ...newAlertForm, issue_description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="ct-modal-footer">
                <button
                  type="button"
                  className="ct-btn-secondary"
                  onClick={() => setShowMaintenanceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ct-btn-primary">
                  Deploy Replacement & Activate Re-route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIJAYAWADA VECTOR SCHEMATIC MAP (GUARANTEED OFFLINE / FALLBACK RENDERER)
// ============================================================================
function VijayawadaSchematicMap({ wards, reliabilityScores, routes, hotspots, selectedWard, onSelectWard, schematicFocus }) {
  // Spatial layout mapping for Vijayawada's 10 municipal wards in SVG coordinates (0 0 920 580)
  const wardLayouts = [
    { id: 2, name: "Ward 2 - Bhavanipuram", shortName: "Bhavanipuram", x: 45, y: 80, w: 155, h: 140, depot: "Bhavanipuram Depot", time: "06:00 AM" },
    { id: 3, name: "Ward 3 - Vidyadharapuram", shortName: "Vidyadharapuram", x: 220, y: 75, w: 165, h: 135, depot: "Bhavanipuram Depot", time: "06:15 AM" },
    { id: 1, name: "Ward 1 - One Town", shortName: "One Town (Heritage)", x: 170, y: 235, w: 150, h: 145, depot: "Prakasham Barrage Depot", time: "06:00 AM" },
    { id: 4, name: "Ward 4 - Governorpet", shortName: "Governorpet", x: 345, y: 230, w: 140, h: 125, depot: "Governorpet Sub-Depot", time: "06:30 AM" },
    { id: 5, name: "Ward 5 - Suryaraopet", shortName: "Suryaraopet", x: 505, y: 215, w: 145, h: 125, depot: "Governorpet Sub-Depot", time: "06:00 AM" },
    { id: 6, name: "Ward 6 - Moghalrajpuram", shortName: "Moghalrajpuram", x: 505, y: 75, w: 160, h: 125, depot: "Moghalrajpuram Depot", time: "06:30 AM" },
    { id: 7, name: "Ward 7 - Benz Circle", shortName: "Benz Circle (Arterial)", x: 495, y: 360, w: 160, h: 145, depot: "Bandar Road Transit", time: "06:00 AM" },
    { id: 8, name: "Ward 8 - Patamata", shortName: "Patamata (High Density)", x: 675, y: 355, w: 165, h: 145, depot: "Autonagar Station", time: "06:00 AM" },
    { id: 9, name: "Ward 9 - Gunadala", shortName: "Gunadala", x: 685, y: 75, w: 160, h: 135, depot: "Gunadala Station", time: "06:30 AM" },
    { id: 10, name: "Ward 10 - Autonagar", shortName: "Autonagar", x: 685, y: 225, w: 160, h: 110, depot: "Autonagar Station", time: "06:00 AM" }
  ];

  const getWardScore = (id) => {
    const s = (reliabilityScores || []).find(x => x.ward_id === id);
    return s ? s.reliability_score : 85;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "#10B981"; // Green
    if (score >= 75) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  // Zoom/pan transform based on focus button
  let viewBox = "0 0 920 580";
  if (schematicFocus === "benz_circle") {
    viewBox = "380 250 440 280";
  } else if (schematicFocus === "patamata") {
    viewBox = "550 250 360 280";
  }

  return (
    <div className="ct-schematic-wrapper">
      <svg className="ct-schematic-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" />
          </filter>
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" />
          </filter>
        </defs>

        {/* 1. Krishna River Flow & Prakasham Barrage */}
        <g id="krishna-river-group">
          {/* River banks */}
          <path
            d="M 10,480 Q 140,430 250,390 T 470,490 T 780,560 T 920,570"
            className="ct-schematic-river"
          />
          <path
            d="M 10,480 Q 140,430 250,390 T 470,490 T 780,560 T 920,570"
            className="ct-schematic-river-inner"
          />
          <text x="70" y="465" fill="#1e3a8a" fontSize="12" fontWeight="700" letterSpacing="1">
            🌊 KRISHNA RIVER
          </text>
          
          {/* Prakasham Barrage */}
          <line x1="240" y1="365" x2="260" y2="425" className="ct-schematic-barrage" />
          <rect x="200" y="425" width="105" height="18" rx="4" fill="#334155" />
          <text x="206" y="438" fill="white" fontSize="9.5" fontWeight="700">
            Prakasham Barrage
          </text>
        </g>

        {/* 2. Arterial Road Network (Eluru Road, Bandar Road, MG Road) */}
        <g id="road-network">
          {/* Eluru Road (North-West to Center) */}
          <path d="M 110,140 L 290,140 L 415,280 L 570,270 L 755,270" className="ct-schematic-arterial" />
          <text x="290" y="132" fill="#64748b" fontSize="9.5" fontWeight="600">Eluru Road</text>
          
          {/* MG Road / Bandar Road (Connecting to Benz Circle) */}
          <path d="M 240,310 L 415,290 L 575,410 L 755,420" className="ct-schematic-arterial" />
          <text x="440" y="325" fill="#64748b" fontSize="9.5" fontWeight="600">MG Road ➔ Bandar Rd</text>
        </g>

        {/* 3. Municipal Wards (10 Real Vijayawada Wards) */}
        <g id="municipal-wards">
          {wardLayouts.map(w => {
            const score = getWardScore(w.id);
            const color = getScoreColor(score);
            const isSelected = selectedWard && (selectedWard.ward_id === w.id || selectedWard.id === w.id);

            return (
              <g
                key={w.id}
                className={`ct-schematic-ward ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  const sObj = (reliabilityScores || []).find(x => x.ward_id === w.id) || {
                    ward_id: w.id,
                    ward_name: w.name,
                    reliability_score: score,
                    depot_name: w.depot,
                    scheduled_start_time: w.time,
                    badge_color: color
                  };
                  onSelectWard(sObj);
                }}
              >
                <rect
                  x={w.x}
                  y={w.y}
                  width={w.w}
                  height={w.h}
                  rx="10"
                  fill={color}
                  fillOpacity={isSelected ? "0.38" : "0.22"}
                  stroke={color}
                  strokeWidth={isSelected ? "3.5" : "2"}
                />
                
                {/* Ward Title & Index */}
                <text x={w.x + 10} y={w.y + 22} fill="#064E3B" fontSize="12" fontWeight="800">
                  {w.shortName}
                </text>
                
                {/* Reliability Score Badge */}
                <rect x={w.x + w.w - 52} y={w.y + 8} width="44" height="20" rx="10" fill={color} />
                <text x={w.x + w.w - 30} y={w.y + 22} fill="white" fontSize="10.5" fontWeight="800" textAnchor="middle">
                  {score}%
                </text>

                {/* Depot starting badge */}
                <g transform={`translate(${w.x + 10}, ${w.y + 40})`}>
                  <rect width="112" height="18" rx="4" fill="#047857" fillOpacity="0.12" stroke="#047857" strokeWidth="1" />
                  <text x="6" y="13" fill="#047857" fontSize="9.5" fontWeight="700">
                    🏁 {w.time} Pickup Hub
                  </text>
                </g>

                {/* Sub details */}
                <text x={w.x + 10} y={w.y + 75} fill="#475569" fontSize="9.5">
                  Depot: {w.depot.replace('Depot', '').replace('Station', '')}
                </text>
                <text x={w.x + 10} y={w.y + 92} fill="#475569" fontSize="9.5">
                  Collection: Daily Shift 1
                </text>
                <text x={w.x + 10} y={w.y + 110} fill="#059669" fontSize="9.5" fontWeight="600">
                  Status: {score >= 90 ? "Optimal" : score >= 75 ? "Needs Attention" : "Critical"}
                </text>
              </g>
            );
          })}
        </g>

        {/* 4. Normal Planned Pickup Routes (Solid Green lines) */}
        <g id="pickup-routes">
          {/* Ward 1 Route */}
          <path d="M 190,260 L 220,300 L 260,330" className="ct-route-normal" />
          {/* Ward 4 Route */}
          <path d="M 360,250 L 415,270 L 450,300" className="ct-route-normal" />
          {/* Ward 8 Route */}
          <path d="M 700,380 L 740,400 L 790,440" className="ct-route-normal" />
        </g>

        {/* 5. Benz Circle Breakdown & Active Re-Route Demonstration */}
        <g id="benz-circle-reroute-scenario">
          {/* Original Broken Path (Dashed Rose/Red) */}
          <path d="M 520,380 L 560,405 L 610,430" className="ct-route-broken" />
          
          {/* Active Re-Route Detour Path (Solid Emerald Green with animation) */}
          <path d="M 560,405 L 560,455 L 620,460 L 630,420" className="ct-route-active" />
          
          {/* Vehicle Breakdown Hazard Icon */}
          <g transform="translate(546, 392)">
            <circle cx="14" cy="14" r="14" fill="#ef4444" filter="url(#glowRed)" />
            <text x="14" y="20" fill="white" fontSize="14" fontWeight="900" textAnchor="middle">⚠️</text>
          </g>
          
          {/* Breakdown Alert Callout */}
          <g transform="translate(435, 470)">
            <rect width="180" height="42" rx="6" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.5" />
            <text x="8" y="16" fill="#991b1b" fontSize="9.5" fontWeight="800">
              TRUCK AP-16-TX-4521 BROKEN
            </text>
            <text x="8" y="32" fill="#7f1d1d" fontSize="9">
              Standby AP-16-TY-1088 on Re-route 🔄
            </text>
          </g>
        </g>

        {/* 6. Patamata Recurring Failure Hotspot */}
        <g id="patamata-hotspot" transform="translate(730, 390)">
          <circle cx="16" cy="16" r="18" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3, 3">
            <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="16" cy="16" r="12" fill="#dc2626" />
          <text x="16" y="21" fill="white" fontSize="11" fontWeight="900" textAnchor="middle">🔥</text>
          
          <rect x="-25" y="32" width="130" height="22" rx="4" fill="#fef2f2" stroke="#dc2626" strokeWidth="1" />
          <text x="40" y="46" fill="#991b1b" fontSize="8.5" fontWeight="700" textAnchor="middle">
            High School Rd Hotspot
          </text>
        </g>

        {/* 7. Starting Depot Flags (Depot icons across city) */}
        <g id="depot-starting-flags">
          {/* Bhavanipuram Depot */}
          <circle cx="65" cy="105" r="10" fill="#047857" stroke="white" strokeWidth="2" />
          <text x="65" y="109" fill="white" fontSize="9" fontWeight="900" textAnchor="middle">🏁</text>
          {/* Autonagar Depot */}
          <circle cx="705" cy="245" r="10" fill="#047857" stroke="white" strokeWidth="2" />
          <text x="705" y="249" fill="white" fontSize="9" fontWeight="900" textAnchor="middle">🏁</text>
        </g>
      </svg>

      {/* Floating Operational Disclaimer Tag */}
      <div className="ct-map-banner-sim">
        <span>🟢</span>
        <span><strong>Municipal Operations Telemetry:</strong> Vijayawada Municipal Corporation (VMC) Solid Waste Fleet Telemetry Feed.</span>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CleanTrackApp />);
