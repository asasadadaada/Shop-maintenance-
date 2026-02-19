from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64

import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = "8224031678:AAG149d2LhnU1YYsNpcQeDMZO7eOIiPQR70"

async def send_telegram_message_with_button(chat_id: str, message: str, task_id: str):
    """إرسال رسالة Telegram مع زر يروح مباشرة للمهمة"""
    if not chat_id:
        return
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        
        # رابط التطبيق مع task_id
        app_url = f"https://lemon-tanya-emergentagi-86e73b13.stage-preview.emergentagent.com/?task={task_id}"
        
        keyboard = {
            "inline_keyboard": [[
                {
                    "text": "✅ فتح المهمة وإكمالها",
                    "url": app_url
                }
            ]]
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "reply_markup": keyboard
            })
    except Exception as e:
        print(f"Telegram error: {e}")

async def send_telegram_message(chat_id: str, message: str):
    """إرسال رسالة Telegram بسيطة بدون زر"""
    if not chat_id:
        return
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        
        async with httpx.AsyncClient() as client:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML"
            })
    except Exception as e:
        print(f"Telegram error: {e}")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Default admin account
DEFAULT_ADMIN = {
    "email": "baqer@gmail.com",
    "password": "198212",
    "name": "المدير"
}

# Initialize default admin on startup
@app.on_event("startup")
async def create_default_admin():
    # Check if admin exists
    admin = await db.users.find_one({"email": DEFAULT_ADMIN["email"]})
    if not admin:
        # Create default admin
        admin_id = str(uuid.uuid4())
        admin_doc = {
            "id": admin_id,
            "name": DEFAULT_ADMIN["name"],
            "email": DEFAULT_ADMIN["email"],
            "password": hash_password(DEFAULT_ADMIN["password"]),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        print(f"✓ Default admin created: {DEFAULT_ADMIN['email']}")

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "technician"  # admin or technician
    whatsapp_number: Optional[str] = None  # رقم الواتساب
    telegram_chat_id: Optional[str] = None  # Telegram Chat ID

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: str
    whatsapp_number: Optional[str] = None
    telegram_chat_id: Optional[str] = None

class TaskCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: str
    issue_description: str
    assigned_to: Optional[str] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_name: str
    customer_phone: str
    customer_address: str
    issue_description: str
    status: str  # pending, accepted, in_progress, completed
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_at: str
    accepted_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    report: Optional[str] = None
    report_images: Optional[List[str]] = None
    success: Optional[bool] = True  # True = completed successfully, False = failed
    duration_minutes: Optional[int] = None

class LocationUpdate(BaseModel):
    task_id: str
    latitude: float
    longitude: float

class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    user_id: str
    latitude: float
    longitude: float
    timestamp: str

class TaskReport(BaseModel):
    task_id: str
    report_text: str
    images: Optional[List[str]] = None
    success: Optional[bool] = True

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    task_id: str
    message: str
    type: str  # task_assigned, task_accepted, task_completed
    read: bool
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: User

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Routes
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة السر غير صحيحة")
    
    token = create_token(user["id"], user["role"])
    user_response = User(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# Change Password
class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    # Verify old password
    user = await db.users.find_one({"id": current_user["id"]})
    if not user or not verify_password(password_data.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="الرمز القديم غير صحيح")
    
    # Update password
    new_hashed = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "تم تغيير الرمز بنجاح"}

# Task Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    task_id = str(uuid.uuid4())
    assigned_to_name = None
    
    if task_data.assigned_to:
        tech = await db.users.find_one({"id": task_data.assigned_to}, {"_id": 0})
        if tech:
            assigned_to_name = tech["name"]
    
    task_doc = {
        "id": task_id,
        "customer_name": task_data.customer_name,
        "customer_phone": task_data.customer_phone,
        "customer_address": task_data.customer_address,
        "issue_description": task_data.issue_description,
        "status": "pending",
        "assigned_to": task_data.assigned_to,
        "assigned_to_name": assigned_to_name,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None,
        "started_at": None,
        "completed_at": None,
        "report": None,
        "report_images": None,
        "success": True,
        "duration_minutes": None
    }
    
    await db.tasks.insert_one(task_doc)
    
    # Create notification for assigned technician
    if task_data.assigned_to:
        notification_doc = {
            "id": str(uuid.uuid4()),
            "user_id": task_data.assigned_to,
            "task_id": task_id,
            "message": f"تم تعيين مهمة جديدة لك: {task_data.customer_name}",
            "type": "task_assigned",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
        
        # إرسال رسالة Telegram مع رابط مباشر للمهمة
        if tech and tech.get("telegram_chat_id"):
            telegram_message = f"""
🔔 <b>لديك مهمة جديدة!</b>

👤 <b>المشترك:</b> {task_data.customer_name}
📞 <b>الهاتف:</b> {task_data.customer_phone}
📍 <b>العنوان:</b> {task_data.customer_address}
🔧 <b>العطل:</b> {task_data.issue_description}

⏰ <b>اضغط الزر أدناه لفتح المهمة مباشرة</b>
            """
            # إرسال الرسالة مع رابط المهمة المحددة
            await send_telegram_message_with_button(
                tech["telegram_chat_id"], 
                telegram_message,
                task_id
            )
    
    return Task(**task_doc)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        tasks = await db.tasks.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        tasks = await db.tasks.find({"assigned_to": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return tasks

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    return Task(**task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # Delete task
    await db.tasks.delete_one({"id": task_id})
    
    # Delete related locations
    await db.locations.delete_many({"task_id": task_id})
    
    # Delete related notifications
    await db.notifications.delete_many({"task_id": task_id})
    
    return {"message": "تم حذف المهمة بنجاح"}

@api_router.patch("/tasks/{task_id}/accept")
async def accept_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="الصلاحية للموظف فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    if task["assigned_to"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="هذه المهمة ليست مخصصة لك")
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for admin
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": task["created_by"],
        "task_id": task_id,
        "message": f"قبل {current_user['name']} المهمة: {task['customer_name']}",
        "type": "task_accepted",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    return {"message": "تم قبول المهمة"}

@api_router.patch("/tasks/{task_id}/start")
async def start_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="الصلاحية للموظف فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    start_time = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "in_progress",
            "started_at": start_time
        }}
    )
    
    return {"message": "تم بدء المهمة"}

@api_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, report_data: TaskReport, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="الصلاحية للموظف فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    completed_at = datetime.now(timezone.utc)
    
    # Calculate duration
    duration_minutes = 0
    if task.get("started_at"):
        started_at = datetime.fromisoformat(task["started_at"].replace('Z', '+00:00'))
        duration_minutes = int((completed_at - started_at).total_seconds() / 60)
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "completed_at": completed_at.isoformat(),
            "report": report_data.report_text,
            "report_images": report_data.images,
            "success": report_data.success,
            "duration_minutes": duration_minutes
        }}
    )
    
    # Create detailed notification for admin
    status_text = "بنجاح ✓" if report_data.success else "كغير مكتملة ✗"
    duration_text = f" - المدة: {duration_minutes} دقيقة" if duration_minutes > 0 else ""
    
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": task["created_by"],
        "task_id": task_id,
        "message": f"أنهى {current_user['name']} المهمة {status_text}: {task['customer_name']}{duration_text}",
        "type": "task_completed",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    return {"message": "تم إنهاء المهمة بنجاح", "duration_minutes": duration_minutes}

