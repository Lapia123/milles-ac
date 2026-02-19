from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.security import HTTPBearer
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
import bcrypt
import jwt
import httpx
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'fx-broker-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="FX Broker Back-Office API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserRole:
    ADMIN = "admin"
    SUB_ADMIN = "sub_admin"
    ACCOUNTANT = "accountant"
    VENDOR = "vendor"

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str = UserRole.SUB_ADMIN
    picture: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.SUB_ADMIN

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ClientStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class ClientBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    country: Optional[str] = None
    mt5_number: Optional[str] = None
    crm_customer_id: Optional[str] = None
    kyc_status: str = ClientStatus.PENDING
    kyc_documents: List[str] = []
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ClientCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    country: Optional[str] = None
    mt5_number: Optional[str] = None
    crm_customer_id: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    mt5_number: Optional[str] = None
    crm_customer_id: Optional[str] = None
    kyc_status: Optional[str] = None
    notes: Optional[str] = None

# Treasury/Bank Account Models
class TreasuryAccountType:
    BANK = "bank"
    CRYPTO_WALLET = "crypto_wallet"
    PAYMENT_GATEWAY = "payment_gateway"
    USDT = "usdt"  # USDT Wallet

class TreasuryAccountStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"

# PSP Models
class PSPStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"

class PSPSettlementStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class CommissionPaidBy:
    CLIENT = "client"
    BROKER = "broker"

class PSPCreate(BaseModel):
    psp_name: str
    commission_rate: float  # percentage e.g., 2.5 for 2.5%
    settlement_days: int = 1  # T+1, T+2, etc.
    settlement_destination_id: str  # Treasury account ID
    min_settlement_amount: float = 0
    description: Optional[str] = None

class PSPUpdate(BaseModel):
    psp_name: Optional[str] = None
    commission_rate: Optional[float] = None
    settlement_days: Optional[int] = None
    settlement_destination_id: Optional[str] = None
    min_settlement_amount: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None

# Vendor Models
class VendorStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"

class VendorSettlementType:
    BANK = "bank"
    CASH = "cash"

class VendorSettlementStatus:
    PENDING = "pending"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"

class VendorCreate(BaseModel):
    vendor_name: str
    email: EmailStr
    password: str
    deposit_commission: float = 0  # percentage for deposits
    withdrawal_commission: float = 0  # percentage for withdrawals
    description: Optional[str] = None

class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    deposit_commission: Optional[float] = None
    withdrawal_commission: Optional[float] = None
    status: Optional[str] = None
    description: Optional[str] = None

# Income & Expense Models
class IncomeExpenseType:
    INCOME = "income"
    EXPENSE = "expense"

class IncomeCategory:
    COMMISSION = "commission"
    SERVICE_FEE = "service_fee"
    INTEREST = "interest"
    OTHER = "other"

class ExpenseCategory:
    BANK_FEE = "bank_fee"
    TRANSFER_CHARGE = "transfer_charge"
    VENDOR_PAYMENT = "vendor_payment"
    OPERATIONAL = "operational"
    MARKETING = "marketing"
    SOFTWARE = "software"
    OTHER = "other"

class IncomeExpenseCreate(BaseModel):
    entry_type: str  # income or expense
    category: str
    custom_category: Optional[str] = None
    amount: float
    currency: str = "USD"
    treasury_account_id: str
    description: Optional[str] = None
    reference: Optional[str] = None
    date: Optional[str] = None  # ISO date string

class IncomeExpenseUpdate(BaseModel):
    category: Optional[str] = None
    custom_category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    reference: Optional[str] = None

# Exchange rates to USD (simplified - in production use live API)
EXCHANGE_RATES_TO_USD = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.27,
    "AED": 0.27,
    "SAR": 0.27,
    "INR": 0.012,
    "JPY": 0.0067,
}

def convert_to_usd(amount: float, currency: str) -> float:
    rate = EXCHANGE_RATES_TO_USD.get(currency.upper(), 1.0)
    return round(amount * rate, 2)

class TreasuryAccountCreate(BaseModel):
    account_name: str
    account_type: str = TreasuryAccountType.BANK
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    currency: str = "USD"
    description: Optional[str] = None
    # USDT specific fields
    usdt_address: Optional[str] = None
    usdt_network: Optional[str] = None  # TRC20, ERC20, BEP20
    usdt_notes: Optional[str] = None

class TreasuryAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    # USDT specific fields
    usdt_address: Optional[str] = None
    usdt_network: Optional[str] = None
    usdt_notes: Optional[str] = None

class TransactionType:
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    COMMISSION = "commission"
    REBATE = "rebate"
    ADJUSTMENT = "adjustment"

class TransactionStatus:
    PENDING = "pending"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    FAILED = "failed"

class TransactionCreate(BaseModel):
    client_id: str
    transaction_type: str
    amount: float
    currency: str = "USD"
    base_currency: str = "USD"
    base_amount: Optional[float] = None
    destination_type: str = "treasury"  # "treasury", "psp", "vendor", "bank", "usdt"
    destination_account_id: Optional[str] = None
    psp_id: Optional[str] = None
    vendor_id: Optional[str] = None
    commission_paid_by: Optional[str] = None  # "client" or "broker"
    description: Optional[str] = None
    reference: Optional[str] = None
    # Client bank details (for withdrawal to bank)
    client_bank_name: Optional[str] = None
    client_bank_account_name: Optional[str] = None
    client_bank_account_number: Optional[str] = None
    client_bank_swift_iban: Optional[str] = None
    client_bank_currency: Optional[str] = None
    # Client USDT details (for withdrawal to USDT)
    client_usdt_address: Optional[str] = None
    client_usdt_network: Optional[str] = None  # TRC20, ERC20, BEP20

class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    rejection_reason: Optional[str] = None

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        # Check if it's a session token
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
        
        # Try JWT token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except jwt.ExpiredSignatureError:
            pass
        except jwt.InvalidTokenError:
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_accountant_or_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in [UserRole.ADMIN, UserRole.ACCOUNTANT]:
        raise HTTPException(status_code=403, detail="Accountant or Admin access required")
    return user

