from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from bson import ObjectId
from typing import Optional, List, Annotated
import os
import logging
import bcrypt
import jwt
import secrets
import string
from datetime import datetime, timezone, timedelta
from pathlib import Path
from india_locations import get_states, get_districts, get_taluks

ROOT_DIR = Path(__file__).parent

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Animitra API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────── helpers ──────────────────────────────────────────

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30
COUPON_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$"
COUPON_LENGTH = 8
INITIAL_COUPON_COUNT = 10000


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str, mobile: str, role: str = "vet") -> str:
    payload = {
        "sub": user_id,
        "mobile": mobile,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request):
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ──────────────────────────── startup ─────────────────────────────────────────

async def seed_admin():
    admin_mobile = os.environ.get("ADMIN_MOBILE", "9999999999")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    existing = await db.users.find_one({"mobile": admin_mobile})
    if existing is None:
        await db.users.insert_one({
            "name": "Admin",
            "reg_no": "ADMIN001",
            "mobile": admin_mobile,
            "password_hash": hash_password(admin_password),
            "state": "Tamil Nadu",
            "district": "Chennai",
            "taluk": "Anna Nagar",
            "role": "admin",
            "is_activated": True,
            "coupon_code": None,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Admin user seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"mobile": admin_mobile},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )


async def seed_coupons():
    count = await db.coupons.count_documents({})
    if count >= 100:
        return
    logger.info("Generating initial coupons...")
    existing_codes = set(await db.coupons.distinct("code"))
    coupons = []
    attempts = 0
    needed = INITIAL_COUPON_COUNT - count
    while len(coupons) < needed and attempts < needed * 5:
        code = "".join(secrets.choice(COUPON_CHARS) for _ in range(COUPON_LENGTH))
        if code not in existing_codes:
            existing_codes.add(code)
            coupons.append({
                "code": code,
                "is_activated": False,
                "activated_by": None,
                "activated_at": None,
                "created_at": datetime.now(timezone.utc),
            })
        attempts += 1
    if coupons:
        await db.coupons.insert_many(coupons)
        logger.info(f"Generated {len(coupons)} coupons")


@app.on_event("startup")
async def startup():
    await db.users.create_index("mobile", unique=True)
    await db.coupons.create_index("code", unique=True)
    await seed_admin()
    await seed_coupons()
    write_test_credentials()


def write_test_credentials():
    content = """# Animitra Test Credentials

## Admin Account
- Mobile: 9999999999
- Password: Admin@1234
- Role: admin

## Test Vet Account (register via app)
- Use the registration flow in the app
- Enter a coupon code from /api/admin/coupons endpoint

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/activate
- GET /api/auth/me
- GET /api/location/states
- GET /api/location/districts/{state}
- GET /api/location/taluks/{state}/{district}
- GET /api/admin/coupons
- POST /api/admin/coupons/generate
- GET /api/admin/coupons/export
- GET /api/dashboard/stats
"""
    Path("/app/memory/test_credentials.md").write_text(content)


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ──────────────────────────── models ──────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    reg_no: str
    mobile: str
    password: str
    state: str
    district: str
    taluk: str


class LoginRequest(BaseModel):
    mobile: str
    password: str


class ActivateRequest(BaseModel):
    coupon_code: str


class GenerateCouponsRequest(BaseModel):
    count: int = 100


# ──────────────────────────── auth routes ─────────────────────────────────────

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    if not data.mobile.isdigit() or len(data.mobile) != 10:
        raise HTTPException(status_code=400, detail="Mobile number must be 10 digits")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await db.users.find_one({"mobile": data.mobile})
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    user_doc = {
        "name": data.name,
        "reg_no": data.reg_no,
        "mobile": data.mobile,
        "password_hash": hash_password(data.password),
        "state": data.state,
        "district": data.district,
        "taluk": data.taluk,
        "role": "vet",
        "is_activated": False,
        "coupon_code": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_token(user_id, data.mobile, "vet")
    return {
        "success": True,
        "message": "Registration successful. Please activate your account.",
        "token": token,
        "user": {
            "id": user_id,
            "name": data.name,
            "mobile": data.mobile,
            "is_activated": False,
            "role": "vet",
        }
    }


@api_router.post("/auth/activate")
async def activate_coupon(data: ActivateRequest, user=Depends(get_current_user)):
    if user.get("is_activated"):
        raise HTTPException(status_code=400, detail="Account already activated")

    code = data.coupon_code.upper().strip()
    coupon = await db.coupons.find_one({"code": code, "is_activated": False})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or already used coupon code")

    now = datetime.now(timezone.utc)
    await db.coupons.update_one(
        {"_id": coupon["_id"]},
        {"$set": {"is_activated": True, "activated_by": user["id"], "activated_at": now}}
    )
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"is_activated": True, "coupon_code": code}}
    )

    token = create_token(user["id"], user["mobile"], user.get("role", "vet"))
    return {
        "success": True,
        "message": "Account activated successfully! Welcome to Animitra.",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "mobile": user["mobile"],
            "is_activated": True,
            "role": user.get("role", "vet"),
        }
    }


@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"mobile": data.mobile})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid mobile number or password")

    if not user.get("is_activated"):
        raise HTTPException(status_code=403, detail="Account not activated. Please enter your coupon code.")

    user_id = str(user["_id"])
    token = create_token(user_id, data.mobile, user.get("role", "vet"))
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "name": user["name"],
            "mobile": user["mobile"],
            "reg_no": user.get("reg_no", ""),
            "state": user.get("state", ""),
            "district": user.get("district", ""),
            "taluk": user.get("taluk", ""),
            "is_activated": user.get("is_activated", False),
            "role": user.get("role", "vet"),
        }
    }


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"success": True, "user": user}


