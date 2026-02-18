from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
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
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    kyc_status: Optional[str] = None
    notes: Optional[str] = None

class TradingAccountType:
    MT4 = "MT4"
    MT5 = "MT5"

class TradingAccountStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class TradingAccountBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    account_id: str
    client_id: str
    account_number: str
    account_type: str = TradingAccountType.MT4
    currency: str = "USD"
    balance: float = 0.0
    equity: float = 0.0
    leverage: int = 100
    status: str = TradingAccountStatus.ACTIVE
    created_at: datetime
    updated_at: datetime

class TradingAccountCreate(BaseModel):
    client_id: str
    account_type: str = TradingAccountType.MT4
    currency: str = "USD"
    leverage: int = 100

class TradingAccountUpdate(BaseModel):
    leverage: Optional[int] = None
    status: Optional[str] = None

class TransactionType:
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    COMMISSION = "commission"
    REBATE = "rebate"
    ADJUSTMENT = "adjustment"

class TransactionStatus:
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"

class TransactionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str
    account_id: str
    client_id: str
    transaction_type: str
    amount: float
    currency: str = "USD"
    status: str = TransactionStatus.PENDING
    description: Optional[str] = None
    reference: Optional[str] = None
    processed_by: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

class TransactionCreate(BaseModel):
    account_id: str
    transaction_type: str
    amount: float
    currency: str = "USD"
    description: Optional[str] = None
    reference: Optional[str] = None

class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None

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

def generate_account_number() -> str:
    return f"FX{uuid.uuid4().hex[:8].upper()}"

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

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
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
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
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
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
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
    
    # Store session
    expires_at = now + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat()
    })
    
    # Set cookie
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

# ============== TRADING ACCOUNTS ROUTES ==============

@api_router.get("/trading-accounts")
async def get_trading_accounts(
    user: dict = Depends(get_current_user),
    client_id: Optional[str] = None,
    status: Optional[str] = None
):
    query = {}
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    accounts = await db.trading_accounts.find(query, {"_id": 0}).to_list(1000)
    return accounts