async def require_vendor(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != UserRole.VENDOR:
        raise HTTPException(status_code=403, detail="Vendor access required")
    return user

async def require_vendor_or_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in [UserRole.ADMIN, UserRole.VENDOR]:
        raise HTTPException(status_code=403, detail="Vendor or Admin access required")
    return user

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "is_active": True,
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        access_token=token,
        user={
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role
        }
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    token = create_jwt_token(user["user_id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user={
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    )

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Google OAuth session_id"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as http_client:
        try:
            resp = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = resp.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    session_token = session_data.get("session_token")
    
    now = datetime.now(timezone.utc)
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        user_id = user["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": UserRole.SUB_ADMIN,
            "is_active": True,
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user_doc)
    
    expires_at = now + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", UserRole.SUB_ADMIN),
        "picture": user.get("picture")
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", UserRole.SUB_ADMIN),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ============== USERS/ADMINS ROUTES ==============

@api_router.get("/users")
async def get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "is_active": True,
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {"user_id": user_id, "email": user_data.email, "name": user_data.name, "role": user_data.role}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}

# ============== CLIENTS ROUTES ==============

@api_router.get("/clients")
async def get_clients(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    search: Optional[str] = None
):
    query = {}
    if status:
        query["kyc_status"] = status
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.post("/clients")
async def create_client(client_data: ClientCreate, user: dict = Depends(get_current_user)):
    existing = await db.clients.find_one({"email": client_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Client email already exists")
    
    client_id = f"client_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    client_doc = {
        "client_id": client_id,
        **client_data.model_dump(),
        "kyc_status": ClientStatus.PENDING,
        "kyc_documents": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.clients.insert_one(client_doc)
    
    return await db.clients.find_one({"client_id": client_id}, {"_id": 0})

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, update_data: ClientUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.clients.update_one({"client_id": client_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return await db.clients.find_one({"client_id": client_id}, {"_id": 0})

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}

# ============== CLIENT BANK ACCOUNTS ROUTES ==============

@api_router.get("/clients/{client_id}/bank-accounts")
async def get_client_bank_accounts(client_id: str, user: dict = Depends(get_current_user)):
    """Get all saved bank accounts for a client"""
    accounts = await db.client_bank_accounts.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    return accounts

@api_router.post("/clients/{client_id}/bank-accounts")
async def create_client_bank_account(
    client_id: str,
    bank_name: str = Form(...),
    account_name: str = Form(...),
    account_number: str = Form(...),
    swift_iban: str = Form(None),
    currency: str = Form("USD"),
    user: dict = Depends(get_current_user)
):
    """Save a new bank account for a client"""
    # Check if client exists
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check for duplicate account
    existing = await db.client_bank_accounts.find_one({
        "client_id": client_id,
        "account_number": account_number,
        "bank_name": bank_name
    })
    if existing:
        return existing  # Return existing instead of creating duplicate
    
    bank_account_id = f"cba_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    bank_doc = {
        "bank_account_id": bank_account_id,
        "client_id": client_id,
        "bank_name": bank_name,
        "account_name": account_name,
        "account_number": account_number,
        "swift_iban": swift_iban,
        "currency": currency,
        "created_at": now.isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.client_bank_accounts.insert_one(bank_doc)
    return await db.client_bank_accounts.find_one({"bank_account_id": bank_account_id}, {"_id": 0})

@api_router.put("/clients/{client_id}/bank-accounts/{bank_account_id}")
async def update_client_bank_account(
    client_id: str,
    bank_account_id: str,
    bank_name: str = Form(None),
    account_name: str = Form(None),
    account_number: str = Form(None),
    swift_iban: str = Form(None),
    currency: str = Form(None),
    user: dict = Depends(get_current_user)
):
    """Update a client's bank account"""
    updates = {}
    if bank_name:
        updates["bank_name"] = bank_name
    if account_name:
        updates["account_name"] = account_name
    if account_number:
        updates["account_number"] = account_number
    if swift_iban is not None:
        updates["swift_iban"] = swift_iban
    if currency:
        updates["currency"] = currency
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.client_bank_accounts.update_one(
        {"bank_account_id": bank_account_id, "client_id": client_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    return await db.client_bank_accounts.find_one({"bank_account_id": bank_account_id}, {"_id": 0})

@api_router.delete("/clients/{client_id}/bank-accounts/{bank_account_id}")
async def delete_client_bank_account(client_id: str, bank_account_id: str, user: dict = Depends(get_current_user)):
    """Delete a client's bank account"""
    result = await db.client_bank_accounts.delete_one({"bank_account_id": bank_account_id, "client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return {"message": "Bank account deleted"}

# ============== TREASURY/BANK ACCOUNTS ROUTES ==============

@api_router.get("/treasury")
async def get_treasury_accounts(user: dict = Depends(get_current_user)):
    accounts = await db.treasury_accounts.find({}, {"_id": 0}).to_list(1000)
    # Add USD equivalent for each account
    for acc in accounts:
        acc["balance_usd"] = convert_to_usd(acc.get("balance", 0), acc.get("currency", "USD"))
    return accounts

@api_router.get("/treasury/{account_id}")
async def get_treasury_account(account_id: str, user: dict = Depends(get_current_user)):
    account = await db.treasury_accounts.find_one({"account_id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Treasury account not found")
    return account

@api_router.post("/treasury")
async def create_treasury_account(account_data: TreasuryAccountCreate, user: dict = Depends(require_admin)):
    account_id = f"treasury_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    account_doc = {
        "account_id": account_id,
        **account_data.model_dump(),
        "balance": 0.0,
        "status": TreasuryAccountStatus.ACTIVE,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.treasury_accounts.insert_one(account_doc)
    
    return await db.treasury_accounts.find_one({"account_id": account_id}, {"_id": 0})

@api_router.put("/treasury/{account_id}")
async def update_treasury_account(account_id: str, update_data: TreasuryAccountUpdate, user: dict = Depends(require_admin)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.treasury_accounts.update_one({"account_id": account_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Treasury account not found")
    
    return await db.treasury_accounts.find_one({"account_id": account_id}, {"_id": 0})

# Treasury Transaction History
@api_router.get("/treasury/{account_id}/history")
async def get_treasury_history(
    account_id: str, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get transaction history for a treasury account"""
    account = await db.treasury_accounts.find_one({"account_id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Treasury account not found")
    
    # Build query for treasury transactions
    query = {"account_id": account_id}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    # Get treasury-specific transactions
    treasury_txs = await db.treasury_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Also get regular transactions that affected this treasury account
    tx_query = {"destination_account_id": account_id}
    if start_date:
        tx_query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in tx_query:
            tx_query["created_at"]["$lte"] = end_date
        else:
            tx_query["created_at"] = {"$lte": end_date}
    
    regular_txs = await db.transactions.find(
        {**tx_query, "status": {"$in": ["approved", "completed"]}}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Convert regular transactions to history format
    for tx in regular_txs:
        treasury_txs.append({
            "treasury_transaction_id": tx.get("transaction_id"),
            "account_id": account_id,
            "transaction_type": tx.get("transaction_type"),
            "amount": tx.get("amount") if tx.get("transaction_type") == "deposit" else -tx.get("amount", 0),
            "currency": account.get("currency", "USD"),
            "reference": f"{tx.get('transaction_type', '').capitalize()}: {tx.get('client_name', 'Unknown')} - {tx.get('reference', '')}",
            "client_id": tx.get("client_id"),
            "client_name": tx.get("client_name"),
            "created_at": tx.get("processed_at") or tx.get("created_at"),
            "created_by": tx.get("processed_by"),
            "created_by_name": tx.get("processed_by_name")
        })
    
    # Sort combined list by date
    treasury_txs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return treasury_txs[:limit]

@api_router.delete("/treasury/{account_id}")
async def delete_treasury_account(account_id: str, user: dict = Depends(require_admin)):
    result = await db.treasury_accounts.delete_one({"account_id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Treasury account not found")
    return {"message": "Treasury account deleted"}

# Inter-Treasury Transfer
class TreasuryTransferRequest(BaseModel):
    source_account_id: str
    destination_account_id: str
    amount: float
    exchange_rate: Optional[float] = 1.0
    notes: Optional[str] = None

@api_router.post("/treasury/transfer")
async def inter_treasury_transfer(transfer: TreasuryTransferRequest, user: dict = Depends(require_admin)):
    """Transfer funds between treasury accounts"""
    if transfer.source_account_id == transfer.destination_account_id:
        raise HTTPException(status_code=400, detail="Source and destination accounts must be different")
    
    if transfer.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be positive")
    
    # Get source account
    source = await db.treasury_accounts.find_one({"account_id": transfer.source_account_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Source account not found")
    
    # Get destination account
    destination = await db.treasury_accounts.find_one({"account_id": transfer.destination_account_id}, {"_id": 0})
    if not destination:
        raise HTTPException(status_code=404, detail="Destination account not found")
    
    # Check sufficient balance
    if source.get("balance", 0) < transfer.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance in source account")
    
    now = datetime.now(timezone.utc)
    transfer_id = f"trf_{uuid.uuid4().hex[:12]}"
    
    # Calculate destination amount based on exchange rate
    destination_amount = round(transfer.amount * (transfer.exchange_rate or 1.0), 2)
    
    # Deduct from source
    await db.treasury_accounts.update_one(
        {"account_id": transfer.source_account_id},
        {"$inc": {"balance": -transfer.amount}, "$set": {"updated_at": now.isoformat()}}
    )
    
    # Add to destination
    await db.treasury_accounts.update_one(
        {"account_id": transfer.destination_account_id},
        {"$inc": {"balance": destination_amount}, "$set": {"updated_at": now.isoformat()}}
    )
    
    # Record source transaction (transfer out)
    source_tx_id = f"ttx_{uuid.uuid4().hex[:12]}"
    source_tx_doc = {
        "treasury_transaction_id": source_tx_id,
        "account_id": transfer.source_account_id,
        "transaction_type": "transfer_out",
        "amount": -transfer.amount,
        "currency": source.get("currency", "USD"),
        "reference": f"Transfer to {destination.get('account_name')}",
        "transfer_id": transfer_id,
        "related_account_id": transfer.destination_account_id,
        "related_account_name": destination.get("account_name"),
        "exchange_rate": transfer.exchange_rate,
        "destination_amount": destination_amount,
        "destination_currency": destination.get("currency", "USD"),
        "notes": transfer.notes,
        "created_at": now.isoformat(),
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    await db.treasury_transactions.insert_one(source_tx_doc)
    
    # Record destination transaction (transfer in)
    dest_tx_id = f"ttx_{uuid.uuid4().hex[:12]}"
    dest_tx_doc = {
        "treasury_transaction_id": dest_tx_id,
        "account_id": transfer.destination_account_id,
        "transaction_type": "transfer_in",
        "amount": destination_amount,
        "currency": destination.get("currency", "USD"),
        "reference": f"Transfer from {source.get('account_name')}",
        "transfer_id": transfer_id,
        "related_account_id": transfer.source_account_id,
        "related_account_name": source.get("account_name"),
        "exchange_rate": transfer.exchange_rate,
        "source_amount": transfer.amount,
        "source_currency": source.get("currency", "USD"),
        "notes": transfer.notes,
        "created_at": now.isoformat(),
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    await db.treasury_transactions.insert_one(dest_tx_doc)
    
    # Return transfer details
    return {
        "transfer_id": transfer_id,
        "source_account": source.get("account_name"),
        "source_currency": source.get("currency", "USD"),
        "source_amount": transfer.amount,
        "destination_account": destination.get("account_name"),
        "destination_currency": destination.get("currency", "USD"),
        "destination_amount": destination_amount,
        "exchange_rate": transfer.exchange_rate,
        "notes": transfer.notes,
        "created_at": now.isoformat(),
        "created_by_name": user["name"]
    }

# ============== PSP ROUTES ==============

@api_router.get("/psp")
async def get_psps(user: dict = Depends(get_current_user)):
    psps = await db.psps.find({}, {"_id": 0}).to_list(1000)
    # Get settlement destination names
    for psp in psps:
        if psp.get("settlement_destination_id"):
            dest = await db.treasury_accounts.find_one({"account_id": psp["settlement_destination_id"]}, {"_id": 0})
            psp["settlement_destination_name"] = dest["account_name"] if dest else "Unknown"
            psp["settlement_destination_bank"] = dest["bank_name"] if dest else None
    return psps

@api_router.get("/psp/{psp_id}")
async def get_psp(psp_id: str, user: dict = Depends(get_current_user)):
    psp = await db.psps.find_one({"psp_id": psp_id}, {"_id": 0})
    if not psp:
        raise HTTPException(status_code=404, detail="PSP not found")
    return psp

@api_router.post("/psp")
async def create_psp(psp_data: PSPCreate, user: dict = Depends(require_admin)):
    # Verify settlement destination exists
    dest = await db.treasury_accounts.find_one({"account_id": psp_data.settlement_destination_id}, {"_id": 0})
    if not dest:
        raise HTTPException(status_code=404, detail="Settlement destination account not found")
    
    psp_id = f"psp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    psp_doc = {
        "psp_id": psp_id,
        **psp_data.model_dump(),
        "total_volume": 0.0,
        "total_commission": 0.0,
        "pending_settlement": 0.0,
        "status": PSPStatus.ACTIVE,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.psps.insert_one(psp_doc)
    return await db.psps.find_one({"psp_id": psp_id}, {"_id": 0})

@api_router.put("/psp/{psp_id}")
async def update_psp(psp_id: str, update_data: PSPUpdate, user: dict = Depends(require_admin)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    # Verify settlement destination if being updated
    if updates.get("settlement_destination_id"):
        dest = await db.treasury_accounts.find_one({"account_id": updates["settlement_destination_id"]}, {"_id": 0})
        if not dest:
            raise HTTPException(status_code=404, detail="Settlement destination account not found")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.psps.update_one({"psp_id": psp_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="PSP not found")
    
    return await db.psps.find_one({"psp_id": psp_id}, {"_id": 0})

@api_router.delete("/psp/{psp_id}")
async def delete_psp(psp_id: str, user: dict = Depends(require_admin)):
    result = await db.psps.delete_one({"psp_id": psp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="PSP not found")
    return {"message": "PSP deleted"}

# PSP Settlements
@api_router.get("/psp/{psp_id}/settlements")
async def get_psp_settlements(psp_id: str, user: dict = Depends(get_current_user)):
    settlements = await db.psp_settlements.find({"psp_id": psp_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return settlements

@api_router.get("/psp-settlements")
async def get_all_settlements(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if status:
        query["status"] = status
    settlements = await db.psp_settlements.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return settlements

@api_router.post("/psp/{psp_id}/settle")
async def create_settlement(psp_id: str, user: dict = Depends(require_admin)):
    """Create a settlement for pending PSP transactions"""
    psp = await db.psps.find_one({"psp_id": psp_id}, {"_id": 0})
    if not psp:
        raise HTTPException(status_code=404, detail="PSP not found")
    
    # Get pending transactions for this PSP
    pending_txs = await db.transactions.find({
        "psp_id": psp_id,
        "status": {"$in": [TransactionStatus.APPROVED, TransactionStatus.COMPLETED]},
        "settled": {"$ne": True}
    }, {"_id": 0}).to_list(1000)
    
    if not pending_txs:
        raise HTTPException(status_code=400, detail="No pending transactions to settle")
    
    # Calculate totals
    gross_amount = sum(tx["amount"] for tx in pending_txs)
    commission_rate = psp.get("commission_rate", 0) / 100
    commission_amount = round(gross_amount * commission_rate, 2)
    net_amount = gross_amount - commission_amount
    
    settlement_id = f"stl_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    settlement_date = now + timedelta(days=psp.get("settlement_days", 1))
    
    settlement_doc = {
        "settlement_id": settlement_id,
        "psp_id": psp_id,
        "psp_name": psp["psp_name"],
        "gross_amount": gross_amount,
        "commission_rate": psp.get("commission_rate", 0),
        "commission_amount": commission_amount,
        "net_amount": net_amount,
        "transaction_count": len(pending_txs),
        "transaction_ids": [tx["transaction_id"] for tx in pending_txs],
        "settlement_destination_id": psp["settlement_destination_id"],
        "status": PSPSettlementStatus.PENDING,
        "expected_settlement_date": settlement_date.isoformat(),
        "created_at": now.isoformat(),
        "settled_at": None,
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    
    await db.psp_settlements.insert_one(settlement_doc)
    
    # Mark transactions as pending settlement
    await db.transactions.update_many(
        {"transaction_id": {"$in": [tx["transaction_id"] for tx in pending_txs]}},
        {"$set": {"settlement_id": settlement_id, "settlement_status": "pending"}}
    )
    
    # Update PSP stats
    await db.psps.update_one(
        {"psp_id": psp_id},
        {"$inc": {"pending_settlement": net_amount}}
    )
    
    return await db.psp_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})

@api_router.post("/psp-settlements/{settlement_id}/complete")
async def complete_settlement(settlement_id: str, user: dict = Depends(require_admin)):
    """Mark a settlement as completed and transfer funds to treasury"""
    settlement = await db.psp_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    if settlement["status"] == PSPSettlementStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Settlement already completed")
    
    now = datetime.now(timezone.utc)
    
    # Update treasury balance
    await db.treasury_accounts.update_one(
        {"account_id": settlement["settlement_destination_id"]},
        {"$inc": {"balance": settlement["net_amount"]}, "$set": {"updated_at": now.isoformat()}}
    )
    
    # Update settlement status
    await db.psp_settlements.update_one(
        {"settlement_id": settlement_id},
        {"$set": {
            "status": PSPSettlementStatus.COMPLETED,
            "settled_at": now.isoformat()
        }}
    )
    
    # Mark transactions as settled
    await db.transactions.update_many(
        {"settlement_id": settlement_id},
        {"$set": {"settled": True, "settlement_status": "completed"}}
    )
    
    # Update PSP stats
    psp = await db.psps.find_one({"psp_id": settlement["psp_id"]}, {"_id": 0})
    if psp:
        await db.psps.update_one(
            {"psp_id": settlement["psp_id"]},
            {
                "$inc": {
                    "total_volume": settlement["gross_amount"],
                    "total_commission": settlement["commission_amount"],
                    "pending_settlement": -settlement["net_amount"]
                }
            }
        )
    
    return await db.psp_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})

# Get pending PSP transactions (not yet settled)
@api_router.get("/psp/{psp_id}/pending-transactions")
async def get_psp_pending_transactions(psp_id: str, user: dict = Depends(get_current_user)):
    """Get all pending/approved transactions for a PSP that haven't been settled"""
    transactions = await db.transactions.find({
        "psp_id": psp_id,
        "destination_type": "psp",
        "status": {"$in": [TransactionStatus.PENDING, TransactionStatus.APPROVED]},
        "settled": {"$ne": True}
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transactions

# Get PSP dashboard summary
@api_router.get("/psp-summary")
async def get_psp_summary(user: dict = Depends(get_current_user)):
    """Get summary of all PSPs with pending settlements"""
    psps = await db.psps.find({"status": PSPStatus.ACTIVE}, {"_id": 0}).to_list(1000)
    now = datetime.now(timezone.utc)
    
    result = []
    for psp in psps:
        # Get pending transactions count and amount
        pending_txs = await db.transactions.find({
            "psp_id": psp["psp_id"],
            "destination_type": "psp",
            "status": {"$in": [TransactionStatus.PENDING, TransactionStatus.APPROVED]},
            "settled": {"$ne": True}
        }, {"_id": 0}).to_list(1000)
        
        pending_count = len(pending_txs)
        pending_amount = sum(tx.get("psp_net_amount", tx.get("amount", 0)) for tx in pending_txs)
        
        # Check for overdue settlements
        overdue_count = 0
        for tx in pending_txs:
            exp_date = tx.get("psp_expected_settlement_date")
            if exp_date:
                exp_dt = datetime.fromisoformat(exp_date.replace('Z', '+00:00'))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt < now:
                    overdue_count += 1
        
        # Get settlement destination
        dest = await db.treasury_accounts.find_one({"account_id": psp.get("settlement_destination_id")}, {"_id": 0})
        
        result.append({
            **psp,
            "pending_transactions_count": pending_count,
            "pending_amount": pending_amount,
            "overdue_count": overdue_count,
            "settlement_destination_name": dest["account_name"] if dest else "Unknown",
            "settlement_destination_bank": dest.get("bank_name") if dest else None
        })
    
    return result

# Mark single PSP transaction as settled
@api_router.post("/psp/transactions/{transaction_id}/settle")
async def settle_psp_transaction(
    transaction_id: str, 
    destination_account_id: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    """Mark a single PSP transaction as settled and transfer to treasury"""
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.get("destination_type") != "psp":
        raise HTTPException(status_code=400, detail="Transaction is not a PSP transaction")
    
    if tx.get("settled"):
        raise HTTPException(status_code=400, detail="Transaction already settled")
    
    if tx.get("status") not in [TransactionStatus.APPROVED, TransactionStatus.COMPLETED, TransactionStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Transaction cannot be settled in current status")
    
    now = datetime.now(timezone.utc)
    
    # Get PSP info for destination
    psp = await db.psps.find_one({"psp_id": tx.get("psp_id")}, {"_id": 0})
    dest_account_id = destination_account_id or (psp.get("settlement_destination_id") if psp else None)
    
    if not dest_account_id:
        raise HTTPException(status_code=400, detail="No destination account specified")
    
    # Get destination account
    dest = await db.treasury_accounts.find_one({"account_id": dest_account_id}, {"_id": 0})
    if not dest:
        raise HTTPException(status_code=404, detail="Destination treasury account not found")
    
    # Amount to settle (net amount after commission)
    settle_amount = tx.get("psp_net_amount", tx.get("amount", 0))
    
    # Update treasury balance
    await db.treasury_accounts.update_one(
        {"account_id": dest_account_id},
        {"$inc": {"balance": settle_amount}, "$set": {"updated_at": now.isoformat()}}
    )
    
    # Mark transaction as settled
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "settled": True,
            "settlement_status": "completed",
            "settled_at": now.isoformat(),
            "settled_by": user["user_id"],
            "settled_by_name": user["name"],
            "settlement_destination_id": dest_account_id,
            "settlement_destination_name": dest["account_name"]
        }}
    )
    
    # Update PSP stats
    if psp:
        commission_amount = tx.get("psp_commission_amount", 0)
        await db.psps.update_one(
            {"psp_id": tx.get("psp_id")},
            {
                "$inc": {
                    "total_volume": tx.get("amount", 0),
                    "total_commission": commission_amount,
                    "pending_settlement": -settle_amount
                }
            }
        )
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

# ============== VENDOR ROUTES ==============

@api_router.get("/vendors")
async def get_vendors(user: dict = Depends(get_current_user)):
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(1000)
    # Get settlement destination names and pending amounts
    for vendor in vendors:
        if vendor.get("settlement_destination_id"):
            dest = await db.treasury_accounts.find_one({"account_id": vendor["settlement_destination_id"]}, {"_id": 0})
            vendor["settlement_destination_name"] = dest["account_name"] if dest else "Unknown"
            vendor["settlement_destination_bank"] = dest.get("bank_name") if dest else None
        
        # Calculate pending amounts from transactions
        pending_txs = await db.transactions.find({
            "vendor_id": vendor["vendor_id"],
            "destination_type": "vendor",
            "status": {"$in": [TransactionStatus.APPROVED, TransactionStatus.COMPLETED]},
            "settled": {"$ne": True}
        }, {"_id": 0}).to_list(1000)
        
        vendor["pending_transactions_count"] = len(pending_txs)
        vendor["pending_amount"] = sum(tx.get("amount", 0) for tx in pending_txs)
    
    return vendors

@api_router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, user: dict = Depends(get_current_user)):
    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@api_router.post("/vendors")
async def create_vendor(vendor_data: VendorCreate, user: dict = Depends(require_admin)):
    # Check if email already exists
    existing = await db.users.find_one({"email": vendor_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    vendor_id = f"vendor_{uuid.uuid4().hex[:12]}"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # Create user account for vendor
    user_doc = {
        "user_id": user_id,
        "email": vendor_data.email,
        "password_hash": hash_password(vendor_data.password),
        "name": vendor_data.vendor_name,
        "role": UserRole.VENDOR,
        "vendor_id": vendor_id,  # Link to vendor
        "picture": None,
        "is_active": True,
        "created_at": now.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create vendor record
    vendor_doc = {
        "vendor_id": vendor_id,
        "user_id": user_id,
        "vendor_name": vendor_data.vendor_name,
        "email": vendor_data.email,
        "deposit_commission": vendor_data.deposit_commission,
        "withdrawal_commission": vendor_data.withdrawal_commission,
        "description": vendor_data.description,
        "total_volume": 0.0,
        "total_commission": 0.0,
        "pending_settlement": 0.0,
        "status": VendorStatus.ACTIVE,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.vendors.insert_one(vendor_doc)
    return await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})

@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, update_data: VendorUpdate, user: dict = Depends(require_admin)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.vendors.update_one({"vendor_id": vendor_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update vendor name in user record if changed
    if updates.get("vendor_name"):
        vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
        if vendor:
            await db.users.update_one({"user_id": vendor["user_id"]}, {"$set": {"name": updates["vendor_name"]}})
    
    return await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, user: dict = Depends(require_admin)):
    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Delete vendor user account
    await db.users.delete_one({"user_id": vendor["user_id"]})
    
    # Delete vendor record
    await db.vendors.delete_one({"vendor_id": vendor_id})
    
    return {"message": "Vendor deleted"}

# Get vendor's assigned transactions (for vendor portal)
@api_router.get("/vendors/{vendor_id}/transactions")
async def get_vendor_transactions(
    vendor_id: str, 
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    # Vendors can only see their own transactions
    if user.get("role") == UserRole.VENDOR:
        user_vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if not user_vendor or user_vendor["vendor_id"] != vendor_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"vendor_id": vendor_id, "destination_type": "vendor"}
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return transactions

# Get current vendor info (for logged in vendor)
@api_router.get("/vendor/me")
async def get_my_vendor_info(user: dict = Depends(require_vendor)):
    vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get pending transactions
    pending_txs = await db.transactions.find({
        "vendor_id": vendor["vendor_id"],
        "destination_type": "vendor",
        "status": TransactionStatus.PENDING
    }, {"_id": 0}).to_list(1000)
    
    vendor["pending_transactions"] = pending_txs
    vendor["pending_count"] = len(pending_txs)
    
    return vendor

# Vendor approve transaction
@api_router.post("/vendor/transactions/{transaction_id}/approve")
async def vendor_approve_transaction(transaction_id: str, user: dict = Depends(require_vendor)):
    vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.get("vendor_id") != vendor["vendor_id"]:
        raise HTTPException(status_code=403, detail="Transaction does not belong to this vendor")
    
    if tx["status"] != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending")
    
    now = datetime.now(timezone.utc)
    
    updates = {
        "status": TransactionStatus.APPROVED,
        "processed_by": user["user_id"],
        "processed_by_name": user["name"],
        "processed_at": now.isoformat()
    }
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

# Vendor reject transaction
@api_router.post("/vendor/transactions/{transaction_id}/reject")
async def vendor_reject_transaction(
    transaction_id: str, 
    reason: str = "",
    user: dict = Depends(require_vendor)
):
    vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.get("vendor_id") != vendor["vendor_id"]:
        raise HTTPException(status_code=403, detail="Transaction does not belong to this vendor")
    
    if tx["status"] != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending")
    
    now = datetime.now(timezone.utc)
    
    updates = {
        "status": TransactionStatus.REJECTED,
        "rejection_reason": reason,
        "processed_by": user["user_id"],
        "processed_by_name": user["name"],
        "processed_at": now.isoformat()
    }
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

# Vendor complete withdrawal with screenshot upload
@api_router.post("/vendor/transactions/{transaction_id}/complete")
async def vendor_complete_withdrawal(
    transaction_id: str,
    proof_image: UploadFile = File(...),
    user: dict = Depends(require_vendor)
):
    vendor = await db.vendors.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx.get("vendor_id") != vendor["vendor_id"]:
        raise HTTPException(status_code=403, detail="Transaction does not belong to this vendor")
    
    if tx.get("transaction_type") != TransactionType.WITHDRAWAL:
        raise HTTPException(status_code=400, detail="Only withdrawals can be completed with proof")
    
    if tx["status"] not in [TransactionStatus.PENDING, TransactionStatus.APPROVED]:
        raise HTTPException(status_code=400, detail="Transaction cannot be completed in current status")
    
    now = datetime.now(timezone.utc)
    
    # Handle proof image upload
    content = await proof_image.read()
    proof_image_data = base64.b64encode(content).decode('utf-8')
    
    updates = {
        "status": TransactionStatus.COMPLETED,
        "vendor_proof_image": proof_image_data,
        "processed_by": user["user_id"],
        "processed_by_name": user["name"],
        "processed_at": now.isoformat()
    }
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

# Vendor settlements
@api_router.get("/vendors/{vendor_id}/settlements")
async def get_vendor_settlements(vendor_id: str, user: dict = Depends(get_current_user)):
    settlements = await db.vendor_settlements.find({"vendor_id": vendor_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return settlements

# Admin settle vendor balance
class VendorSettlementRequest(BaseModel):
    settlement_type: str  # "bank" or "cash"
    destination_account_id: str  # Required - treasury account
    commission_amount: float = 0  # Manual commission entry
    charges_amount: float = 0  # Additional charges/fees
    charges_description: Optional[str] = None
    # Multi-currency support
    source_currency: str = "USD"  # Currency of transactions
    destination_currency: str = "USD"  # Currency of destination treasury
    exchange_rate: float = 1.0  # Conversion rate
    settlement_amount_in_dest_currency: Optional[float] = None  # Final amount in destination currency

@api_router.post("/vendors/{vendor_id}/settle")
async def settle_vendor_balance(
    vendor_id: str, 
    settlement_request: VendorSettlementRequest,
    user: dict = Depends(require_admin)
):
    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get approved transactions for this vendor that haven't been settled
    pending_txs = await db.transactions.find({
        "vendor_id": vendor_id,
        "destination_type": "vendor",
        "status": {"$in": [TransactionStatus.APPROVED, TransactionStatus.COMPLETED]},
        "settled": {"$ne": True}
    }, {"_id": 0}).to_list(1000)
    
    if not pending_txs:
        raise HTTPException(status_code=400, detail="No pending transactions to settle")
    
    # Calculate amounts
    gross_amount = sum(tx["amount"] for tx in pending_txs)
    
    # Manual commission and charges
    commission_amount = settlement_request.commission_amount
    charges_amount = settlement_request.charges_amount
    
    # Net amount before currency conversion
    net_amount_source = gross_amount - commission_amount - charges_amount
    
    # Calculate settlement amount in destination currency
    if settlement_request.settlement_amount_in_dest_currency is not None:
        # Admin entered final amount directly
        settlement_amount = settlement_request.settlement_amount_in_dest_currency
    else:
        # Use exchange rate
        settlement_amount = round(net_amount_source * settlement_request.exchange_rate, 2)
    
    settlement_id = f"vstl_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    dest_account_id = settlement_request.destination_account_id
    dest = await db.treasury_accounts.find_one({"account_id": dest_account_id}, {"_id": 0})
    if not dest:
        raise HTTPException(status_code=404, detail="Settlement destination account not found")
    
    settlement_doc = {
        "settlement_id": settlement_id,
        "vendor_id": vendor_id,
        "vendor_name": vendor["vendor_name"],
        "settlement_type": settlement_request.settlement_type,
        "gross_amount": gross_amount,
        "source_currency": settlement_request.source_currency,
        "commission_amount": commission_amount,
        "charges_amount": charges_amount,
        "charges_description": settlement_request.charges_description,
        "net_amount_source": net_amount_source,
        "exchange_rate": settlement_request.exchange_rate,
        "destination_currency": settlement_request.destination_currency,
        "settlement_amount": settlement_amount,
        "transaction_count": len(pending_txs),
        "transaction_ids": [tx["transaction_id"] for tx in pending_txs],
        "settlement_destination_id": dest_account_id,
        "settlement_destination_name": dest["account_name"],
        "status": VendorSettlementStatus.PENDING,  # Settlements go to pending first
        "created_at": now.isoformat(),
        "settled_at": None,  # Will be set on approval
        "approved_at": None,
        "approved_by": None,
        "approved_by_name": None,
        "rejection_reason": None,
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    
    await db.vendor_settlements.insert_one(settlement_doc)
    
    # Mark transactions as pending settlement (not fully settled yet)
    await db.transactions.update_many(
        {"transaction_id": {"$in": [tx["transaction_id"] for tx in pending_txs]}},
        {"$set": {"settlement_id": settlement_id, "settlement_status": "pending_approval"}}
    )
    
    return await db.vendor_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})

# Get all pending settlements (for approval page)
@api_router.get("/settlements/pending")
async def get_pending_settlements(user: dict = Depends(require_accountant_or_admin)):
    """Get all pending vendor settlements awaiting approval"""
    settlements = await db.vendor_settlements.find(
        {"status": VendorSettlementStatus.PENDING}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return settlements

# Approve vendor settlement
@api_router.post("/settlements/{settlement_id}/approve")
async def approve_settlement(settlement_id: str, user: dict = Depends(require_accountant_or_admin)):
    """Approve a pending vendor settlement"""
    settlement = await db.vendor_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    if settlement["status"] != VendorSettlementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Settlement is not pending")
    
    now = datetime.now(timezone.utc)
    
    # Update settlement status
    await db.vendor_settlements.update_one(
        {"settlement_id": settlement_id},
        {"$set": {
            "status": VendorSettlementStatus.APPROVED,
            "approved_at": now.isoformat(),
            "approved_by": user["user_id"],
            "approved_by_name": user["name"],
            "settled_at": now.isoformat()
        }}
    )
    
    # Mark transactions as fully settled
    await db.transactions.update_many(
        {"settlement_id": settlement_id},
        {"$set": {"settled": True, "settlement_status": "completed"}}
    )
    
    # Update treasury balance with settlement amount
    await db.treasury_accounts.update_one(
        {"account_id": settlement["settlement_destination_id"]},
        {"$inc": {"balance": settlement["settlement_amount"]}, "$set": {"updated_at": now.isoformat()}}
    )
    
    # Update vendor stats
    await db.vendors.update_one(
        {"vendor_id": settlement["vendor_id"]},
        {
            "$inc": {
                "total_volume": settlement["gross_amount"],
                "total_commission": settlement["commission_amount"]
            }
        }
    )
    
    # Record treasury transaction for history
    treasury_tx_id = f"ttx_{uuid.uuid4().hex[:12]}"
    treasury_tx_doc = {
        "treasury_transaction_id": treasury_tx_id,
        "account_id": settlement["settlement_destination_id"],
        "transaction_type": "settlement_in",
        "amount": settlement["settlement_amount"],
        "currency": settlement["destination_currency"],
        "reference": f"Vendor Settlement: {settlement['vendor_name']}",
        "settlement_id": settlement_id,
        "vendor_id": settlement["vendor_id"],
        "created_at": now.isoformat(),
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    await db.treasury_transactions.insert_one(treasury_tx_doc)
    
    return await db.vendor_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})

# Reject vendor settlement
@api_router.post("/settlements/{settlement_id}/reject")
async def reject_settlement(settlement_id: str, reason: str = "", user: dict = Depends(require_accountant_or_admin)):
    """Reject a pending vendor settlement"""
    settlement = await db.vendor_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    if settlement["status"] != VendorSettlementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Settlement is not pending")
    
    now = datetime.now(timezone.utc)
    
    # Update settlement status
    await db.vendor_settlements.update_one(
        {"settlement_id": settlement_id},
        {"$set": {
            "status": VendorSettlementStatus.REJECTED,
            "rejection_reason": reason,
            "approved_at": now.isoformat(),
            "approved_by": user["user_id"],
            "approved_by_name": user["name"]
        }}
    )
    
    # Reset transaction settlement status so they can be settled again
    await db.transactions.update_many(
        {"settlement_id": settlement_id},
        {"$set": {"settlement_id": None, "settlement_status": None}}
    )
    
    return await db.vendor_settlements.find_one({"settlement_id": settlement_id}, {"_id": 0})

# ============== TRANSACTIONS ROUTES ==============

@api_router.get("/transactions")
async def get_transactions(
    user: dict = Depends(get_current_user),
    client_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if transaction_type:
        query["transaction_type"] = transaction_type
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return transactions

@api_router.get("/transactions/pending")
async def get_pending_transactions(user: dict = Depends(require_accountant_or_admin)):
    """Get all pending transactions for accountant approval"""
    transactions = await db.transactions.find(
        {"status": TransactionStatus.PENDING}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return transactions

@api_router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@api_router.post("/transactions")
async def create_transaction(
    client_id: str = Form(...),
    transaction_type: str = Form(...),
    amount: float = Form(...),
    currency: str = Form("USD"),
    base_currency: str = Form("USD"),
    base_amount: Optional[float] = Form(None),
    destination_type: str = Form("treasury"),
    destination_account_id: Optional[str] = Form(None),
    psp_id: Optional[str] = Form(None),
    vendor_id: Optional[str] = Form(None),
    commission_paid_by: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    reference: Optional[str] = Form(None),
    # Client bank details (for withdrawal to bank)
    client_bank_name: Optional[str] = Form(None),
    client_bank_account_name: Optional[str] = Form(None),
    client_bank_account_number: Optional[str] = Form(None),
    client_bank_swift_iban: Optional[str] = Form(None),
    client_bank_currency: Optional[str] = Form(None),
    save_bank_to_client: Optional[str] = Form(None),  # 'true' to save bank to client profile
    # Client USDT details (for withdrawal to USDT)
    client_usdt_address: Optional[str] = Form(None),
    client_usdt_network: Optional[str] = Form(None),
    proof_image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    # Verify client exists
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify destination based on type
    destination_account = None
    psp_info = None
    vendor_info = None
    
    if destination_type == "treasury" and destination_account_id:
        destination_account = await db.treasury_accounts.find_one({"account_id": destination_account_id}, {"_id": 0})
        if not destination_account:
            raise HTTPException(status_code=404, detail="Destination account not found")
    elif destination_type == "usdt" and destination_account_id:
        # For USDT deposits, select the USDT treasury account
        destination_account = await db.treasury_accounts.find_one({"account_id": destination_account_id}, {"_id": 0})
        if not destination_account:
            raise HTTPException(status_code=404, detail="USDT treasury account not found")
    elif destination_type == "psp" and psp_id:
        psp_info = await db.psps.find_one({"psp_id": psp_id}, {"_id": 0})
        if not psp_info:
            raise HTTPException(status_code=404, detail="PSP not found")
    elif destination_type == "vendor" and vendor_id:
        vendor_info = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
        if not vendor_info:
            raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Save bank account to client profile if requested
    if destination_type == "bank" and save_bank_to_client == "true" and client_bank_name and client_bank_account_number:
        existing_bank = await db.client_bank_accounts.find_one({
            "client_id": client_id,
            "account_number": client_bank_account_number,
            "bank_name": client_bank_name
        })
        if not existing_bank:
            bank_account_id = f"cba_{uuid.uuid4().hex[:12]}"
            bank_doc = {
                "bank_account_id": bank_account_id,
                "client_id": client_id,
                "bank_name": client_bank_name,
                "account_name": client_bank_account_name,
                "account_number": client_bank_account_number,
                "swift_iban": client_bank_swift_iban,
                "currency": client_bank_currency or "USD",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user["user_id"]
            }
            await db.client_bank_accounts.insert_one(bank_doc)
    
    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # Handle proof image upload
    proof_image_data = None
    if proof_image:
        content = await proof_image.read()
        proof_image_data = base64.b64encode(content).decode('utf-8')
    
    # Calculate USD amount if base currency is different
    usd_amount = amount
    if base_currency and base_currency != "USD" and base_amount:
        usd_amount = convert_to_usd(base_amount, base_currency)
    
    # Calculate PSP commission if applicable
    commission_amount = 0.0
    net_amount = usd_amount
    expected_settlement_date = None
    
    if destination_type == "psp" and psp_info:
        commission_rate = psp_info.get("commission_rate", 0) / 100
        commission_amount = round(usd_amount * commission_rate, 2)
        
        # If commission paid by client, net amount is reduced
        if commission_paid_by == CommissionPaidBy.CLIENT:
            net_amount = usd_amount - commission_amount
        # If commission paid by broker, net amount stays same (broker absorbs)
        
        # Calculate expected settlement date
        settlement_days = psp_info.get("settlement_days", 1)
        expected_settlement_date = (now + timedelta(days=settlement_days)).isoformat()
    
    tx_doc = {
        "transaction_id": tx_id,
        "client_id": client_id,
        "client_name": f"{client['first_name']} {client['last_name']}",
        "transaction_type": transaction_type,
        "amount": usd_amount,
        "currency": "USD",
        "base_currency": base_currency or "USD",
        "base_amount": base_amount if base_currency != "USD" else None,
        "destination_type": destination_type,
        "destination_account_id": destination_account_id if destination_type in ["treasury", "usdt"] else None,
        "destination_account_name": destination_account["account_name"] if destination_account else None,
        "destination_bank_name": destination_account["bank_name"] if destination_account else None,
        # Client bank details (for withdrawal to bank)
        "client_bank_name": client_bank_name if destination_type == "bank" else None,
        "client_bank_account_name": client_bank_account_name if destination_type == "bank" else None,
        "client_bank_account_number": client_bank_account_number if destination_type == "bank" else None,
        "client_bank_swift_iban": client_bank_swift_iban if destination_type == "bank" else None,
        "client_bank_currency": client_bank_currency if destination_type == "bank" else None,
        # Client USDT details (for withdrawal to USDT)
        "client_usdt_address": client_usdt_address if destination_type == "usdt" else None,
        "client_usdt_network": client_usdt_network if destination_type == "usdt" else None,
        "psp_id": psp_id if destination_type == "psp" else None,
        "psp_name": psp_info["psp_name"] if psp_info else None,
        "psp_commission_rate": psp_info["commission_rate"] if psp_info else None,
        "psp_commission_amount": commission_amount if psp_info else None,
        "psp_commission_paid_by": commission_paid_by if psp_info else None,
        "psp_net_amount": net_amount if psp_info else None,
        "psp_expected_settlement_date": expected_settlement_date,
        "vendor_id": vendor_id if destination_type == "vendor" else None,
        "vendor_name": vendor_info["vendor_name"] if vendor_info else None,
        "vendor_deposit_commission": vendor_info["deposit_commission"] if vendor_info and transaction_type == TransactionType.DEPOSIT else None,
        "vendor_withdrawal_commission": vendor_info["withdrawal_commission"] if vendor_info and transaction_type == TransactionType.WITHDRAWAL else None,
        "vendor_proof_image": None,  # Vendor uploads when completing withdrawal
        "accountant_proof_image": None,  # Accountant uploads for withdrawal approvals
        "status": TransactionStatus.PENDING,
        "description": description,
        "reference": reference or f"REF{uuid.uuid4().hex[:8].upper()}",
        "proof_image": proof_image_data,
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "processed_by": None,
        "processed_by_name": None,
        "rejection_reason": None,
        "settled": False,
        "settlement_id": None,
        "settlement_status": None,
        "created_at": now.isoformat(),
        "processed_at": None
    }
    
    await db.transactions.insert_one(tx_doc)
    
    # Update PSP pending balance if this is a PSP transaction
    if destination_type == "psp" and psp_info:
        await db.psps.update_one(
            {"psp_id": psp_id},
            {"$inc": {"pending_settlement": net_amount}}
        )
    
    # Update vendor pending balance if this is a vendor transaction
    if destination_type == "vendor" and vendor_info:
        await db.vendors.update_one(
            {"vendor_id": vendor_id},
            {"$inc": {"pending_settlement": usd_amount}}
        )
    
    result = await db.transactions.find_one({"transaction_id": tx_id}, {"_id": 0})
    return result

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, update_data: TransactionUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    now = datetime.now(timezone.utc)
    
    # If approving/completing or rejecting transaction
    if updates.get("status") in [TransactionStatus.APPROVED, TransactionStatus.COMPLETED, TransactionStatus.REJECTED]:
        updates["processed_by"] = user["user_id"]
        updates["processed_by_name"] = user["name"]
        updates["processed_at"] = now.isoformat()
        
        # Update treasury balance if completed
        if updates.get("status") == TransactionStatus.COMPLETED and tx.get("destination_account_id"):
            balance_change = tx["amount"] if tx["transaction_type"] == TransactionType.DEPOSIT else -tx["amount"]
            await db.treasury_accounts.update_one(
                {"account_id": tx["destination_account_id"]},
                {"$inc": {"balance": balance_change}, "$set": {"updated_at": now.isoformat()}}
            )
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

@api_router.post("/transactions/{transaction_id}/approve")
async def approve_transaction(
    transaction_id: str, 
    source_account_id: Optional[str] = None,
    user: dict = Depends(require_accountant_or_admin)
):
    """Approve a pending transaction"""
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx["status"] != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending")
    
    now = datetime.now(timezone.utc)
    
    updates = {
        "status": TransactionStatus.APPROVED,
        "processed_by": user["user_id"],
        "processed_by_name": user["name"],
        "processed_at": now.isoformat()
    }
    
    # For withdrawals with bank/usdt destination, require source account
    if tx["transaction_type"] == TransactionType.WITHDRAWAL:
        if tx.get("destination_type") in ["bank", "usdt"]:
            if not source_account_id:
                raise HTTPException(status_code=400, detail="Source account is required for withdrawal approvals")
            
            # Verify source account exists and has sufficient balance
            source_account = await db.treasury_accounts.find_one({"account_id": source_account_id}, {"_id": 0})
            if not source_account:
                raise HTTPException(status_code=404, detail="Source account not found")
            
            if source_account.get("balance", 0) < tx["amount"]:
                raise HTTPException(status_code=400, detail="Insufficient balance in source account")
            
            # Deduct from source account
            await db.treasury_accounts.update_one(
                {"account_id": source_account_id},
                {"$inc": {"balance": -tx["amount"]}, "$set": {"updated_at": now.isoformat()}}
            )
            
            updates["source_account_id"] = source_account_id
            updates["source_account_name"] = source_account.get("account_name")
            
            # Record treasury transaction
            treasury_tx_id = f"ttx_{uuid.uuid4().hex[:12]}"
            treasury_tx_doc = {
                "treasury_transaction_id": treasury_tx_id,
                "account_id": source_account_id,
                "transaction_type": "withdrawal",
                "amount": -tx["amount"],
                "currency": source_account.get("currency", "USD"),
                "reference": f"Withdrawal: {tx.get('client_name', 'Client')} - {tx.get('reference', '')}",
                "transaction_id": transaction_id,
                "client_id": tx.get("client_id"),
                "created_at": now.isoformat(),
                "created_by": user["user_id"],
                "created_by_name": user["name"]
            }
            await db.treasury_transactions.insert_one(treasury_tx_doc)
    
    # Update treasury balance for deposits going to treasury
    if tx.get("destination_account_id") and tx["transaction_type"] == TransactionType.DEPOSIT:
        await db.treasury_accounts.update_one(
            {"account_id": tx["destination_account_id"]},
            {"$inc": {"balance": tx["amount"]}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Record treasury transaction for deposit
        treasury_tx_id = f"ttx_{uuid.uuid4().hex[:12]}"
        treasury_tx_doc = {
            "treasury_transaction_id": treasury_tx_id,
            "account_id": tx["destination_account_id"],
            "transaction_type": "deposit",
            "amount": tx["amount"],
            "currency": "USD",
            "reference": f"Deposit: {tx.get('client_name', 'Client')} - {tx.get('reference', '')}",
            "transaction_id": transaction_id,
            "client_id": tx.get("client_id"),
            "created_at": now.isoformat(),
            "created_by": user["user_id"],
            "created_by_name": user["name"]
        }
        await db.treasury_transactions.insert_one(treasury_tx_doc)
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

@api_router.post("/transactions/{transaction_id}/upload-proof")
async def upload_withdrawal_proof(
    transaction_id: str,
    proof_image: UploadFile = File(...),
    user: dict = Depends(require_accountant_or_admin)
):
    """Upload proof of payment for withdrawal transactions"""
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Allow uploading proof for pending withdrawals
    if tx["transaction_type"] != TransactionType.WITHDRAWAL:
        raise HTTPException(status_code=400, detail="Proof upload is only for withdrawal transactions")
    
    content = await proof_image.read()
    proof_image_data = base64.b64encode(content).decode('utf-8')
    
    now = datetime.now(timezone.utc)
    await db.transactions.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "accountant_proof_image": proof_image_data,
            "proof_uploaded_at": now.isoformat(),
            "proof_uploaded_by": user["user_id"],
            "proof_uploaded_by_name": user["name"]
        }}
    )
    
    return {"message": "Proof uploaded successfully", "transaction_id": transaction_id}

@api_router.post("/transactions/{transaction_id}/reject")
async def reject_transaction(transaction_id: str, reason: str = "", user: dict = Depends(require_accountant_or_admin)):
    """Reject a pending transaction"""
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if tx["status"] != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending")
    
    now = datetime.now(timezone.utc)
    
    updates = {
        "status": TransactionStatus.REJECTED,
        "rejection_reason": reason,
        "processed_by": user["user_id"],
        "processed_by_name": user["name"],
        "processed_at": now.isoformat()
    }
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

# ============== REPORTS/ANALYTICS ROUTES ==============

@api_router.get("/reports/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    # Get client stats
    total_clients = await db.clients.count_documents({})
    approved_clients = await db.clients.count_documents({"kyc_status": ClientStatus.APPROVED})
    pending_clients = await db.clients.count_documents({"kyc_status": ClientStatus.PENDING})
    
    # Get treasury stats
    total_treasury = await db.treasury_accounts.count_documents({})
    active_treasury = await db.treasury_accounts.count_documents({"status": TreasuryAccountStatus.ACTIVE})
    
    # Get total treasury balance in USD (converting all currencies)
    all_accounts = await db.treasury_accounts.find({"status": TreasuryAccountStatus.ACTIVE}, {"_id": 0}).to_list(1000)
    total_balance_usd = sum(convert_to_usd(acc.get("balance", 0), acc.get("currency", "USD")) for acc in all_accounts)
    
    # Get transaction stats
    total_transactions = await db.transactions.count_documents({})
    pending_transactions = await db.transactions.count_documents({"status": TransactionStatus.PENDING})
    
    # Get deposits/withdrawals totals
    deposit_pipeline = [
        {"$match": {"transaction_type": TransactionType.DEPOSIT, "status": {"$in": [TransactionStatus.APPROVED, TransactionStatus.COMPLETED]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    withdrawal_pipeline = [
        {"$match": {"transaction_type": TransactionType.WITHDRAWAL, "status": {"$in": [TransactionStatus.APPROVED, TransactionStatus.COMPLETED]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    deposit_result = await db.transactions.aggregate(deposit_pipeline).to_list(1)
    withdrawal_result = await db.transactions.aggregate(withdrawal_pipeline).to_list(1)
    
    total_deposits = deposit_result[0]["total"] if deposit_result else 0
    total_withdrawals = withdrawal_result[0]["total"] if withdrawal_result else 0
    
    return {
        "clients": {
            "total": total_clients,
            "approved": approved_clients,
            "pending": pending_clients
        },
        "treasury": {
            "total": total_treasury,
            "active": active_treasury,
            "total_balance": total_balance_usd
        },
        "transactions": {
            "total": total_transactions,
            "pending": pending_transactions,
            "total_deposits": total_deposits,
            "total_withdrawals": total_withdrawals
        }
    }

@api_router.get("/reports/transactions-summary")
async def get_transactions_summary(
    user: dict = Depends(get_current_user),
    days: int = 30
):
    from_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    pipeline = [
        {"$addFields": {
            "created_date": {"$dateFromString": {"dateString": "$created_at"}}
        }},
        {"$match": {"created_date": {"$gte": from_date}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_date"}},
                "type": "$transaction_type"
            },
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }},
        {"$sort": {"_id.date": 1}}
    ]
    
    results = await db.transactions.aggregate(pipeline).to_list(1000)
    
    summary = {}
    for r in results:
        date = r["_id"]["date"]
        tx_type = r["_id"]["type"]
        if date not in summary:
            summary[date] = {"date": date, "deposits": 0, "withdrawals": 0}
        if tx_type == TransactionType.DEPOSIT:
            summary[date]["deposits"] = r["total_amount"]
        elif tx_type == TransactionType.WITHDRAWAL:
            summary[date]["withdrawals"] = r["total_amount"]
    
    return list(summary.values())

@api_router.get("/reports/client-analytics")
async def get_client_analytics(user: dict = Depends(get_current_user)):
    # KYC status distribution
    kyc_pipeline = [
        {"$group": {"_id": "$kyc_status", "count": {"$sum": 1}}}
    ]
    kyc_stats = await db.clients.aggregate(kyc_pipeline).to_list(10)
    
    # Country distribution
    country_pipeline = [
        {"$match": {"country": {"$ne": None}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    country_stats = await db.clients.aggregate(country_pipeline).to_list(10)
    
    return {
        "kyc_distribution": [{"status": s["_id"], "count": s["count"]} for s in kyc_stats],
        "country_distribution": [{"country": c["_id"], "count": c["count"]} for c in country_stats]
    }

@api_router.get("/reports/recent-activity")
async def get_recent_activity(user: dict = Depends(get_current_user), limit: int = 10):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    return {
        "recent_transactions": transactions,
        "recent_clients": clients
    }

# ============== SEED DATA ROUTE ==============

@api_router.post("/seed")
async def seed_demo_data():
    """Seed demo data for testing"""
    now = datetime.now(timezone.utc)
    
    # Create admin user if not exists
    admin = await db.users.find_one({"email": "admin@fxbroker.com"}, {"_id": 0})
    if not admin:
        admin_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "admin@fxbroker.com",
            "password_hash": hash_password("admin123"),
            "name": "System Admin",
            "role": UserRole.ADMIN,
            "picture": None,
            "is_active": True,
            "created_at": now.isoformat()
        }
        await db.users.insert_one(admin_doc)
    
    # Create accountant user if not exists
    accountant = await db.users.find_one({"email": "accountant@fxbroker.com"}, {"_id": 0})
    if not accountant:
        accountant_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "accountant@fxbroker.com",
            "password_hash": hash_password("accountant123"),
            "name": "Finance Manager",
            "role": UserRole.ACCOUNTANT,
            "picture": None,
            "is_active": True,
            "created_at": now.isoformat()
        }
        await db.users.insert_one(accountant_doc)
    
    # Create treasury accounts
    treasury_accounts_data = [
        {"account_name": "Main Operating Account", "account_type": "bank", "bank_name": "Chase Bank", "account_number": "****1234", "currency": "USD"},
        {"account_name": "Client Funds Account", "account_type": "bank", "bank_name": "Bank of America", "account_number": "****5678", "currency": "USD"},
        {"account_name": "EUR Account", "account_type": "bank", "bank_name": "Deutsche Bank", "account_number": "****9012", "currency": "EUR"},
        {"account_name": "AED Account", "account_type": "bank", "bank_name": "Emirates NBD", "account_number": "****3456", "currency": "AED"},
    ]
    
    treasury_ids = []
    for ta in treasury_accounts_data:
        existing = await db.treasury_accounts.find_one({"account_name": ta["account_name"]}, {"_id": 0})
        if not existing:
            account_id = f"treasury_{uuid.uuid4().hex[:12]}"
            ta_doc = {
                "account_id": account_id,
                **ta,
                "balance": 50000.0,
                "status": TreasuryAccountStatus.ACTIVE,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.treasury_accounts.insert_one(ta_doc)
            treasury_ids.append(account_id)
        else:
            treasury_ids.append(existing["account_id"])
    
    # Create sample clients
    sample_clients = [
        {"first_name": "John", "last_name": "Smith", "email": "john.smith@email.com", "phone": "+1234567890", "country": "USA", "kyc_status": ClientStatus.APPROVED},
        {"first_name": "Emma", "last_name": "Wilson", "email": "emma.wilson@email.com", "phone": "+4477889900", "country": "UK", "kyc_status": ClientStatus.APPROVED},
        {"first_name": "Michael", "last_name": "Brown", "email": "michael.brown@email.com", "phone": "+6199887766", "country": "Australia", "kyc_status": ClientStatus.PENDING},
        {"first_name": "Sarah", "last_name": "Davis", "email": "sarah.davis@email.com", "phone": "+4912345678", "country": "Germany", "kyc_status": ClientStatus.APPROVED},
        {"first_name": "James", "last_name": "Miller", "email": "james.miller@email.com", "phone": "+8187654321", "country": "Japan", "kyc_status": ClientStatus.PENDING},
    ]
    
    client_ids = []
    for c in sample_clients:
        existing = await db.clients.find_one({"email": c["email"]}, {"_id": 0})
        if not existing:
            client_id = f"client_{uuid.uuid4().hex[:12]}"
            client_doc = {
                "client_id": client_id,
                **c,
                "kyc_documents": [],
                "notes": None,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.clients.insert_one(client_doc)
            client_ids.append(client_id)
        else:
            client_ids.append(existing["client_id"])
    
    # Create sample transactions
    for i, client_id in enumerate(client_ids[:3]):
        client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
        if client:
            tx_id = f"tx_{uuid.uuid4().hex[:12]}"
            tx_doc = {
                "transaction_id": tx_id,
                "client_id": client_id,
                "client_name": f"{client['first_name']} {client['last_name']}",
                "transaction_type": TransactionType.DEPOSIT,
                "amount": [5000, 10000, 3000][i],
                "currency": "USD",
                "base_currency": "USD",
                "base_amount": None,
                "destination_type": "treasury",
                "destination_account_id": treasury_ids[0] if treasury_ids else None,
                "destination_account_name": "Main Operating Account",
                "destination_bank_name": "Chase Bank",
                "psp_id": None,
                "psp_name": None,
                "psp_commission_rate": None,
                "status": TransactionStatus.PENDING,
                "description": "Initial deposit",
                "reference": f"DEP{uuid.uuid4().hex[:8].upper()}",
                "proof_image": None,
                "created_by": None,
                "created_by_name": "System",
                "processed_by": None,
                "processed_by_name": None,
                "rejection_reason": None,
                "settled": False,
                "settlement_id": None,
                "settlement_status": None,
                "created_at": (now - timedelta(days=i+1)).isoformat(),
                "processed_at": None
            }
            await db.transactions.insert_one(tx_doc)
    
    # Create sample PSPs
    psp_data = [
        {"psp_name": "Stripe", "commission_rate": 2.9, "settlement_days": 2, "description": "Credit card payments"},
        {"psp_name": "PayPal", "commission_rate": 3.5, "settlement_days": 3, "description": "PayPal payments"},
        {"psp_name": "Skrill", "commission_rate": 2.5, "settlement_days": 1, "description": "E-wallet payments"},
    ]
    
    for psp in psp_data:
        existing = await db.psps.find_one({"psp_name": psp["psp_name"]}, {"_id": 0})
        if not existing and treasury_ids:
            psp_id = f"psp_{uuid.uuid4().hex[:12]}"
            psp_doc = {
                "psp_id": psp_id,
                "psp_name": psp["psp_name"],
                "commission_rate": psp["commission_rate"],
                "settlement_days": psp["settlement_days"],
                "settlement_destination_id": treasury_ids[0],  # Main Operating Account
                "min_settlement_amount": 100,
                "description": psp["description"],
                "total_volume": 0.0,
                "total_commission": 0.0,
                "pending_settlement": 0.0,
                "status": PSPStatus.ACTIVE,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.psps.insert_one(psp_doc)
    
    # Create sample vendors
    vendor_data = [
        {"vendor_name": "MoneyExchange Pro", "email": "vendor1@fxbroker.com", "password": "vendor123", "deposit_commission": 1.5, "withdrawal_commission": 2.0, "bank_settlement_commission": 0.5, "cash_settlement_commission": 1.0, "description": "Premium exchange vendor"},
        {"vendor_name": "FastPay Solutions", "email": "vendor2@fxbroker.com", "password": "vendor123", "deposit_commission": 2.0, "withdrawal_commission": 2.5, "bank_settlement_commission": 0.3, "cash_settlement_commission": 0.8, "description": "Fast payment processing"},
    ]
    
    for v in vendor_data:
        existing = await db.vendors.find_one({"vendor_name": v["vendor_name"]}, {"_id": 0})
        if not existing and treasury_ids:
            vendor_id = f"vendor_{uuid.uuid4().hex[:12]}"
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            
            # Create user account for vendor
            user_doc = {
                "user_id": user_id,
                "email": v["email"],
                "password_hash": hash_password(v["password"]),
                "name": v["vendor_name"],
                "role": UserRole.VENDOR,
                "vendor_id": vendor_id,
                "picture": None,
                "is_active": True,
                "created_at": now.isoformat()
            }
            await db.users.insert_one(user_doc)
            
            vendor_doc = {
                "vendor_id": vendor_id,
                "user_id": user_id,
                "vendor_name": v["vendor_name"],
                "email": v["email"],
                "deposit_commission": v["deposit_commission"],
                "withdrawal_commission": v["withdrawal_commission"],
                "bank_settlement_commission": v["bank_settlement_commission"],
                "cash_settlement_commission": v["cash_settlement_commission"],
                "settlement_destination_id": treasury_ids[0],
                "description": v["description"],
                "total_volume": 0.0,
                "total_commission": 0.0,
                "pending_settlement": 0.0,
                "status": VendorStatus.ACTIVE,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.vendors.insert_one(vendor_doc)
    
    return {"message": "Demo data seeded successfully"}

# ============== INCOME & EXPENSES ROUTES ==============

@api_router.get("/income-expenses")
async def get_income_expenses(
    entry_type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    treasury_account_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user)
):
    """Get all income and expense entries with optional filters"""
    query = {}
    
    if entry_type:
        query["entry_type"] = entry_type
    if category:
        query["category"] = category
    if treasury_account_id:
        query["treasury_account_id"] = treasury_account_id
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    entries = await db.income_expenses.find(query, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    
    # Get treasury account names
    for entry in entries:
        if entry.get("treasury_account_id"):
            acc = await db.treasury_accounts.find_one({"account_id": entry["treasury_account_id"]}, {"_id": 0})
            entry["treasury_account_name"] = acc["account_name"] if acc else "Unknown"
    
    return entries

@api_router.get("/income-expenses/{entry_id}")
async def get_income_expense(entry_id: str, user: dict = Depends(get_current_user)):
    """Get a single income/expense entry"""
    entry = await db.income_expenses.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@api_router.post("/income-expenses")
async def create_income_expense(entry_data: IncomeExpenseCreate, user: dict = Depends(get_current_user)):
    """Create a new income or expense entry"""
    # Verify treasury account exists
    treasury = await db.treasury_accounts.find_one({"account_id": entry_data.treasury_account_id}, {"_id": 0})
    if not treasury:
        raise HTTPException(status_code=404, detail="Treasury account not found")
    
    if entry_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    entry_id = f"ie_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    entry_date = entry_data.date if entry_data.date else now.isoformat()[:10]
    
    # Calculate USD equivalent
    amount_usd = convert_to_usd(entry_data.amount, entry_data.currency)
    
    entry_doc = {
        "entry_id": entry_id,
        "entry_type": entry_data.entry_type,
        "category": entry_data.category,
        "custom_category": entry_data.custom_category,
        "amount": entry_data.amount,
        "currency": entry_data.currency,
        "amount_usd": amount_usd,
        "treasury_account_id": entry_data.treasury_account_id,
        "description": entry_data.description,
        "reference": entry_data.reference,
        "date": entry_date,
        "created_at": now.isoformat(),
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    
    await db.income_expenses.insert_one(entry_doc)
    
    # Update treasury account balance
    if entry_data.entry_type == IncomeExpenseType.INCOME:
        # Credit income to treasury
        await db.treasury_accounts.update_one(
            {"account_id": entry_data.treasury_account_id},
            {"$inc": {"balance": entry_data.amount}, "$set": {"updated_at": now.isoformat()}}
        )
    else:
        # Deduct expense from treasury
        if treasury.get("balance", 0) < entry_data.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance in treasury account")
        await db.treasury_accounts.update_one(
            {"account_id": entry_data.treasury_account_id},
            {"$inc": {"balance": -entry_data.amount}, "$set": {"updated_at": now.isoformat()}}
        )
    
    # Record in treasury transactions
    tx_id = f"ttx_{uuid.uuid4().hex[:12]}"
    tx_type = "income" if entry_data.entry_type == IncomeExpenseType.INCOME else "expense"
    tx_amount = entry_data.amount if entry_data.entry_type == IncomeExpenseType.INCOME else -entry_data.amount
    
    tx_doc = {
        "treasury_transaction_id": tx_id,
        "account_id": entry_data.treasury_account_id,
        "transaction_type": tx_type,
        "amount": tx_amount,
        "currency": entry_data.currency,
        "reference": f"{entry_data.category.replace('_', ' ').title()}: {entry_data.description or 'N/A'}",
        "income_expense_id": entry_id,
        "created_at": now.isoformat(),
        "created_by": user["user_id"],
        "created_by_name": user["name"]
    }
    await db.treasury_transactions.insert_one(tx_doc)
    
    entry_doc.pop("_id", None)
    entry_doc["treasury_account_name"] = treasury["account_name"]
    return entry_doc

@api_router.put("/income-expenses/{entry_id}")
async def update_income_expense(entry_id: str, update_data: IncomeExpenseUpdate, user: dict = Depends(get_current_user)):
    """Update an income/expense entry (only description, reference, category - not amount)"""
    entry = await db.income_expenses.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Don't allow amount changes (would need to reverse treasury changes)
    if "amount" in update_dict:
        del update_dict["amount"]
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.income_expenses.update_one({"entry_id": entry_id}, {"$set": update_dict})
    
    updated = await db.income_expenses.find_one({"entry_id": entry_id}, {"_id": 0})
    return updated

@api_router.delete("/income-expenses/{entry_id}")
async def delete_income_expense(entry_id: str, user: dict = Depends(require_admin)):
    """Delete an income/expense entry and reverse treasury balance"""
    entry = await db.income_expenses.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    now = datetime.now(timezone.utc)
    
    # Reverse the treasury balance change
    if entry["entry_type"] == IncomeExpenseType.INCOME:
        # Reverse income - deduct from treasury
        await db.treasury_accounts.update_one(
            {"account_id": entry["treasury_account_id"]},
            {"$inc": {"balance": -entry["amount"]}, "$set": {"updated_at": now.isoformat()}}
        )
    else:
        # Reverse expense - credit to treasury
        await db.treasury_accounts.update_one(
            {"account_id": entry["treasury_account_id"]},
            {"$inc": {"balance": entry["amount"]}, "$set": {"updated_at": now.isoformat()}}
        )
    
    # Delete the entry
    await db.income_expenses.delete_one({"entry_id": entry_id})
    
    # Delete related treasury transaction
    await db.treasury_transactions.delete_one({"income_expense_id": entry_id})
    
    return {"message": "Entry deleted successfully"}

@api_router.get("/income-expenses/reports/summary")
async def get_income_expense_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get income vs expense summary report"""
    query = {}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    # Get all entries
    entries = await db.income_expenses.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(e["amount_usd"] for e in entries if e["entry_type"] == IncomeExpenseType.INCOME)
    total_expense = sum(e["amount_usd"] for e in entries if e["entry_type"] == IncomeExpenseType.EXPENSE)
    net_profit = total_income - total_expense
    
    # Category breakdown
    income_by_category = {}
    expense_by_category = {}
    
    for entry in entries:
        cat = entry.get("custom_category") or entry["category"]
        amount = entry["amount_usd"]
        if entry["entry_type"] == IncomeExpenseType.INCOME:
            income_by_category[cat] = income_by_category.get(cat, 0) + amount
        else:
            expense_by_category[cat] = expense_by_category.get(cat, 0) + amount
    
    return {
        "total_income_usd": round(total_income, 2),
        "total_expense_usd": round(total_expense, 2),
        "net_profit_usd": round(net_profit, 2),
        "income_by_category": {k: round(v, 2) for k, v in income_by_category.items()},
        "expense_by_category": {k: round(v, 2) for k, v in expense_by_category.items()},
        "entry_count": len(entries)
    }

@api_router.get("/income-expenses/reports/monthly")
async def get_monthly_report(
    year: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    """Get monthly P&L report"""
    if not year:
        year = datetime.now().year
    
    # Get entries for the year
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    
    entries = await db.income_expenses.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    # Group by month
    monthly_data = {}
    for month in range(1, 13):
        month_str = f"{year}-{month:02d}"
        monthly_data[month_str] = {"income": 0, "expense": 0}
    
    for entry in entries:
        month_str = entry["date"][:7]  # YYYY-MM
        if month_str in monthly_data:
            if entry["entry_type"] == IncomeExpenseType.INCOME:
                monthly_data[month_str]["income"] += entry["amount_usd"]
            else:
                monthly_data[month_str]["expense"] += entry["amount_usd"]
    
    # Calculate net for each month
    result = []
    for month, data in monthly_data.items():
        result.append({
            "month": month,
            "income": round(data["income"], 2),
            "expense": round(data["expense"], 2),
            "net": round(data["income"] - data["expense"], 2)
        })
    
    return result

@api_router.get("/income-expenses/categories")
async def get_categories(user: dict = Depends(get_current_user)):
    """Get available categories and custom categories"""
    income_categories = [
        {"value": "commission", "label": "Commission Income"},
        {"value": "service_fee", "label": "Service Fees"},
        {"value": "interest", "label": "Interest Income"},
        {"value": "other", "label": "Other Income"},
    ]
    
    expense_categories = [
        {"value": "bank_fee", "label": "Bank Fees"},
        {"value": "transfer_charge", "label": "Transfer Charges"},
        {"value": "vendor_payment", "label": "Vendor Payments"},
        {"value": "operational", "label": "Operational Costs"},
        {"value": "marketing", "label": "Marketing"},
        {"value": "software", "label": "Software/Subscriptions"},
        {"value": "other", "label": "Other Expenses"},
    ]
    
    # Get custom categories from existing entries
    custom_income = await db.income_expenses.distinct("custom_category", {"entry_type": "income", "custom_category": {"$ne": None}})
    custom_expense = await db.income_expenses.distinct("custom_category", {"entry_type": "expense", "custom_category": {"$ne": None}})
    
    return {
        "income_categories": income_categories,
        "expense_categories": expense_categories,
        "custom_income_categories": custom_income,
        "custom_expense_categories": custom_expense
    }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
