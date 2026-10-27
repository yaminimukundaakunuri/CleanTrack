from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ComplaintStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED_MISSED = "VERIFIED_MISSED"
    DUPLICATE = "DUPLICATE"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class WasteCategory(str, Enum):
    ORGANIC = "ORGANIC"
    RECYCLABLE = "RECYCLABLE"
    LANDFILL = "LANDFILL"
    MIXED = "MIXED"

class ComplaintCreate(BaseModel):
    ward_id: int = Field(..., description="ID of the municipal ward")
    ward_name: Optional[str] = None
    resident_name: Optional[str] = Field("Anonymous Resident", description="Name of citizen")
    contact_phone: Optional[str] = Field(None, description="Optional phone number for status updates")
    address: str = Field(..., description="Street address or landmark in Vijayawada")
    latitude: float = Field(..., description="Geotagged latitude coordinate")
    longitude: float = Field(..., description="Geotagged longitude coordinate")
    waste_category: WasteCategory = Field(WasteCategory.MIXED, description="Category of missed waste")
    missed_date: str = Field(..., description="Date of missed collection YYYY-MM-DD")
    missed_time_slot: Optional[str] = Field("06:00 AM - 09:00 AM", description="Scheduled pickup slot missed")
    description: str = Field(..., description="Detailed description of the issue")
    photo_url: Optional[str] = Field(None, description="Optional photo evidence URL or placeholder")

class ComplaintReview(BaseModel):
    status: ComplaintStatus = Field(..., description="Updated status after review")
    operator_notes: str = Field(..., description="Findings after cross-referencing vehicle logs")
    reviewed_by: Optional[str] = Field("Operator on Duty", description="Operator identifier")
    resolution_action: Optional[str] = Field(None, description="Emergency pickup dispatched, marked duplicate, etc.")
    is_duplicate_of: Optional[str] = Field(None, description="Tracking ID of original complaint if duplicate")

class MaintenanceAlertCreate(BaseModel):
    vehicle_id: str
    driver_name: str
    ward_id: int
    alert_type: str = "VEHICLE_BREAKDOWN"
    issue_description: str
    replacement_vehicle_id: Optional[str] = None
    status: str = "ACTIVE"
    location_landmark: str
