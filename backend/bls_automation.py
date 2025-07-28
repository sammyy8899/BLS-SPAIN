import asyncio
import json
import base64
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
import requests
from urllib.parse import urljoin
import re
from models import SystemLog, AppointmentSlot, LogLevel, AppointmentStatus
import os

class BLSAutomation:
    def __init__(self, db, log_callback=None):
        self.db = db
        self.log_callback = log_callback
        self.logger = logging.getLogger(__name__)
        
        # BLS URLs
        self.urls = {
            'login': 'https://algeria.blsspainglobal.com/DZA/account/login',
            'captcha_login': 'https://algeria.blsspainglobal.com/DZA/newcaptcha/logincaptcha',
            'appointment_captcha': 'https://algeria.blsspainglobal.com/DZA/Appointment/AppointmentCaptcha',
            'visa_type': 'https://algeria.blsspainglobal.com/DZA/Appointment/VisaType',
            'new_appointment': 'https://algeria.blsspainglobal.com/DZA/Appointment/NewAppointment'
        }
        
        # Credentials
        self.email = os.environ.get('BLS_EMAIL')
        self.password = os.environ.get('BLS_PASSWORD')
        
        # OCR API
        self.ocr_api_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001') + os.environ.get('OCR_API_ENDPOINT', '/api/ocr-match')
        
        # Browser setup
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # State tracking
        self.is_logged_in = False
        self.session_cookies = None
        self.csrf_token = None

    async def log(self, level: LogLevel, message: str, details: Optional[Dict] = None, step: Optional[str] = None):
        """Log message to database and callback"""
        log_entry = SystemLog(
            level=level,
            message=message,
            details=details,
            step=step
        )
        
        # Save to database
        await self.db.system_logs.insert_one(log_entry.dict())
        
        # Call callback if provided
        if self.log_callback:
            await self.log_callback(log_entry)
        
        # Also log to console
        log_level = getattr(logging, level.value.upper())
        self.logger.log(log_level, f"[{step or 'GENERAL'}] {message}")

    async def init_browser(self):
        """Initialize browser with anti-detection measures"""
        try:
            await self.log(LogLevel.INFO, "Initializing browser with anti-detection measures", step="BROWSER_INIT")
            
            self.playwright = await async_playwright().start()
            
            # Launch browser with stealth options
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--disable-blink-features=AutomationControlled'
                ]
            )
            
            # Create context with realistic settings
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                java_script_enabled=True,
                accept_downloads=False,
                ignore_https_errors=True
            )
            
            # Add stealth scripts
            await self.context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                window.chrome = {
                    runtime: {}
                };
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
            """)
            
            self.page = await self.context.new_page()
            
            await self.log(LogLevel.SUCCESS, "Browser initialized successfully", step="BROWSER_INIT")
            return True
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Failed to initialize browser: {str(e)}", 
                         details={"error": str(e)}, step="BROWSER_INIT")
            return False

    async def solve_captcha(self, captcha_image_base64: str, target_number: str) -> Optional[List[int]]:
        """Solve captcha using OCR API"""
        try:
            await self.log(LogLevel.INFO, f"Solving captcha with target number: {target_number}", step="CAPTCHA_SOLVE")
            
            # Prepare tiles data (assuming single image for now)
            tiles_data = [{
                "base64Image": captcha_image_base64
            }]
            
            payload = {
                "target": target_number,
                "tiles": tiles_data
            }
            
            response = requests.post(self.ocr_api_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                await self.log(LogLevel.SUCCESS, f"Captcha solved successfully: {result}", 
                             details={"result": result}, step="CAPTCHA_SOLVE")
                return result.get('matching_indices', [])
            else:
                await self.log(LogLevel.ERROR, f"OCR API failed with status {response.status_code}", 
                             details={"status_code": response.status_code, "response": response.text}, 
                             step="CAPTCHA_SOLVE")
                return None
                
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Captcha solving failed: {str(e)}", 
                         details={"error": str(e)}, step="CAPTCHA_SOLVE")
            return None

    async def handle_dynamic_form(self, page: Page) -> Optional[str]:
        """Handle the dynamic email form with multiple hidden fields"""
        try:
            await self.log(LogLevel.INFO, "Analyzing dynamic form fields", step="FORM_ANALYSIS")
            
            # Wait for page to load completely
            await page.wait_for_load_state('networkidle')
            
            # Execute the obfuscated JavaScript to reveal correct fields
            await page.evaluate("""
                // Execute all the dynamic field functions
                const functions = [
                    'eIVmSp', 'aHUQP', 'xxvn', 'nGnllR', 'ymHxlHb', 'mEVEpw', 
                    'bpVol', 'VSdTo', 'wvmVFII', 'wmvm', 'UUyIF', 'ppdyExo', 
                    'HvTwew', 'IxIVldp', 'caQHw', 'lUxndUl', 'eyTTvVn', 'dHHol', 
                    'RylQy', 'epIV', 'cawE', 'GRdF', 'mTnIcFI', 'wnvFwbS', 'UnnG'
                ];
                
                functions.forEach(funcName => {
                    try {
                        if (typeof window[funcName] === 'function') {
                            window[funcName]();
                        }
                    } catch (e) {
                        console.log('Function error:', funcName, e);
                    }
                });
            """)
            
            await asyncio.sleep(2)  # Wait for JavaScript to execute
            
            # Find visible email input field
            email_fields = [
                'olmeb', 'oaxQ', 'vbTReno', 'ayHSo', 'cHRS', 
                'QwQHcey', 'vnHwlI', 'ITaIFy', 'mSFlawd', 'STPcxF'
            ]
            
            visible_field = None
            for field_id in email_fields:
                try:
                    element = await page.query_selector(f'#{field_id}')
                    if element:
                        is_visible = await element.is_visible()
                        if is_visible:
                            visible_field = field_id
                            await self.log(LogLevel.SUCCESS, f"Found visible email field: {field_id}", step="FORM_ANALYSIS")
                            break
                except:
                    continue
            
            if not visible_field:
                # If no field is visible, try the first one anyway
                visible_field = 'olmeb'
                await self.log(LogLevel.WARNING, "No visible field found, using default: olmeb", step="FORM_ANALYSIS")
            
            return visible_field
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Form analysis failed: {str(e)}", 
                         details={"error": str(e)}, step="FORM_ANALYSIS")
            return None

    async def step1_initial_login(self) -> bool:
        """Step 1: Initial email login"""
        try:
            await self.log(LogLevel.INFO, "Starting Step 1: Initial login", step="STEP1_LOGIN")
            
            if not self.browser:
                if not await self.init_browser():
                    return False
            
            # Navigate to login page
            await self.page.goto(self.urls['login'], wait_until='networkidle')
            await self.log(LogLevel.INFO, "Navigated to login page", step="STEP1_LOGIN")
            
            # Handle dynamic form
            email_field = await self.handle_dynamic_form(self.page)
            if not email_field:
                await self.log(LogLevel.ERROR, "Could not identify email field", step="STEP1_LOGIN")
                return False
            
            # Fill email
            await self.page.fill(f'#{email_field}', self.email)
            await self.log(LogLevel.INFO, f"Filled email in field: {email_field}", step="STEP1_LOGIN")
            
            # Submit form
            await self.page.click('#btnVerify')
            await self.log(LogLevel.INFO, "Submitted initial login form", step="STEP1_LOGIN")
            
            # Wait for navigation or response
            await self.page.wait_for_load_state('networkidle')
            
            # Check if we're redirected to password/captcha page
            current_url = self.page.url
            if 'logincaptcha' in current_url:
                await self.log(LogLevel.SUCCESS, "Step 1 completed - redirected to captcha page", step="STEP1_LOGIN")
                return True
            else:
                await self.log(LogLevel.WARNING, f"Unexpected URL after login: {current_url}", step="STEP1_LOGIN")
                return False
                
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Step 1 failed: {str(e)}", 
                         details={"error": str(e)}, step="STEP1_LOGIN")
            return False

    async def step2_password_captcha(self) -> bool:
        """Step 2: Password and captcha submission"""
        try:
            await self.log(LogLevel.INFO, "Starting Step 2: Password and captcha", step="STEP2_CAPTCHA")
            
            # Wait for page to load
            await self.page.wait_for_load_state('networkidle')
            
            # Fill password
            password_field = await self.page.query_selector('input[type="password"]')
            if password_field:
                await password_field.fill(self.password)
                await self.log(LogLevel.INFO, "Password filled", step="STEP2_CAPTCHA")
            else:
                await self.log(LogLevel.ERROR, "Password field not found", step="STEP2_CAPTCHA")
                return False
            
            # Handle captcha
            captcha_solved = await self.handle_captcha_login()
            if not captcha_solved:
                return False
            
            # Submit form
            submit_btn = await self.page.query_selector('input[type="submit"], button[type="submit"]')
            if submit_btn:
                await submit_btn.click()
                await self.log(LogLevel.INFO, "Submitted login form", step="STEP2_CAPTCHA")
            else:
                await self.log(LogLevel.ERROR, "Submit button not found", step="STEP2_CAPTCHA")
                return False
            
            # Wait for navigation
            await self.page.wait_for_load_state('networkidle')
            
            # Check if login successful
            current_url = self.page.url
            if 'login' not in current_url.lower():
                self.is_logged_in = True
                await self.log(LogLevel.SUCCESS, "Step 2 completed - Login successful", step="STEP2_CAPTCHA")
                return True
            else:
                await self.log(LogLevel.ERROR, "Login failed - still on login page", step="STEP2_CAPTCHA")
                return False
                
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Step 2 failed: {str(e)}", 
                         details={"error": str(e)}, step="STEP2_CAPTCHA")
            return False

    async def handle_captcha_login(self) -> bool:
        """Handle captcha during login"""
        try:
            # Look for captcha image
            captcha_img = await self.page.query_selector('img[src*="captcha"], img[alt*="captcha"]')
            if not captcha_img:
                await self.log(LogLevel.WARNING, "No captcha image found", step="CAPTCHA_LOGIN")
                return True  # Maybe no captcha required
            
            # Get captcha image
            captcha_src = await captcha_img.get_attribute('src')
            if captcha_src.startswith('data:image'):
                # Base64 image
                captcha_data = captcha_src.split(',')[1]
            else:
                # Download image and convert to base64
                response = await self.page.goto(captcha_src)
                image_bytes = await response.body()
                captcha_data = base64.b64encode(image_bytes).decode()
            
            # Extract target number from page
            target_text = await self.page.text_content('body')
            target_match = re.search(r'select.*?(\d+)', target_text, re.IGNORECASE)
            if not target_match:
                await self.log(LogLevel.ERROR, "Could not find target number in captcha", step="CAPTCHA_LOGIN")
                return False
            
            target_number = target_match.group(1)
            
            # Solve captcha
            solution = await self.solve_captcha(captcha_data, target_number)
            if not solution:
                return False
            
            # Click on solved tiles (if tile-based captcha)
            if solution:
                # For now, just fill any captcha input field
                captcha_input = await self.page.query_selector('input[name*="captcha"], input[id*="captcha"]')
                if captcha_input:
                    await captcha_input.fill(str(solution[0]) if solution else "")
            
            await self.log(LogLevel.SUCCESS, "Captcha handled", step="CAPTCHA_LOGIN")
            return True
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Captcha handling failed: {str(e)}", step="CAPTCHA_LOGIN")
            return False

    async def step3_appointment_check(self) -> List[AppointmentSlot]:
        """Step 3: Check for available appointments"""
        try:
            await self.log(LogLevel.INFO, "Starting Step 3: Appointment check", step="STEP3_CHECK")
            
            # Navigate to appointment check page
            if 'AppointmentCaptcha' not in self.page.url:
                await self.page.goto(self.urls['appointment_captcha'], wait_until='networkidle')
            
            # Handle appointment captcha
            captcha_solved = await self.handle_appointment_captcha()
            if not captcha_solved:
                return []
            
            # Submit to check appointments
            submit_btn = await self.page.query_selector('input[type="submit"], button[type="submit"]')
            if submit_btn:
                await submit_btn.click()
                await self.page.wait_for_load_state('networkidle')
            
            # Parse available slots
            slots = await self.parse_available_slots()
            
            if slots:
                await self.log(LogLevel.SUCCESS, f"Found {len(slots)} available slots", 
                             details={"slots_count": len(slots)}, step="STEP3_CHECK")
            else:
                await self.log(LogLevel.INFO, "No available slots found", step="STEP3_CHECK")
            
            return slots
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Step 3 failed: {str(e)}", 
                         details={"error": str(e)}, step="STEP3_CHECK")
            return []

    async def handle_appointment_captcha(self) -> bool:
        """Handle captcha on appointment page"""
        # Similar to login captcha but for appointment page
        return await self.handle_captcha_login()

    async def parse_available_slots(self) -> List[AppointmentSlot]:
        """Parse available appointment slots from the page"""
        try:
            slots = []
            
            # Look for appointment slots in common patterns
            slot_elements = await self.page.query_selector_all('.appointment-slot, .slot-item, tr')
            
            for element in slot_elements:
                try:
                    text = await element.text_content()
                    if not text or 'available' not in text.lower():
                        continue
                    
                    # Extract slot information (this would need to be customized based on actual page structure)
                    slot = AppointmentSlot(
                        appointment_date="TBD",  # Would extract from actual page
                        appointment_time="TBD",
                        visa_type="Spain Visa",
                        visa_category="Tourism",
                        location="Algeria",
                        available_slots=1,
                        status=AppointmentStatus.AVAILABLE
                    )
                    slots.append(slot)
                except:
                    continue
            
            return slots
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Failed to parse slots: {str(e)}", step="SLOT_PARSING")
            return []

    async def step4_visa_selection(self, visa_preferences: Optional[Dict] = None) -> bool:
        """Step 4: Select visa type and category"""
        try:
            await self.log(LogLevel.INFO, "Starting Step 4: Visa selection", step="STEP4_VISA")
            
            # Navigate to visa selection page if not already there
            if 'VisaType' not in self.page.url:
                await self.page.goto(self.urls['visa_type'], wait_until='networkidle')
            
            # Select visa type (default to tourism if not specified)
            visa_type = visa_preferences.get('visa_type', 'tourism') if visa_preferences else 'tourism'
            
            # Look for visa type dropdowns or radio buttons
            visa_type_element = await self.page.query_selector('select[name*="visa"], input[name*="visa"]')
            if visa_type_element:
                await visa_type_element.select_option(value=visa_type)
                await self.log(LogLevel.INFO, f"Selected visa type: {visa_type}", step="STEP4_VISA")
            
            # Continue to next step
            next_btn = await self.page.query_selector('input[type="submit"], button[type="submit"]')
            if next_btn:
                await next_btn.click()
                await self.page.wait_for_load_state('networkidle')
            
            await self.log(LogLevel.SUCCESS, "Step 4 completed - Visa selection done", step="STEP4_VISA")
            return True
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Step 4 failed: {str(e)}", 
                         details={"error": str(e)}, step="STEP4_VISA")
            return False

    async def step5_book_appointment(self, slot: AppointmentSlot, user_info: Dict) -> bool:
        """Step 5: Book the selected appointment"""
        try:
            await self.log(LogLevel.INFO, f"Starting Step 5: Booking appointment for slot {slot.id}", step="STEP5_BOOKING")
            
            # Navigate to appointment booking page
            if 'NewAppointment' not in self.page.url:
                await self.page.goto(self.urls['new_appointment'], wait_until='networkidle')
            
            # Fill user information form
            # This would need to be customized based on actual form fields
            fields_mapping = {
                'first_name': 'input[name*="firstname"], input[name*="FirstName"]',
                'last_name': 'input[name*="lastname"], input[name*="LastName"]',
                'passport': 'input[name*="passport"], input[name*="Passport"]',
                'phone': 'input[name*="phone"], input[name*="Phone"]',
                'email': 'input[name*="email"], input[name*="Email"]'
            }
            
            for field_key, selector in fields_mapping.items():
                if field_key in user_info:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.fill(str(user_info[field_key]))
                        await self.log(LogLevel.INFO, f"Filled {field_key}", step="STEP5_BOOKING")
            
            # Select the appointment slot
            # This would depend on the actual page structure
            
            # Submit booking
            submit_btn = await self.page.query_selector('input[type="submit"], button[type="submit"]')
            if submit_btn:
                await submit_btn.click()
                await self.page.wait_for_load_state('networkidle')
            
            # Check for confirmation
            confirmation_text = await self.page.text_content('body')
            if 'confirm' in confirmation_text.lower() or 'success' in confirmation_text.lower():
                # Extract confirmation number
                confirmation_match = re.search(r'confirmation.*?([A-Z0-9]{6,})', confirmation_text, re.IGNORECASE)
                confirmation_id = confirmation_match.group(1) if confirmation_match else "UNKNOWN"
                
                slot.status = AppointmentStatus.BOOKED
                slot.booking_details = {
                    "confirmation_id": confirmation_id,
                    "booked_at": datetime.utcnow().isoformat(),
                    "user_info": user_info
                }
                
                await self.log(LogLevel.SUCCESS, f"Appointment booked successfully! Confirmation: {confirmation_id}", 
                             details={"confirmation_id": confirmation_id}, step="STEP5_BOOKING")
                return True
            else:
                await self.log(LogLevel.ERROR, "Booking failed - no confirmation received", step="STEP5_BOOKING")
                return False
                
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Step 5 failed: {str(e)}", 
                         details={"error": str(e)}, step="STEP5_BOOKING")
            return False

    async def run_full_check(self) -> Tuple[bool, List[AppointmentSlot]]:
        """Run complete appointment check cycle"""
        try:
            await self.log(LogLevel.INFO, "Starting full appointment check cycle", step="FULL_CHECK")
            
            # Step 1: Initial login
            if not await self.step1_initial_login():
                return False, []
            
            # Step 2: Password and captcha
            if not await self.step2_password_captcha():
                return False, []
            
            # Step 3: Check appointments
            slots = await self.step3_appointment_check()
            
            if slots:
                # Save slots to database
                for slot in slots:
                    await self.db.appointment_slots.insert_one(slot.dict())
            
            await self.log(LogLevel.SUCCESS, f"Full check completed. Found {len(slots)} slots", 
                         details={"slots_found": len(slots)}, step="FULL_CHECK")
            
            return True, slots
            
        except Exception as e:
            await self.log(LogLevel.ERROR, f"Full check failed: {str(e)}", 
                         details={"error": str(e)}, step="FULL_CHECK")
            return False, []

    async def cleanup(self):
        """Clean up browser resources"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")