# Location Routes
@api_router.post("/locations")
async def update_location(location_data: LocationUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="الصلاحية للموظف فقط")
    
    location_doc = {
        "id": str(uuid.uuid4()),
        "task_id": location_data.task_id,
        "user_id": current_user["id"],
        "latitude": location_data.latitude,
        "longitude": location_data.longitude,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.locations.insert_one(location_doc)
    return {"message": "تم تحديث الموقع"}

@api_router.get("/locations/{task_id}", response_model=List[Location])
async def get_task_locations(task_id: str, current_user: dict = Depends(get_current_user)):
    locations = await db.locations.find({"task_id": task_id}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return locations

@api_router.get("/locations/technician/{user_id}/latest")
async def get_technician_latest_location(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    location = await db.locations.find_one({"user_id": user_id}, {"_id": 0}, sort=[("timestamp", -1)])
    if not location:
        return None
    
    return location

@api_router.post("/technicians", response_model=User)
async def create_technician(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    
    # Create user (force role to technician)
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "role": "technician",  # Force technician role
        "whatsapp_number": user_data.whatsapp_number,
        "telegram_chat_id": user_data.telegram_chat_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.users.insert_one(user_doc)
    
    user_response = User(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        role="technician",
        whatsapp_number=user_data.whatsapp_number,
        telegram_chat_id=user_data.telegram_chat_id,
        created_at=user_doc["created_at"]
    )
    
    return user_response

@api_router.delete("/technicians/{technician_id}")
async def delete_technician(technician_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # Check if technician exists
    tech = await db.users.find_one({"id": technician_id, "role": "technician"})
    if not tech:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # Don't allow deleting if technician has active tasks
    active_tasks = await db.tasks.count_documents({
        "assigned_to": technician_id,
        "status": {"$in": ["pending", "accepted", "in_progress"]}
    })
    
    if active_tasks > 0:
        raise HTTPException(status_code=400, detail=f"لا يمكن حذف الموظف. لديه {active_tasks} مهمة نشطة")
    
    # Delete technician
    await db.users.delete_one({"id": technician_id})
    
    return {"message": "تم حذف الموظف بنجاح"}

# Technicians List
@api_router.get("/technicians", response_model=List[User])
async def get_technicians(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    technicians = await db.users.find({"role": "technician"}, {"_id": 0, "password": 0}).to_list(1000)
    return technicians

# Notifications Routes
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "تم تحديث الإشعار"}

@api_router.get("/notifications/unread/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents(
        {"user_id": current_user["id"], "read": False}
    )
    return {"count": count}

# Statistics
@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        total_tasks = await db.tasks.count_documents({})
        pending_tasks = await db.tasks.count_documents({"status": "pending"})
        in_progress_tasks = await db.tasks.count_documents({"status": "in_progress"})
        completed_tasks = await db.tasks.count_documents({"status": "completed"})
        total_technicians = await db.users.count_documents({"role": "technician"})
        
        return {
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "in_progress_tasks": in_progress_tasks,
            "completed_tasks": completed_tasks,
            "total_technicians": total_technicians
        }
    else:
        my_tasks = await db.tasks.count_documents({"assigned_to": current_user["id"]})
        my_completed = await db.tasks.count_documents({"assigned_to": current_user["id"], "status": "completed"})
        my_pending = await db.tasks.count_documents({"assigned_to": current_user["id"], "status": "pending"})
        my_in_progress = await db.tasks.count_documents({"assigned_to": current_user["id"], "status": "in_progress"})
        
        return {
            "my_tasks": my_tasks,
            "my_completed": my_completed,
            "my_pending": my_pending,
            "my_in_progress": my_in_progress
        }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
