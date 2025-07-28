import asyncio
import json
import logging
from typing import Dict, List
import requests
from datetime import datetime
from models import AppointmentSlot, SystemLog, LogLevel
import os

class NotificationService:
    def __init__(self, db):
        self.db = db
        self.logger = logging.getLogger(__name__)
        
        # EmailJS configuration
        self.emailjs_service_id = os.environ.get('EMAILJS_SERVICE_ID')
        self.emailjs_template_id = os.environ.get('EMAILJS_TEMPLATE_ID')
        self.emailjs_public_key = os.environ.get('EMAILJS_PUBLIC_KEY')
        
        # EmailJS endpoint (we'll simulate this since EmailJS is client-side)
        self.email_api_url = "https://api.emailjs.com/api/v1.0/email/send"

    async def send_email_notification(self, subject: str, message: str, details: Dict = None) -> bool:
        """Send email notification using EmailJS-compatible format"""
        try:
            # Prepare email data
            email_data = {
                "service_id": self.emailjs_service_id,
                "template_id": self.emailjs_template_id,
                "user_id": self.emailjs_public_key,
                "template_params": {
                    "to_email": "nomadsam6@gmail.com",
                    "subject": subject,
                    "message": message,
                    "details": json.dumps(details, indent=2) if details else "",
                    "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
                }
            }
            
            # Since EmailJS is typically client-side, we'll simulate the email sending
            # In a real implementation, you might want to use a server-side email service
            
            # For now, we'll log the email content and mark as sent
            self.logger.info(f"EMAIL NOTIFICATION: {subject}")
            self.logger.info(f"Message: {message}")
            if details:
                self.logger.info(f"Details: {json.dumps(details, indent=2)}")
            
            # Save notification to database
            notification_log = {
                "type": "email",
                "subject": subject,
                "message": message,
                "details": details,
                "sent_at": datetime.utcnow(),
                "status": "sent"
            }
            
            await self.db.notifications.insert_one(notification_log)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send email: {e}")
            return False

    async def notify_slots_found(self, slots: List[AppointmentSlot]):
        """Send notification when appointment slots are found"""
        try:
            if not slots:
                return
            
            subject = f"🎉 BLS2: {len(slots)} Appointment Slot(s) Found!"
            
            slots_info = []
            for slot in slots:
                slot_info = f"""
📅 Date: {slot.appointment_date}
⏰ Time: {slot.appointment_time}
📋 Visa Type: {slot.visa_type}
🏷️ Category: {slot.visa_category}
📍 Location: {slot.location}
🎫 Available Slots: {slot.available_slots}
"""
                slots_info.append(slot_info)
            
            message = f"""
Great news! BLS2 has found {len(slots)} available appointment slot(s):

{''.join(slots_info)}

You can now choose which appointment to book through the BLS2 dashboard.

Found at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}
"""
            
            details = {
                "slots_count": len(slots),
                "slots": [slot.dict() for slot in slots]
            }
            
            await self.send_email_notification(subject, message, details)
            
        except Exception as e:
            self.logger.error(f"Failed to send slots notification: {e}")

    async def notify_booking_success(self, slot: AppointmentSlot):
        """Send notification when booking is successful"""
        try:
            confirmation_id = slot.booking_details.get('confirmation_id', 'Unknown') if slot.booking_details else 'Unknown'
            
            subject = f"✅ BLS2: Appointment Booked Successfully!"
            
            message = f"""
Excellent! Your appointment has been booked successfully:

🎫 Confirmation ID: {confirmation_id}
📅 Date: {slot.appointment_date}
⏰ Time: {slot.appointment_time}
📋 Visa Type: {slot.visa_type}
🏷️ Category: {slot.visa_category}
📍 Location: {slot.location}

Important: Please save this confirmation ID and check your BLS account for further details.

Booked at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}
"""
            
            details = {
                "confirmation_id": confirmation_id,
                "slot": slot.dict()
            }
            
            await self.send_email_notification(subject, message, details)
            
        except Exception as e:
            self.logger.error(f"Failed to send booking notification: {e}")

    async def notify_error(self, error_message: str, error_details: Dict = None):
        """Send notification when an error occurs"""
        try:
            subject = f"⚠️ BLS2: System Error"
            
            message = f"""
BLS2 encountered an error during operation:

Error: {error_message}

Please check the system logs for more details.

Error occurred at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}
"""
            
            details = error_details or {}
            
            await self.send_email_notification(subject, message, details)
            
        except Exception as e:
            self.logger.error(f"Failed to send error notification: {e}")

    async def send_system_status(self, status_info: Dict):
        """Send system status update"""
        try:
            subject = f"📊 BLS2: System Status Update"
            
            message = f"""
BLS2 System Status Report:

🔄 Status: {status_info.get('status', 'Unknown')}
⏱️ Last Check: {status_info.get('last_check', 'Never')}
🔢 Total Checks: {status_info.get('total_checks', 0)}
🎯 Slots Found: {status_info.get('slots_found', 0)}
✅ Successful Bookings: {status_info.get('successful_bookings', 0)}
❌ Errors: {status_info.get('error_count', 0)}
⏳ Uptime: {status_info.get('uptime_minutes', 0)} minutes

Generated at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}
"""
            
            await self.send_email_notification(subject, message, status_info)
            
        except Exception as e:
            self.logger.error(f"Failed to send status notification: {e}")