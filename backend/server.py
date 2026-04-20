from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from bson import ObjectId
from typing import Optional, List
import os, logging, bcrypt, jwt, secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from india_locations import get_states, get_districts, get_taluks

ROOT_DIR = Path(__file__).parent
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Animitra API")
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
COUPON_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$"
COUPON_LENGTH = 8
INITIAL_COUPON_COUNT = 10000
PAYMENT_MODES = ["Cash", "GPay", "Online", "Cheque", "Other"]

# ─────────────────────────── auth helpers ─────────────────────────────────────

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(uid: str, mobile: str, role: str = "vet") -> str:
    return jwt.encode(
        {"sub": uid, "mobile": mobile, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM
    )

async def get_current_user(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_admin_user(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

# ─────────────────────────── case helpers ─────────────────────────────────────

def fmt_case(c: dict) -> dict:
    vd = c.get("visit_date") or c.get("created_at")
    return {
        "id": str(c["_id"]),
        "owner_name": c["owner_name"],
        "mobile": c["mobile"],
        "village_name": c.get("village_name", ""),
        "animal_type": c["animal_type"],
        "visit_reason": c["visit_reason"],
        "visit_date": vd.isoformat() if vd else datetime.now(timezone.utc).isoformat(),
        "amount": c.get("amount", 0),
        "notes": c.get("notes", ""),
        "status": c.get("status", "active"),
        "is_paid": c.get("is_paid", False),
        "payment_mode": c.get("payment_mode"),
        "paid_amount": c.get("paid_amount", 0),
        "paid_at": c["paid_at"].isoformat() if c.get("paid_at") else None,
        "follow_up_date": c["follow_up_date"].isoformat() if c.get("follow_up_date") else None,
        "forwarded_to_name": c.get("forwarded_to_name", ""),
        "forwarded_from": c.get("forwarded_from", ""),
        "created_at": c["created_at"].isoformat(),
    }

async def run_auto_pending(vet_id: str):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    await db.cases.update_many(
        {"vet_id": vet_id, "status": {"$in": ["active", "upcoming"]}, "visit_date": {"$lt": today_start}},
        {"$set": {"status": "pending", "updated_at": datetime.now(timezone.utc)}}
    )

def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        d = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.replace(hour=0, minute=0, second=0, microsecond=0)
    except Exception:
        return None

# ─────────────────────────── startup ──────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await db.users.create_index("mobile", unique=True)
    await db.coupons.create_index("code", unique=True)
    await seed_admin()
    await seed_coupons()
    await seed_demo_vet()
    write_test_credentials()

async def seed_admin():
    mob = os.environ.get("ADMIN_MOBILE", "9999999999")
    pwd = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    ex = await db.users.find_one({"mobile": mob})
    if ex is None:
        await db.users.insert_one({
            "name": "Admin", "reg_no": "ADMIN001", "mobile": mob,
            "password_hash": hash_password(pwd), "state": "Tamil Nadu",
            "district": "Chennai", "taluk": "Anna Nagar",
            "role": "admin", "is_activated": True, "coupon_code": None,
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(pwd, ex["password_hash"]):
        await db.users.update_one({"mobile": mob}, {"$set": {"password_hash": hash_password(pwd)}})

async def seed_coupons():
    if await db.coupons.count_documents({}) >= 100:
        return
    existing = set(await db.coupons.distinct("code"))
    coupons, attempts = [], 0
    while len(coupons) < INITIAL_COUPON_COUNT and attempts < INITIAL_COUPON_COUNT * 5:
        code = "".join(secrets.choice(COUPON_CHARS) for _ in range(COUPON_LENGTH))
        if code not in existing:
            existing.add(code)
            coupons.append({"code": code, "is_activated": False, "activated_by": None,
                            "activated_at": None, "created_at": datetime.now(timezone.utc)})
        attempts += 1
    if coupons:
        await db.coupons.insert_many(coupons)
        logger.info(f"Generated {len(coupons)} coupons")

async def seed_demo_vet():
    demo_mobile = "1234567890"
    demo_pwd = "Demo@123"
    ex = await db.users.find_one({"mobile": demo_mobile})
    if ex is None:
        result = await db.users.insert_one({
            "name": "Demo Vet", "reg_no": "TN/VCI/DEMO01",
            "mobile": demo_mobile, "password_hash": hash_password(demo_pwd),
            "state": "Tamil Nadu", "district": "Coimbatore", "taluk": "Coimbatore North",
            "role": "vet", "is_activated": True, "coupon_code": "DEMO0001",
            "created_at": datetime.now(timezone.utc),
        })
        await _seed_demo_cases(str(result.inserted_id))
    else:
        if await db.cases.count_documents({"vet_id": str(ex["_id"])}) == 0:
            await _seed_demo_cases(str(ex["_id"]))

async def _seed_demo_cases(vet_id: str):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    day3 = today + timedelta(days=3)
    day5 = today + timedelta(days=5)

    cases = [
        {"owner_name": "Arjun Sharma", "mobile": "9811223344", "village_name": "Perur",
         "animal_type": "Dog", "visit_reason": "Vaccination",
         "visit_date": today, "amount": 800.0, "status": "closed",
         "is_paid": True, "payment_mode": "Cash", "paid_amount": 800.0,
         "paid_at": today.replace(hour=9), "follow_up_date": None},
        {"owner_name": "Priya Nair", "mobile": "9922334455", "village_name": "Kovaipudur",
         "animal_type": "Cat", "visit_reason": "Check-up",
         "visit_date": today, "amount": 500.0, "status": "closed",
         "is_paid": True, "payment_mode": "GPay", "paid_amount": 500.0,
         "paid_at": today.replace(hour=11), "follow_up_date": None},
        {"owner_name": "Ramesh Kumar", "mobile": "9733445566", "village_name": "Saravanampatti",
         "animal_type": "Cow", "visit_reason": "Treatment",
         "visit_date": today, "amount": 1200.0, "status": "active",
         "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
         "paid_at": None, "follow_up_date": day3},
        {"owner_name": "Lokesh P", "mobile": "9644556677", "village_name": "Perur",
         "animal_type": "Goat", "visit_reason": "Deworming",
         "visit_date": tomorrow, "amount": 0.0, "status": "upcoming",
         "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
         "paid_at": None, "follow_up_date": None},
        {"owner_name": "Murugan P", "mobile": "9555667788", "village_name": "Annur",
         "animal_type": "Buffalo", "visit_reason": "Emergency",
         "visit_date": day5, "amount": 0.0, "status": "upcoming",
         "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
         "paid_at": None, "follow_up_date": None},
        {"owner_name": "Sunita Devi", "mobile": "9466778899", "village_name": "Thudiyalur",
         "animal_type": "Dog", "visit_reason": "Surgery",
         "visit_date": today - timedelta(days=2), "amount": 3500.0, "status": "closed",
         "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
         "paid_at": None, "follow_up_date": None},
        {"owner_name": "Vijay S", "mobile": "9377889900", "village_name": "Annur",
         "animal_type": "Cow", "visit_reason": "Vaccination",
         "visit_date": today - timedelta(days=5), "amount": 600.0, "status": "closed",
         "is_paid": True, "payment_mode": "Cash", "paid_amount": 600.0,
         "paid_at": today - timedelta(days=5), "follow_up_date": None},
        {"owner_name": "Kavitha M", "mobile": "9288990011", "village_name": "Perur",
         "animal_type": "Cat", "visit_reason": "Follow-up",
         "visit_date": today - timedelta(days=1), "amount": 400.0, "status": "pending",
         "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
         "paid_at": None, "follow_up_date": None},
    ]
    for c in cases:
        c["vet_id"] = vet_id
        c["notes"] = ""
        c["forwarded_to_name"] = ""
        c["forwarded_from"] = ""
        c["created_at"] = c["visit_date"]
        c["updated_at"] = c["visit_date"]
    await db.cases.insert_many(cases)
    logger.info(f"Seeded {len(cases)} demo cases")

def write_test_credentials():
    Path("/app/memory/test_credentials.md").write_text("""# Animitra Test Credentials

## Admin
- Mobile: 9999999999 | Password: Admin@1234 | Role: admin

## Demo Vet
- Mobile: 1234567890 | Password: Demo@123 | Role: vet (pre-seeded cases)

## Auth Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/activate, GET /api/auth/me
""")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ─────────────────────────── models ───────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str; reg_no: str; mobile: str; password: str
    state: str; district: str; taluk: str

class LoginRequest(BaseModel):
    mobile: str; password: str

class ActivateRequest(BaseModel):
    coupon_code: str

class QuickCaseRequest(BaseModel):
    owner_name: str
    mobile: str
    village_name: str = ""
    animal_type: str
    visit_reason: str
    visit_date: Optional[str] = None
    notes: Optional[str] = ""

class CloseCaseRequest(BaseModel):
    amount: float
    payment_mode: str
    is_paid: bool
    follow_up_date: Optional[str] = None
    follow_up_reason: Optional[str] = ""

class MarkPaidRequest(BaseModel):
    amount: float
    payment_mode: str
    payment_date: Optional[str] = None

class ForwardCaseRequest(BaseModel):
    to_mobile: str
    message: Optional[str] = ""

class GenerateCouponsRequest(BaseModel):
    count: int = 100

# ─────────────────────────── auth routes ──────────────────────────────────────

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    if not data.mobile.isdigit() or len(data.mobile) != 10:
        raise HTTPException(400, "Mobile number must be 10 digits")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await db.users.find_one({"mobile": data.mobile}):
        raise HTTPException(400, "Mobile number already registered")
    result = await db.users.insert_one({
        "name": data.name, "reg_no": data.reg_no, "mobile": data.mobile,
        "password_hash": hash_password(data.password), "state": data.state,
        "district": data.district, "taluk": data.taluk, "role": "vet",
        "is_activated": False, "coupon_code": None,
        "created_at": datetime.now(timezone.utc),
    })
    uid = str(result.inserted_id)
    return {"success": True, "message": "Registration successful. Please activate your account.",
            "token": create_token(uid, data.mobile), "user": {
                "id": uid, "name": data.name, "mobile": data.mobile,
                "is_activated": False, "role": "vet"}}

@api_router.post("/auth/activate")
async def activate(data: ActivateRequest, user=Depends(get_current_user)):
    if user.get("is_activated"):
        raise HTTPException(400, "Account already activated")
    code = data.coupon_code.upper().strip()
    coupon = await db.coupons.find_one({"code": code, "is_activated": False})
    if not coupon:
        raise HTTPException(400, "Invalid or already used coupon code")
    now = datetime.now(timezone.utc)
    await db.coupons.update_one({"_id": coupon["_id"]},
        {"$set": {"is_activated": True, "activated_by": user["id"], "activated_at": now}})
    await db.users.update_one({"_id": ObjectId(user["id"])},
        {"$set": {"is_activated": True, "coupon_code": code}})
    token = create_token(user["id"], user["mobile"], user.get("role", "vet"))
    return {"success": True, "message": "Account activated!", "token": token,
            "user": {"id": user["id"], "name": user["name"], "mobile": user["mobile"],
                     "is_activated": True, "role": user.get("role", "vet")}}

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"mobile": data.mobile})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid mobile number or password")
    if not user.get("is_activated"):
        raise HTTPException(403, "Account not activated. Please enter your coupon code.")
    if user.get("is_suspended"):
        raise HTTPException(403, "Account suspended. Contact Animitra support.")
    uid = str(user["_id"])
    return {"success": True, "token": create_token(uid, data.mobile, user.get("role", "vet")),
            "user": {"id": uid, "name": user["name"], "mobile": user["mobile"],
                     "reg_no": user.get("reg_no", ""), "state": user.get("state", ""),
                     "district": user.get("district", ""), "taluk": user.get("taluk", ""),
                     "is_activated": True, "role": user.get("role", "vet")}}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"success": True, "user": user}

# ─────────────────────────── location ─────────────────────────────────────────

@api_router.get("/location/states")
async def states():
    return {"states": get_states()}

@api_router.get("/location/districts/{state}")
async def districts(state: str):
    return {"districts": get_districts(state)}

@api_router.get("/location/taluks/{state}/{district}")
async def taluks(state: str, district: str):
    return {"taluks": get_taluks(state, district)}

# ─────────────────────────── villages autocomplete ────────────────────────────

@api_router.get("/villages")
async def villages(user=Depends(get_current_user)):
    vlist = await db.cases.distinct("village_name", {"vet_id": user["id"], "village_name": {"$nin": [None, ""]}})
    return {"villages": sorted([v for v in vlist if v])}

# ─────────────────────────── case routes ──────────────────────────────────────

@api_router.post("/cases/quick-add")
async def quick_add_case(data: QuickCaseRequest, user=Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    visit_date = parse_date(data.visit_date) or today_start
    status = "upcoming" if visit_date > today_start else "active"
    result = await db.cases.insert_one({
        "vet_id": user["id"], "owner_name": data.owner_name, "mobile": data.mobile,
        "village_name": data.village_name or "", "animal_type": data.animal_type,
        "visit_reason": data.visit_reason, "visit_date": visit_date, "amount": 0.0,
        "notes": data.notes or "", "status": status,
        "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
        "paid_at": None, "follow_up_date": None,
        "forwarded_to_name": "", "forwarded_from": "",
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    })
    return {"success": True, "message": "Case added", "case_id": str(result.inserted_id)}

@api_router.get("/cases/today")
async def today_cases(user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today_start + timedelta(days=1)
    cursor = db.cases.find({"vet_id": user["id"],
        "visit_date": {"$gte": today_start, "$lt": tomorrow}}).sort("visit_date", 1)
    return {"cases": [fmt_case(c) async for c in cursor]}

@api_router.get("/cases/upcoming")
async def upcoming_cases(user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    tomorrow = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    cursor = db.cases.find({"vet_id": user["id"], "status": "upcoming",
        "visit_date": {"$gte": tomorrow}}).sort("visit_date", 1).limit(20)
    return {"cases": [fmt_case(c) async for c in cursor]}

@api_router.get("/cases/pending")
async def pending_cases(user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    cursor = db.cases.find({"vet_id": user["id"], "status": "pending"}).sort("visit_date", -1).limit(50)
    return {"cases": [fmt_case(c) async for c in cursor]}

@api_router.get("/cases/closed")
async def closed_cases(user=Depends(get_current_user), skip: int = 0, limit: int = 50):
    cursor = db.cases.find({"vet_id": user["id"], "status": "closed"}).sort("updated_at", -1).skip(skip).limit(limit)
    total = await db.cases.count_documents({"vet_id": user["id"], "status": "closed"})
    return {"cases": [fmt_case(c) async for c in cursor], "total": total}

@api_router.post("/cases/{case_id}/close")
async def close_case(case_id: str, data: CloseCaseRequest, user=Depends(get_current_user)):
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    now = datetime.now(timezone.utc)
    update = {
        "status": "closed", "amount": data.amount, "is_paid": data.is_paid,
        "payment_mode": data.payment_mode if data.is_paid else None,
        "paid_amount": data.amount if data.is_paid else 0.0,
        "paid_at": now if data.is_paid else None,
        "updated_at": now,
    }
    fu_date = parse_date(data.follow_up_date)
    if fu_date:
        update["follow_up_date"] = fu_date
        fu_reason = data.follow_up_reason.strip() if data.follow_up_reason else "Follow-up"
        # Create follow-up case
        await db.cases.insert_one({
            "vet_id": user["id"], "owner_name": case["owner_name"], "mobile": case["mobile"],
            "village_name": case.get("village_name", ""), "animal_type": case["animal_type"],
            "visit_reason": fu_reason, "visit_date": fu_date, "amount": 0.0,
            "notes": f"Follow-up from {case['visit_reason']} on {case.get('visit_date', case['created_at']).strftime('%d/%m/%Y')}",
            "status": "upcoming",
            "is_paid": False, "payment_mode": None, "paid_amount": 0.0, "paid_at": None,
            "follow_up_date": None, "forwarded_to_name": "", "forwarded_from": "",
            "created_at": now, "updated_at": now,
        })
    await db.cases.update_one({"_id": ObjectId(case_id)}, {"$set": update})
    return {"success": True}

@api_router.post("/cases/{case_id}/mark-paid")
async def mark_paid(case_id: str, data: MarkPaidRequest, user=Depends(get_current_user)):
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    paid_dt = parse_date(data.payment_date) or datetime.now(timezone.utc)
    await db.cases.update_one({"_id": ObjectId(case_id)}, {"$set": {
        "is_paid": True, "payment_mode": data.payment_mode,
        "paid_amount": data.amount, "paid_at": paid_dt,
        "updated_at": datetime.now(timezone.utc),
    }})
    return {"success": True}

@api_router.post("/cases/{case_id}/forward")
async def forward_case(case_id: str, data: ForwardCaseRequest, user=Depends(get_current_user)):
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    target = await db.users.find_one({"mobile": data.to_mobile, "is_activated": True})
    if not target:
        raise HTTPException(404, "No registered Animitra vet found with this mobile number")
    target_id = str(target["_id"])
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    await db.cases.insert_one({
        "vet_id": target_id, "owner_name": case["owner_name"], "mobile": case["mobile"],
        "village_name": case.get("village_name", ""), "animal_type": case["animal_type"],
        "visit_reason": case["visit_reason"], "visit_date": today, "amount": 0.0,
        "notes": f"Forwarded by Dr. {user['name']}. {data.message or ''}".strip(),
        "status": "active", "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
        "paid_at": None, "follow_up_date": None,
        "forwarded_from": user["name"], "forwarded_to_name": "",
        "created_at": now, "updated_at": now,
    })
    await db.cases.update_one({"_id": ObjectId(case_id)}, {"$set": {
        "status": "forwarded", "forwarded_to_name": target.get("name", target["mobile"]),
        "updated_at": now,
    }})
    return {"success": True, "forwarded_to": target.get("name", target["mobile"])}

@api_router.get("/cases")
async def list_cases(status: Optional[str] = None, skip: int = 0, limit: int = 50,
                     user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    query: dict = {"vet_id": user["id"]}
    if status:
        query["status"] = status
    total = await db.cases.count_documents(query)
    cursor = db.cases.find(query).sort("visit_date", -1).skip(skip).limit(limit)
    return {"total": total, "cases": [fmt_case(c) async for c in cursor]}

# ─────────────────────────── ledger ───────────────────────────────────────────

@api_router.get("/ledger/outstanding")
async def outstanding(period: str = "all", user=Depends(get_current_user)):
    query: dict = {"vet_id": user["id"], "status": "closed", "is_paid": False}
    if period == "week":
        query["created_at"] = {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
    elif period == "month":
        query["created_at"] = {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}
    agg = await db.cases.aggregate([
        {"$match": query}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    total_amount = agg[0]["total"] if agg else 0
    cursor = db.cases.find(query).sort("created_at", -1).limit(100)
    return {"total_outstanding": total_amount, "cases": [fmt_case(c) async for c in cursor]}

# ─────────────────────────── dashboard stats ──────────────────────────────────

@api_router.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    vid = user["id"]
    await run_auto_pending(vid)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    today_cases = await db.cases.count_documents({"vet_id": vid, "visit_date": {"$gte": today, "$lt": tomorrow}})
    pending_cases = await db.cases.count_documents({"vet_id": vid, "status": "pending"})
    upcoming_cases = await db.cases.count_documents({"vet_id": vid, "status": "upcoming"})
    total_cases = await db.cases.count_documents({"vet_id": vid})

    def agg_sum(match): return db.cases.aggregate([{"$match": match}, {"$group": {"_id": None, "s": {"$sum": "$paid_amount"}}}])

    r1 = await (agg_sum({"vet_id": vid, "is_paid": True, "paid_at": {"$gte": today, "$lt": tomorrow}})).to_list(1)
    today_earnings = r1[0]["s"] if r1 else 0
    r2 = await (agg_sum({"vet_id": vid, "is_paid": True})).to_list(1)
    total_earnings = r2[0]["s"] if r2 else 0
    r3 = await db.cases.aggregate([{"$match": {"vet_id": vid, "status": "closed", "is_paid": False}},
                                    {"$group": {"_id": None, "s": {"$sum": "$amount"}}}]).to_list(1)
    pending_payments = r3[0]["s"] if r3 else 0

    return {"today_cases": today_cases, "pending_cases": pending_cases, "upcoming_cases": upcoming_cases,
            "today_earnings": today_earnings, "total_earnings": total_earnings,
            "pending_payments": pending_payments, "total_cases": total_cases}

# ─────────────────────────── admin coupons ────────────────────────────────────

@api_router.get("/admin/coupons")
async def list_coupons(skip: int = 0, limit: int = 100, only_unused: bool = False,
                       user=Depends(get_admin_user)):
    q = {"is_activated": False} if only_unused else {}
    total = await db.coupons.count_documents({})
    activated = await db.coupons.count_documents({"is_activated": True})
    unused = await db.coupons.count_documents({"is_activated": False})
    coupons = []
    async for c in db.coupons.find(q).skip(skip).limit(limit).sort("created_at", -1):
        coupons.append({"code": c["code"], "is_activated": c["is_activated"],
                        "activated_by": c.get("activated_by"),
                        "activated_at": c.get("activated_at").isoformat() if c.get("activated_at") else None,
                        "created_at": c["created_at"].isoformat()})
    return {"total": total, "activated": activated, "unused": unused, "coupons": coupons}

@api_router.post("/admin/coupons/generate")
async def gen_coupons(data: GenerateCouponsRequest, user=Depends(get_admin_user)):
    existing = set(await db.coupons.distinct("code"))
    new_coupons, attempts = [], 0
    while len(new_coupons) < data.count and attempts < data.count * 10:
        code = "".join(secrets.choice(COUPON_CHARS) for _ in range(COUPON_LENGTH))
        if code not in existing:
            existing.add(code)
            new_coupons.append({"code": code, "is_activated": False, "activated_by": None,
                                "activated_at": None, "created_at": datetime.now(timezone.utc)})
        attempts += 1
    if new_coupons:
        await db.coupons.insert_many(new_coupons)
    return {"success": True, "generated": len(new_coupons)}

@api_router.get("/admin/coupons/export")
async def export_coupons(user=Depends(get_admin_user)):
    lines = ["CODE,STATUS,CREATED_AT"]
    async for c in db.coupons.find({"is_activated": False}).sort("created_at", -1):
        lines.append(f"{c['code']},UNUSED,{c['created_at'].strftime('%Y-%m-%d %H:%M:%S')}")
    return PlainTextResponse("\n".join(lines), media_type="text/csv")

# ─────────────────────────── subscription / UTR ───────────────────────────────

class UTRRequest(BaseModel):
    utr_number: str
    mobile: str
    name: str

class SuspendRequest(BaseModel):
    reason: Optional[str] = ""


def get_period_start(period: str) -> datetime:
    now = datetime.now(timezone.utc)
    if period == "day":   return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":  return now - timedelta(days=7)
    if period == "year":  return now - timedelta(days=365)
    return now - timedelta(days=30)  # default month


@api_router.post("/subscription/submit-utr")
async def submit_utr(data: UTRRequest, user=Depends(get_current_user)):
    existing = await db.payment_submissions.find_one({"user_id": user["id"]})
    if existing:
        await db.payment_submissions.update_one({"user_id": user["id"]},
            {"$set": {"utr_number": data.utr_number, "status": "pending", "updated_at": datetime.now(timezone.utc)}})
    else:
        await db.payment_submissions.insert_one({
            "user_id": user["id"], "name": data.name, "mobile": data.mobile,
            "utr_number": data.utr_number, "amount": 200, "status": "pending",
            "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
        })
    return {"success": True, "message": "UTR submitted. You will receive your coupon code shortly."}


# ─────────────────────────── reports ──────────────────────────────────────────

@api_router.get("/reports/animal-type")
async def report_animal_type(period: str = "month", user=Depends(get_current_user)):
    start = get_period_start(period)
    pipeline = [
        {"$match": {"vet_id": user["id"], "created_at": {"$gte": start}}},
        {"$group": {"_id": "$animal_type", "count": {"$sum": 1}, "earnings": {"$sum": "$paid_amount"}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.cases.aggregate(pipeline).to_list(50)
    return {"period": period, "data": [{"animal_type": r["_id"] or "Unknown", "count": r["count"], "earnings": r["earnings"]} for r in results]}


@api_router.get("/reports/visit-reason")
async def report_visit_reason(period: str = "month", user=Depends(get_current_user)):
    start = get_period_start(period)
    pipeline = [
        {"$match": {"vet_id": user["id"], "created_at": {"$gte": start}}},
        {"$group": {"_id": "$visit_reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.cases.aggregate(pipeline).to_list(50)
    return {"period": period, "data": [{"reason": r["_id"] or "Unknown", "count": r["count"]} for r in results]}


@api_router.get("/reports/forwards")
async def report_forwards(user=Depends(get_current_user)):
    cursor = db.cases.find({"vet_id": user["id"], "status": "forwarded"}).sort("created_at", -1)
    cases = [fmt_case(c) async for c in cursor]
    return {"total": len(cases), "cases": cases}


# ─────────────────────────── admin extended ───────────────────────────────────

@api_router.get("/admin/users")
async def admin_users(user=Depends(get_admin_user)):
    users = []
    async for u in db.users.find({}).sort("created_at", -1):
        uid = str(u["_id"])
        case_count = await db.cases.count_documents({"vet_id": uid})
        users.append({
            "id": uid, "name": u["name"], "mobile": u["mobile"],
            "reg_no": u.get("reg_no", ""), "state": u.get("state", ""),
            "district": u.get("district", ""), "taluk": u.get("taluk", ""),
            "role": u.get("role", "vet"), "is_activated": u.get("is_activated", False),
            "is_suspended": u.get("is_suspended", False),
            "suspend_reason": u.get("suspend_reason", ""),
            "case_count": case_count,
            "created_at": u["created_at"].isoformat(),
        })
    return {"total": len(users), "users": users}


@api_router.post("/admin/users/{uid}/suspend")
async def admin_suspend(uid: str, data: SuspendRequest, user=Depends(get_admin_user)):
    await db.users.update_one({"_id": ObjectId(uid)},
        {"$set": {"is_suspended": True, "suspend_reason": data.reason or "Suspended by admin"}})
    return {"success": True}


@api_router.post("/admin/users/{uid}/unsuspend")
async def admin_unsuspend(uid: str, user=Depends(get_admin_user)):
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"is_suspended": False, "suspend_reason": ""}})
    return {"success": True}


@api_router.get("/admin/payment-submissions")
async def admin_payments(user=Depends(get_admin_user)):
    submissions = []
    async for s in db.payment_submissions.find({}).sort("created_at", -1):
        submissions.append({
            "id": str(s["_id"]), "user_id": s["user_id"], "name": s["name"],
            "mobile": s["mobile"], "utr_number": s["utr_number"],
            "amount": s.get("amount", 200), "status": s.get("status", "pending"),
            "created_at": s["created_at"].isoformat(),
        })
    total = len(submissions)
    pending = sum(1 for s in submissions if s["status"] == "pending")
    return {"total": total, "pending": pending, "submissions": submissions}


@api_router.post("/admin/payment-submissions/{sid}/process")
async def admin_process_payment(sid: str, user=Depends(get_admin_user)):
    await db.payment_submissions.update_one({"_id": ObjectId(sid)},
        {"$set": {"status": "processed", "processed_at": datetime.now(timezone.utc),
                  "processed_by": user["id"]}})
    return {"success": True}


@api_router.get("/admin/export/users")
async def admin_export_users(user=Depends(get_admin_user)):
    lines = ["NAME,MOBILE,REG_NO,STATE,DISTRICT,TALUK,ACTIVATED,SUSPENDED,REGISTERED_AT"]
    async for u in db.users.find({}).sort("created_at", -1):
        lines.append(f"{u['name']},{u['mobile']},{u.get('reg_no','')},"
                     f"{u.get('state','')},{u.get('district','')},{u.get('taluk','')},"
                     f"{'YES' if u.get('is_activated') else 'NO'},"
                     f"{'YES' if u.get('is_suspended') else 'NO'},"
                     f"{u['created_at'].strftime('%Y-%m-%d')}")
    return PlainTextResponse("\n".join(lines), media_type="text/csv")


@api_router.get("/admin/reports/summary")
async def admin_reports_summary(user=Depends(get_admin_user)):
    total_users = await db.users.count_documents({"role": "vet"})
    active_users = await db.users.count_documents({"role": "vet", "is_activated": True})
    suspended = await db.users.count_documents({"is_suspended": True})
    total_cases = await db.cases.count_documents({})
    total_payments = await db.payment_submissions.count_documents({"status": "processed"})
    pending_payments = await db.payment_submissions.count_documents({"status": "pending"})
    # Top states
    top_states = await db.users.aggregate([
        {"$match": {"role": "vet"}},
        {"$group": {"_id": "$state", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}, {"$limit": 5}
    ]).to_list(5)
    return {
        "total_users": total_users, "active_users": active_users,
        "suspended": suspended, "total_cases": total_cases,
        "total_payments": total_payments, "pending_payments": pending_payments,
        "top_states": [{"state": s["_id"], "count": s["count"]} for s in top_states],
    }


# ─────────────────────────── health ───────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Animitra API running", "version": "3.0.0"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
