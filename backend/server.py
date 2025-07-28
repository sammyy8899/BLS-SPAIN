from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Import our custom modules
from models import *
from bls_automation import BLSAutomation
from notification_service import NotificationService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="BLS2 - Automated Visa Appointment System", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Global state
automation_system = None
notification_service = NotificationService(db)
websocket_connections = []
system_task = None
system_start_time = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# WebSocket log callback
async def websocket_log_callback(log_entry: SystemLog):
    """Send log updates to connected WebSocket clients"""
    message = {
        "type": "log",
        "data": log_entry.dict()
    }
    await manager.broadcast(json.dumps(message))

# Background task for continuous monitoring
async def appointment_monitoring_task():
    """Background task that continuously monitors for appointments"""
    global automation_system
    
    try:
        # Get system config
        config = await db.system_configs.find_one() or SystemConfig().dict()
        
        while config.get('status') == SystemStatus.RUNNING:
            try:
                # Initialize automation if needed
                if not automation_system:
                    automation_system = BLSAutomation(db, websocket_log_callback)
                
                # Run appointment check
                success, slots = await automation_system.run_full_check()
                
                # Update system stats
                await db.system_configs.update_one(
                    {},
                    {
                        "$inc": {"total_checks": 1, "slots_found": len(slots)},
                        "$set": {"last_check": datetime.utcnow()}
                    },
                    upsert=True
                )
                
                # Send notifications if slots found
                if slots:
                    await notification_service.notify_slots_found(slots)
                    
                    # Broadcast to WebSocket clients
                    message = {
                        "type": "slots_found",
                        "data": {"slots": [slot.dict() for slot in slots]}
                    }
                    await manager.broadcast(json.dumps(message))
                
                # Wait for next check
                config = await db.system_configs.find_one() or {}
                check_interval = config.get('check_interval_minutes', 2)
                await asyncio.sleep(check_interval * 60)
                
                # Refresh config
                config = await db.system_configs.find_one() or {}
                
            except Exception as e:
                # Log error and continue
                await db.system_logs.insert_one(SystemLog(
                    level=LogLevel.ERROR,
                    message=f"Monitoring error: {str(e)}",
                    step="MONITORING"
                ).dict())
                
                await asyncio.sleep(30)  # Wait 30 seconds before retrying
                
    except Exception as e:
        # Critical error - update system status
        await db.system_configs.update_one(
            {},
            {"$set": {"status": SystemStatus.ERROR}},
            upsert=True
        )

# API Endpoints

@api_router.get("/")
async def root():
    return {"message": "BLS2 - Automated Visa Appointment System", "version": "1.0.0"}

@api_router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status():
    """Get current system status"""
    config = await db.system_configs.find_one() or SystemConfig().dict()
    
    uptime_minutes = None
    if system_start_time and config.get('status') == SystemStatus.RUNNING:
        uptime_minutes = int((datetime.utcnow() - system_start_time).total_seconds() / 60)
    
    return SystemStatusResponse(
        status=config.get('status', SystemStatus.STOPPED),
        last_check=config.get('last_check'),
        total_checks=config.get('total_checks', 0),
        slots_found=config.get('slots_found', 0),
        successful_bookings=config.get('successful_bookings', 0),
        error_count=config.get('error_count', 0),
        uptime_minutes=uptime_minutes
    )

