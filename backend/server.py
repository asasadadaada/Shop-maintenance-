from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "technician"  # admin or technician

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
    completed_at: Optional[str] = None
    report: Optional[str] = None
    report_images: Optional[List[str]] = None

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
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.role)
    user_response = User(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        role=user_data.role,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

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
        "completed_at": None,
        "report": None,
        "report_images": None
    }
    
    await db.tasks.insert_one(task_doc)
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
    
    return {"message": "تم قبول المهمة"}

@api_router.patch("/tasks/{task_id}/start")
async def start_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="الصلاحية للموظف فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": "in_progress"}}
    )
    
    return {"message": "تم بدء المهمة"}

@api_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, report_data: TaskReport, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="الصلاحية للموظف فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "report": report_data.report_text,
            "report_images": report_data.images
        }}
    )
    
    return {"message": "تم إنهاء المهمة بنجاح"}

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

# Technicians List
@api_router.get("/technicians", response_model=List[User])
async def get_technicians(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    technicians = await db.users.find({"role": "technician"}, {"_id": 0, "password": 0}).to_list(1000)
    return technicians

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