@api_router.get("/trading-accounts/{account_id}")
async def get_trading_account(account_id: str, user: dict = Depends(get_current_user)):
    account = await db.trading_accounts.find_one({"account_id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@api_router.post("/trading-accounts")
async def create_trading_account(account_data: TradingAccountCreate, user: dict = Depends(get_current_user)):
    # Verify client exists
    client = await db.clients.find_one({"client_id": account_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    account_id = f"acc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    account_doc = {
        "account_id": account_id,
        "client_id": account_data.client_id,
        "account_number": generate_account_number(),
        "account_type": account_data.account_type,
        "currency": account_data.currency,
        "balance": 0.0,
        "equity": 0.0,
        "leverage": account_data.leverage,
        "status": TradingAccountStatus.ACTIVE,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.trading_accounts.insert_one(account_doc)
    
    return await db.trading_accounts.find_one({"account_id": account_id}, {"_id": 0})

@api_router.put("/trading-accounts/{account_id}")
async def update_trading_account(account_id: str, update_data: TradingAccountUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trading_accounts.update_one({"account_id": account_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return await db.trading_accounts.find_one({"account_id": account_id}, {"_id": 0})

# ============== TRANSACTIONS ROUTES ==============

@api_router.get("/transactions")
async def get_transactions(
    user: dict = Depends(get_current_user),
    account_id: Optional[str] = None,
    client_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if account_id:
        query["account_id"] = account_id
    if client_id:
        query["client_id"] = client_id
    if transaction_type:
        query["transaction_type"] = transaction_type
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return transactions

@api_router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@api_router.post("/transactions")
async def create_transaction(tx_data: TransactionCreate, user: dict = Depends(get_current_user)):
    # Verify account exists
    account = await db.trading_accounts.find_one({"account_id": tx_data.account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    tx_doc = {
        "transaction_id": tx_id,
        "account_id": tx_data.account_id,
        "client_id": account["client_id"],
        "transaction_type": tx_data.transaction_type,
        "amount": tx_data.amount,
        "currency": tx_data.currency,
        "status": TransactionStatus.PENDING,
        "description": tx_data.description,
        "reference": tx_data.reference or f"REF{uuid.uuid4().hex[:8].upper()}",
        "processed_by": None,
        "created_at": now.isoformat(),
        "processed_at": None
    }
    
    await db.transactions.insert_one(tx_doc)
    
    return await db.transactions.find_one({"transaction_id": tx_id}, {"_id": 0})

@api_router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, update_data: TransactionUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    tx = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If completing transaction, update account balance
    if updates.get("status") == TransactionStatus.COMPLETED and tx["status"] == TransactionStatus.PENDING:
        account = await db.trading_accounts.find_one({"account_id": tx["account_id"]}, {"_id": 0})
        if account:
            balance_change = tx["amount"] if tx["transaction_type"] in [TransactionType.DEPOSIT, TransactionType.REBATE] else -tx["amount"]
            new_balance = account["balance"] + balance_change
            await db.trading_accounts.update_one(
                {"account_id": tx["account_id"]},
                {"$set": {"balance": new_balance, "equity": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        updates["processed_by"] = user["user_id"]
        updates["processed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.transactions.update_one({"transaction_id": transaction_id}, {"$set": updates})
    
    return await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})

# ============== REPORTS/ANALYTICS ROUTES ==============

@api_router.get("/reports/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    # Get client stats
    total_clients = await db.clients.count_documents({})
    approved_clients = await db.clients.count_documents({"kyc_status": ClientStatus.APPROVED})
    pending_clients = await db.clients.count_documents({"kyc_status": ClientStatus.PENDING})
    
    # Get account stats
    total_accounts = await db.trading_accounts.count_documents({})
    active_accounts = await db.trading_accounts.count_documents({"status": TradingAccountStatus.ACTIVE})
    
    # Get total balance
    pipeline = [
        {"$match": {"status": TradingAccountStatus.ACTIVE}},
        {"$group": {"_id": None, "total_balance": {"$sum": "$balance"}}}
    ]
    balance_result = await db.trading_accounts.aggregate(pipeline).to_list(1)
    total_balance = balance_result[0]["total_balance"] if balance_result else 0
    
    # Get transaction stats
    total_transactions = await db.transactions.count_documents({})
    pending_transactions = await db.transactions.count_documents({"status": TransactionStatus.PENDING})
    
    # Get deposits/withdrawals totals
    deposit_pipeline = [
        {"$match": {"transaction_type": TransactionType.DEPOSIT, "status": TransactionStatus.COMPLETED}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    withdrawal_pipeline = [
        {"$match": {"transaction_type": TransactionType.WITHDRAWAL, "status": TransactionStatus.COMPLETED}},
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
        "accounts": {
            "total": total_accounts,
            "active": active_accounts,
            "total_balance": total_balance
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
    
    # Transform for chart
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
    # Recent transactions
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Recent clients
    clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    return {
        "recent_transactions": transactions,
        "recent_clients": clients
    }

# ============== SEED DATA ROUTE (for demo) ==============

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
    
    # Create trading accounts for clients
    account_ids = []
    for i, client_id in enumerate(client_ids):
        existing = await db.trading_accounts.find_one({"client_id": client_id}, {"_id": 0})
        if not existing:
            account_id = f"acc_{uuid.uuid4().hex[:12]}"
            balance = [15000, 25000, 8000, 42000, 5000][i]
            account_doc = {
                "account_id": account_id,
                "client_id": client_id,
                "account_number": generate_account_number(),
                "account_type": TradingAccountType.MT4 if i % 2 == 0 else TradingAccountType.MT5,
                "currency": "USD",
                "balance": balance,
                "equity": balance,
                "leverage": 100,
                "status": TradingAccountStatus.ACTIVE,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.trading_accounts.insert_one(account_doc)
            account_ids.append(account_id)
        else:
            account_ids.append(existing["account_id"])
    
    # Create sample transactions
    for i, account_id in enumerate(account_ids):
        account = await db.trading_accounts.find_one({"account_id": account_id}, {"_id": 0})
        if account:
            # Create deposit
            tx_id = f"tx_{uuid.uuid4().hex[:12]}"
            tx_doc = {
                "transaction_id": tx_id,
                "account_id": account_id,
                "client_id": account["client_id"],
                "transaction_type": TransactionType.DEPOSIT,
                "amount": [5000, 10000, 3000, 15000, 2000][i],
                "currency": "USD",
                "status": TransactionStatus.COMPLETED,
                "description": "Initial deposit",
                "reference": f"DEP{uuid.uuid4().hex[:8].upper()}",
                "processed_by": None,
                "created_at": (now - timedelta(days=i+1)).isoformat(),
                "processed_at": (now - timedelta(days=i+1)).isoformat()
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