@api_router.post("/system/start")
async def start_system(request: StartSystemRequest, background_tasks: BackgroundTasks):
    """Start the automation system"""
    global system_task, system_start_time
    
    try:
        # Update system config
        config_data = {
            "status": SystemStatus.RUNNING,
            "check_interval_minutes": request.check_interval_minutes,
            "updated_at": datetime.utcnow()
        }
        
        await db.system_configs.update_one({}, {"$set": config_data}, upsert=True)
        
        # Start background task if not already running
        if not system_task or system_task.done():
            system_start_time = datetime.utcnow()
            system_task = asyncio.create_task(appointment_monitoring_task())
        
        # Log system start
        await db.system_logs.insert_one(SystemLog(
            level=LogLevel.SUCCESS,
            message=f"BLS2 system started with {request.check_interval_minutes} minute intervals",
            step="SYSTEM_START"
        ).dict())
        
        return {"message": "System started successfully", "status": "running"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start system: {str(e)}")

@api_router.post("/system/stop")
async def stop_system():
    """Stop the automation system"""
    global system_task
    
    try:
        # Update system config
        await db.system_configs.update_one(
            {},
            {"$set": {"status": SystemStatus.STOPPED, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        
        # Cancel background task
        if system_task:
            system_task.cancel()
            system_task = None
        
        # Cleanup automation system
        global automation_system
        if automation_system:
            await automation_system.cleanup()
            automation_system = None
        
        # Log system stop
        await db.system_logs.insert_one(SystemLog(
            level=LogLevel.INFO,
            message="BLS2 system stopped",
            step="SYSTEM_STOP"
        ).dict())
        
        return {"message": "System stopped successfully", "status": "stopped"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop system: {str(e)}")

@api_router.get("/logs", response_model=LogsResponse)
async def get_logs(limit: int = 100, offset: int = 0, level: Optional[LogLevel] = None):
    """Get system logs"""
    try:
        # Build query
        query = {}
        if level:
            query["level"] = level.value
        
        # Get logs with pagination
        cursor = db.system_logs.find(query).sort("timestamp", -1).skip(offset).limit(limit)
        logs = await cursor.to_list(length=limit)
        
        # Get total count
        total_count = await db.system_logs.count_documents(query)
        
        # Convert to models
        log_models = [SystemLog(**log) for log in logs]
        
        return LogsResponse(logs=log_models, total_count=total_count)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")

@api_router.get("/appointments/available", response_model=AvailableSlotsResponse)
async def get_available_slots(limit: int = 50, offset: int = 0):
    """Get available appointment slots"""
    try:
        # Get available slots
        query = {"status": AppointmentStatus.AVAILABLE}
        cursor = db.appointment_slots.find(query).sort("found_at", -1).skip(offset).limit(limit)
        slots = await cursor.to_list(length=limit)
        
        # Get total count
        total_count = await db.appointment_slots.count_documents(query)
        
        # Convert to models
        slot_models = [AppointmentSlot(**slot) for slot in slots]
        
        return AvailableSlotsResponse(slots=slot_models, total_count=total_count)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get slots: {str(e)}")

@api_router.post("/appointments/book")
async def book_appointment(request: AppointmentChoice):
    """Book a selected appointment"""
    global automation_system
    
    try:
        # Get the slot
        slot_data = await db.appointment_slots.find_one({"id": request.slot_id})
        if not slot_data:
            raise HTTPException(status_code=404, detail="Appointment slot not found")
        
        slot = AppointmentSlot(**slot_data)
        
        if not request.confirm_booking:
            return {"message": "Please confirm booking", "slot": slot.dict()}
        
        # Initialize automation if needed
        if not automation_system:
            automation_system = BLSAutomation(db, websocket_log_callback)
        
        # Default user info (you might want to make this configurable)
        user_info = {
            "first_name": "User",
            "last_name": "Test",
            "passport": "A12345678",
            "phone": "+213123456789",
            "email": os.environ.get('BLS_EMAIL')
        }
        
        # Attempt booking
        success = await automation_system.step5_book_appointment(slot, user_info)
        
        if success:
            # Update slot in database
            await db.appointment_slots.update_one(
                {"id": request.slot_id},
                {"$set": slot.dict()}
            )
            
            # Update system stats
            await db.system_configs.update_one(
                {},
                {"$inc": {"successful_bookings": 1}},
                upsert=True
            )
            
            # Send notification
            await notification_service.notify_booking_success(slot)
            
            return {"message": "Appointment booked successfully!", "confirmation_id": slot.booking_details.get('confirmation_id')}
        else:
            raise HTTPException(status_code=400, detail="Failed to book appointment")
        
    except Exception as e:
        await db.system_configs.update_one({}, {"$inc": {"error_count": 1}}, upsert=True)
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")

@api_router.post("/test/check-once")
async def test_single_check():
    """Run a single appointment check for testing"""
    global automation_system
    
    try:
        # Initialize automation
        if not automation_system:
            automation_system = BLSAutomation(db, websocket_log_callback)
        
        # Run single check
        success, slots = await automation_system.run_full_check()
        
        return {
            "success": success,
            "slots_found": len(slots),
            "slots": [slot.dict() for slot in slots]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test check failed: {str(e)}")

# OCR endpoint for captcha solving
@api_router.post("/ocr-match")
async def ocr_match(request: Dict):
    """OCR endpoint for captcha solving (placeholder - you should implement actual OCR)"""
    try:
        target = request.get('target')
        tiles = request.get('tiles', [])
        
        # This is a placeholder implementation
        # You should implement actual OCR logic here
        
        # For now, return a mock response
        matching_indices = [0]  # Mock: first tile matches
        
        return {
            "target": target,
            "matching_indices": matching_indices,
            "processed_tiles": len(tiles)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            message = json.loads(data)
            
            if message.get('type') == 'ping':
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("BLS2 System Starting Up...")
    
    # Initialize system config if not exists
    config = await db.system_configs.find_one()
    if not config:
        initial_config = SystemConfig()
        await db.system_configs.insert_one(initial_config.dict())
    
    logger.info("BLS2 System Ready!")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("BLS2 System Shutting Down...")
    
    # Stop background task
    global system_task
    if system_task:
        system_task.cancel()
    
    # Cleanup automation system
    global automation_system
    if automation_system:
        await automation_system.cleanup()
    
    # Close database connection
    client.close()
    
    logger.info("BLS2 System Shutdown Complete!")
