from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class SystemStatus(str, Enum):
    STOPPED = "stopped"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"

class LogLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class AppointmentStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    FAILED = "failed"
    PENDING = "pending"

# Database Models
class SystemLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: LogLevel
    message: str
    details: Optional[Dict[str, Any]] = None
    step: Optional[str] = None

class AppointmentSlot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    found_at: datetime = Field(default_factory=datetime.utcnow)
    appointment_date: str
    appointment_time: str
    visa_type: str
    visa_category: str
    location: str
    available_slots: int
    status: AppointmentStatus = AppointmentStatus.AVAILABLE
    booking_details: Optional[Dict[str, Any]] = None

class SystemConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: SystemStatus = SystemStatus.STOPPED
    check_interval_minutes: int = 2
    last_check: Optional[datetime] = None
    total_checks: int = 0
    slots_found: int = 0
    successful_bookings: int = 0
    error_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email_notifications: bool = True
    notification_email: str = "nomadsam6@gmail.com"
    notify_on_slots_found: bool = True
    notify_on_booking_success: bool = True
    notify_on_errors: bool = True

# API Request/Response Models
class StartSystemRequest(BaseModel):
    check_interval_minutes: Optional[int] = 2

class SystemStatusResponse(BaseModel):
    status: SystemStatus
    last_check: Optional[datetime]
    total_checks: int
    slots_found: int
    successful_bookings: int
    error_count: int
    uptime_minutes: Optional[int] = None

class AppointmentChoice(BaseModel):
    slot_id: str
    confirm_booking: bool = False

class LogsResponse(BaseModel):
    logs: List[SystemLog]
    total_count: int

class AvailableSlotsResponse(BaseModel):
    slots: List[AppointmentSlot]
    total_count: int