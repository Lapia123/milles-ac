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

class TreasuryAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

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
    destination_type: str = "treasury"  # "treasury" or "psp"
    destination_account_id: Optional[str] = None
    psp_id: Optional[str] = None
    description: Optional[str] = None
    reference: Optional[str] = None

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

@api_router.delete("/treasury/{account_id}")
async def delete_treasury_account(account_id: str, user: dict = Depends(require_admin)):
    result = await db.treasury_accounts.delete_one({"account_id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Treasury account not found")
    return {"message": "Treasury account deleted"}

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
    destination_account_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    reference: Optional[str] = Form(None),
    proof_image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    # Verify client exists
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify destination account if provided
    destination_account = None
    if destination_account_id:
        destination_account = await db.treasury_accounts.find_one({"account_id": destination_account_id}, {"_id": 0})
        if not destination_account:
            raise HTTPException(status_code=404, detail="Destination account not found")
    
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
    
    tx_doc = {
        "transaction_id": tx_id,
        "client_id": client_id,
        "client_name": f"{client['first_name']} {client['last_name']}",
        "transaction_type": transaction_type,
        "amount": usd_amount,
        "currency": "USD",
        "base_currency": base_currency or "USD",
        "base_amount": base_amount if base_currency != "USD" else None,
        "destination_account_id": destination_account_id,
        "destination_account_name": destination_account["account_name"] if destination_account else None,
        "destination_bank_name": destination_account["bank_name"] if destination_account else None,
        "status": TransactionStatus.PENDING,
        "description": description,
        "reference": reference or f"REF{uuid.uuid4().hex[:8].upper()}",
        "proof_image": proof_image_data,
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "processed_by": None,
        "processed_by_name": None,
        "rejection_reason": None,
        "created_at": now.isoformat(),
        "processed_at": None
    }
    
    await db.transactions.insert_one(tx_doc)
    
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
async def approve_transaction(transaction_id: str, user: dict = Depends(require_accountant_or_admin)):
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
    
    # Update treasury balance
    if tx.get("destination_account_id"):
        balance_change = tx["amount"] if tx["transaction_type"] == TransactionType.DEPOSIT else -tx["amount"]
        await db.treasury_accounts.update_one(
            {"account_id": tx["destination_account_id"]},
            {"$inc": {"balance": balance_change}, "$set": {"updated_at": now.isoformat()}}
        )
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

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
                "destination_account_id": treasury_ids[0] if treasury_ids else None,
                "destination_account_name": "Main Operating Account",
                "destination_bank_name": "Chase Bank",
                "status": TransactionStatus.PENDING,
                "description": "Initial deposit",
                "reference": f"DEP{uuid.uuid4().hex[:8].upper()}",
                "proof_image": None,
                "created_by": None,
                "created_by_name": "System",
                "processed_by": None,
                "processed_by_name": None,
                "rejection_reason": None,
                "created_at": (now - timedelta(days=i+1)).isoformat(),
                "processed_at": None
            }
            await db.transactions.insert_one(tx_doc)
    
    return {"message": "Demo data seeded successfully"}

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