# ─────────────────────────── location routes ──────────────────────────────────

@api_router.get("/location/states")
async def states():
    return {"states": get_states()}


@api_router.get("/location/districts/{state}")
async def districts(state: str):
    return {"districts": get_districts(state)}


@api_router.get("/location/taluks/{state}/{district}")
async def taluks(state: str, district: str):
    return {"taluks": get_taluks(state, district)}


# ─────────────────────────── admin coupon routes ───────────────────────────────

@api_router.get("/admin/coupons")
async def list_coupons(
    skip: int = 0,
    limit: int = 100,
    only_unused: bool = False,
    user=Depends(get_admin_user)
):
    query = {}
    if only_unused:
        query["is_activated"] = False
    total = await db.coupons.count_documents(query)
    activated = await db.coupons.count_documents({"is_activated": True})
    unused = await db.coupons.count_documents({"is_activated": False})
    coupons_cursor = db.coupons.find(query).skip(skip).limit(limit).sort("created_at", -1)
    coupons = []
    async for c in coupons_cursor:
        coupons.append({
            "code": c["code"],
            "is_activated": c["is_activated"],
            "activated_by": c.get("activated_by"),
            "activated_at": c.get("activated_at").isoformat() if c.get("activated_at") else None,
            "created_at": c["created_at"].isoformat(),
        })
    return {"total": total, "activated": activated, "unused": unused, "coupons": coupons}


@api_router.post("/admin/coupons/generate")
async def generate_coupons(data: GenerateCouponsRequest, user=Depends(get_admin_user)):
    existing_codes = set(await db.coupons.distinct("code"))
    new_coupons = []
    attempts = 0
    while len(new_coupons) < data.count and attempts < data.count * 10:
        code = "".join(secrets.choice(COUPON_CHARS) for _ in range(COUPON_LENGTH))
        if code not in existing_codes:
            existing_codes.add(code)
            new_coupons.append({
                "code": code,
                "is_activated": False,
                "activated_by": None,
                "activated_at": None,
                "created_at": datetime.now(timezone.utc),
            })
        attempts += 1
    if new_coupons:
        await db.coupons.insert_many(new_coupons)
    return {"success": True, "generated": len(new_coupons)}


@api_router.get("/admin/coupons/export")
async def export_coupons(user=Depends(get_admin_user)):
    coupons_cursor = db.coupons.find({"is_activated": False}).sort("created_at", -1)
    lines = ["CODE,STATUS,CREATED_AT"]
    async for c in coupons_cursor:
        lines.append(f"{c['code']},UNUSED,{c['created_at'].strftime('%Y-%m-%d %H:%M:%S')}")
    return PlainTextResponse("\n".join(lines), media_type="text/csv")


# ─────────────────────────── dashboard ────────────────────────────────────────

@api_router.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    vet_id = user["id"]
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    today_cases = await db.cases.count_documents({"vet_id": vet_id, "created_at": {"$gte": today_start}})
    pending_cases = await db.cases.count_documents({"vet_id": vet_id, "status": "pending"})
    total_cases = await db.cases.count_documents({"vet_id": vet_id})

    today_paid_cursor = db.cases.find({"vet_id": vet_id, "is_paid": True, "paid_at": {"$gte": today_start}})
    today_earnings = 0.0
    async for c in today_paid_cursor:
        today_earnings += c.get("amount", 0)

    total_paid_cursor = db.cases.find({"vet_id": vet_id, "is_paid": True})
    total_earnings = 0.0
    async for c in total_paid_cursor:
        total_earnings += c.get("amount", 0)

    pending_payment_cursor = db.cases.find({"vet_id": vet_id, "is_paid": False, "status": "closed"})
    pending_payments = 0.0
    async for c in pending_payment_cursor:
        pending_payments += c.get("amount", 0)

    return {
        "today_cases": today_cases,
        "pending_cases": pending_cases,
        "today_earnings": today_earnings,
        "total_earnings": total_earnings,
        "pending_payments": pending_payments,
        "total_cases": total_cases,
    }


# ─────────────────────────── quick case / lead ────────────────────────────────

class QuickCaseRequest(BaseModel):
    owner_name: str
    mobile: str
    animal_type: str
    visit_reason: str
    estimated_amount: Optional[float] = 0.0
    notes: Optional[str] = ""


@api_router.post("/cases/quick-add")
async def quick_add_case(data: QuickCaseRequest, user=Depends(get_current_user)):
    case_doc = {
        "vet_id": user["id"],
        "owner_name": data.owner_name,
        "mobile": data.mobile,
        "animal_type": data.animal_type,
        "visit_reason": data.visit_reason,
        "amount": data.estimated_amount or 0.0,
        "notes": data.notes or "",
        "status": "pending",
        "is_paid": False,
        "paid_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.cases.insert_one(case_doc)
    return {
        "success": True,
        "message": "Case added successfully",
        "case_id": str(result.inserted_id),
    }


@api_router.get("/cases")
async def list_cases(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user)
):
    query: dict = {"vet_id": user["id"]}
    if status:
        query["status"] = status
    total = await db.cases.count_documents(query)
    cursor = db.cases.find(query).sort("created_at", -1).skip(skip).limit(limit)
    cases = []
    async for c in cursor:
        cases.append({
            "id": str(c["_id"]),
            "owner_name": c["owner_name"],
            "mobile": c["mobile"],
            "animal_type": c["animal_type"],
            "visit_reason": c["visit_reason"],
            "amount": c.get("amount", 0),
            "notes": c.get("notes", ""),
            "status": c["status"],
            "is_paid": c.get("is_paid", False),
            "created_at": c["created_at"].isoformat(),
        })
    return {"total": total, "cases": cases}


# ─────────────────────────── health ────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Animitra API is running", "version": "1.0.0"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
