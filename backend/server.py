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

# --------------------------- auth helpers -------------------------------------

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

# --------------------------- case helpers -------------------------------------

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
        "case_details": c.get("case_details", ""),
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

# --------------------------- startup ------------------------------------------

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
    try:
        content = """# Animitra Test Credentials\n\n## Admin\n- Mobile: 9999999999 | Password: Admin@1234\n\n## Demo Vet\n- Mobile: 1234567890 | Password: Demo@123\n"""
        cred_path = Path("./test_credentials.md")
        cred_path.write_text(content)
    except Exception:
        pass  # Non-critical - skip if path not writable

@app.on_event("shutdown")
async def shutdown():
    client.close()

# --------------------------- models -------------------------------------------

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
    opening_balance: Optional[float] = 0.0  # Previous pending amount

class CloseCaseRequest(BaseModel):
    treatment_status: str = "treated"
    amount: float = 0.0
    payment_status: str = "not_paid"
    payment_mode: Optional[str] = None
    paid_amount: float = 0.0
    follow_up_date: Optional[str] = None
    follow_up_reason: Optional[str] = ""
    case_details: Optional[str] = ""   # symptoms + treatment notes

class MarkPaidRequest(BaseModel):
    amount: float
    payment_mode: str
    payment_date: Optional[str] = None

class ForwardCaseRequest(BaseModel):
    to_mobile: str
    message: Optional[str] = ""

class GenerateCouponsRequest(BaseModel):
    count: int = 100

# --------------------------- auth routes --------------------------------------

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    if not data.mobile.isdigit() or len(data.mobile) != 10:
        raise HTTPException(400, "Mobile number must be 10 digits")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await db.users.find_one({"mobile": data.mobile}):
        raise HTTPException(400, "Mobile number already registered")
    now = datetime.now(timezone.utc)
    result = await db.users.insert_one({
        "name": data.name, "reg_no": data.reg_no, "mobile": data.mobile,
        "password_hash": hash_password(data.password), "state": data.state,
        "district": data.district, "taluk": data.taluk, "role": "vet",
        "is_activated": False, "coupon_code": None,
        "trial_start_date": now,
        "created_at": now,
    })
    uid = str(result.inserted_id)
    token = create_token(uid, data.mobile, "vet")
    return {
        "success": True, "message": "Registration successful. 3-day free trial started!",
        "token": token,
        "user": {
            "id": uid, "name": data.name, "mobile": data.mobile,
            "reg_no": data.reg_no, "state": data.state,
            "district": data.district, "taluk": data.taluk,
            "is_activated": False, "role": "vet",
            "is_trial": True, "trial_days_left": 7,
        }
    }

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
    if user.get("is_suspended"):
        raise HTTPException(403, "Account suspended. Contact Animitra support.")

    uid = str(user["_id"])
    role = user.get("role", "vet")

    # Activated users - full access, no trial
    if user.get("is_activated"):
        return {"success": True, "token": create_token(uid, data.mobile, role),
                "user": {
                    "id": uid, "name": user["name"], "mobile": user["mobile"],
                    "reg_no": user.get("reg_no", ""), "state": user.get("state", ""),
                    "district": user.get("district", ""), "taluk": user.get("taluk", ""),
                    "is_activated": True, "role": role,
                    "is_trial": False, "is_trial_expired": False, "trial_days_left": 0,
                }}

    # Trial logic - 7-day free trial
    trial_start = user.get("trial_start_date") or user.get("created_at")
    if trial_start is None:
        trial_start = datetime.now(timezone.utc)
    if not isinstance(trial_start, datetime):
        trial_start = datetime.now(timezone.utc)
    if trial_start.tzinfo is None:
        trial_start = trial_start.replace(tzinfo=timezone.utc)
    days_elapsed = (datetime.now(timezone.utc) - trial_start).days
    trial_days_left = max(0, 7 - days_elapsed)
    is_trial_expired = days_elapsed >= 7

    # ALWAYS allow login during AND after trial - just mark status
    # Expired trial users can still view data, just can't add new entries
    return {"success": True, "token": create_token(uid, data.mobile, role),
            "user": {
                "id": uid, "name": user["name"], "mobile": user["mobile"],
                "reg_no": user.get("reg_no", ""), "state": user.get("state", ""),
                "district": user.get("district", ""), "taluk": user.get("taluk", ""),
                "is_activated": False, "role": role,
                "is_trial": not is_trial_expired,
                "is_trial_expired": is_trial_expired,
                "trial_days_left": trial_days_left,
            }}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"success": True, "user": user}

# --------------------------- location -----------------------------------------

@api_router.get("/location/states")
async def states():
    return {"states": get_states()}

@api_router.get("/location/districts/{state}")
async def districts(state: str):
    return {"districts": get_districts(state)}

@api_router.get("/location/taluks/{state}/{district}")
async def taluks(state: str, district: str):
    return {"taluks": get_taluks(state, district)}

# --------------------------- villages autocomplete ----------------------------

@api_router.get("/export/my-clients")
async def export_my_clients(user=Depends(get_current_user)):
    """Export all unique clients for current vet as CSV."""
    pipeline = [
        {"$match": {"vet_id": user["id"]}},
        {"$group": {
            "_id": "$mobile",
            "owner_name": {"$first": "$owner_name"},
            "mobile": {"$first": "$mobile"},
            "village_name": {"$first": "$village_name"},
            "animal_types": {"$addToSet": "$animal_type"},
            "total_cases": {"$sum": 1},
            "total_paid": {"$sum": "$paid_amount"},
            "outstanding": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "closed"]}, {"$eq": ["$is_paid", False]}]}, "$amount", 0]}},
            "last_visit": {"$max": "$visit_date"},
        }},
        {"$sort": {"owner_name": 1}},
    ]
    results = await db.cases.aggregate(pipeline).to_list(5000)
    lines = ["CLIENT NAME,MOBILE,VILLAGE,ANIMAL TYPES,TOTAL CASES,TOTAL PAID (Rs),OUTSTANDING (Rs),LAST VISIT"]
    for r in results:
        last = r.get("last_visit")
        visit_str = last.strftime('%d/%m/%Y') if last else ""
        animals = "|".join([a for a in r.get("animal_types", []) if a])
        outstanding = round(r.get("outstanding", 0), 2)
        lines.append(f"{r['owner_name']},{r['mobile']},{r.get('village_name','')},{animals},{r['total_cases']},{round(r.get('total_paid',0),2)},{outstanding},{visit_str}")
    return PlainTextResponse("\n".join(lines), media_type="text/csv")
async def villages(user=Depends(get_current_user)):
    vlist = await db.cases.distinct("village_name", {"vet_id": user["id"], "village_name": {"$nin": [None, ""]}})
    return {"villages": sorted([v for v in vlist if v])}


@api_router.get("/cases/farmer-lookup")
async def farmer_lookup(q: str = "", user=Depends(get_current_user)):
    """Return distinct known farmers for this vet (by name or mobile search)."""
    base_query: dict = {"vet_id": user["id"]}
    if q:
        base_query["$or"] = [
            {"mobile": {"$regex": q, "$options": "i"}},
            {"owner_name": {"$regex": q, "$options": "i"}},
        ]
    pipeline = [
        {"$match": base_query},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$mobile",
            "owner_name": {"$first": "$owner_name"},
            "mobile": {"$first": "$mobile"},
            "village_name": {"$first": "$village_name"},
            "case_count": {"$sum": 1},
            "last_visit": {"$first": "$created_at"},
        }},
        {"$sort": {"last_visit": -1}},
        {"$limit": 8},
    ]
    results = await db.cases.aggregate(pipeline).to_list(8)
    farmers = [
        {
            "owner_name": r["owner_name"],
            "mobile": r["mobile"],
            "village_name": r.get("village_name", ""),
            "case_count": r["case_count"],
        }
        for r in results
    ]
    return {"farmers": farmers}


# --------------------------- case routes --------------------------------------

async def update_farmer_directory(mobile: str, owner_name: str, village_name: str):
    """Update global farmer directory for cross-vet name/village suggestions."""
    try:
        await db.farmer_directory.update_one(
            {"mobile": mobile},
            {
                "$inc": {
                    f"names.{owner_name.replace('.','_')}": 1,
                    f"villages.{village_name.replace('.','_') if village_name else '_blank'}": 1,
                },
                "$setOnInsert": {"mobile": mobile, "created_at": datetime.now(timezone.utc)},
            },
            upsert=True
        )
    except Exception:
        pass  # Non-critical


@api_router.get("/farmer-suggest")
async def farmer_suggest(mobile: str = "", user=Depends(get_current_user)):
    """Global cross-vet farmer name+village suggestions by mobile."""
    if not mobile or len(mobile) < 10:
        return {"names": [], "villages": []}
    entry = await db.farmer_directory.find_one({"mobile": mobile})
    if not entry:
        return {"names": [], "villages": []}
    names_raw = entry.get("names", {})
    villages_raw = entry.get("villages", {})
    names = [k.replace('_', '.') for k, _ in sorted(names_raw.items(), key=lambda x: x[1], reverse=True) if k]
    villages = [k.replace('_', '.') for k, _ in sorted(villages_raw.items(), key=lambda x: x[1], reverse=True) if k and k != '_blank']
    return {"names": names[:5], "villages": villages[:5]}


@api_router.post("/cases/quick-add")
async def quick_add_case(data: QuickCaseRequest, user=Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    visit_date = parse_date(data.visit_date) or today_start
    status = "upcoming" if visit_date > today_start else "active"
    now = datetime.now(timezone.utc)

    result = await db.cases.insert_one({
        "vet_id": user["id"], "owner_name": data.owner_name, "mobile": data.mobile,
        "village_name": data.village_name or "", "animal_type": data.animal_type,
        "visit_reason": data.visit_reason, "visit_date": visit_date, "amount": 0.0,
        "notes": data.notes or "", "status": status,
        "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
        "paid_at": None, "follow_up_date": None,
        "forwarded_to_name": "", "forwarded_from": "",
        "created_at": now, "updated_at": now,
    })

    # Update global farmer directory for cross-vet suggestions
    if data.mobile and data.owner_name:
        await update_farmer_directory(data.mobile, data.owner_name, data.village_name or "")

    # If opening balance provided, create a LEDGER-ONLY entry (not a real case)
    if data.opening_balance and data.opening_balance > 0:
        await db.cases.insert_one({
            "vet_id": user["id"], "owner_name": data.owner_name, "mobile": data.mobile,
            "village_name": data.village_name or "", "animal_type": data.animal_type or "General",
            "visit_reason": "Opening Balance", "visit_date": today_start, "amount": data.opening_balance,
            "notes": "Previous pending balance", "status": "closed",
            "treatment_status": "treated", "payment_status": "not_paid",
            "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
            "paid_at": None, "follow_up_date": None,
            "forwarded_to_name": "", "forwarded_from": "",
            "is_opening_balance": True,  # Flag: exclude from case lists and reports
            "created_at": now, "updated_at": now,
        })

    return {"success": True, "message": "Case added", "case_id": str(result.inserted_id)}

@api_router.get("/cases/today")
async def today_cases(user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today_start + timedelta(days=1)
    cursor = db.cases.find({
        "vet_id": user["id"],
        "visit_date": {"$gte": today_start, "$lt": tomorrow},
        "status": {"$nin": ["forwarded", "closed"]},
        "is_opening_balance": {"$ne": True},  # Exclude opening balance entries
    }).sort("visit_date", 1)
    return {"cases": [fmt_case(c) async for c in cursor]}

@api_router.get("/cases/upcoming")
async def upcoming_cases(user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    tomorrow = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    cursor = db.cases.find({
        "vet_id": user["id"], "status": "upcoming",
        "visit_date": {"$gte": tomorrow},
        "is_opening_balance": {"$ne": True},
    }).sort("visit_date", 1).limit(20)
    return {"cases": [fmt_case(c) async for c in cursor]}

@api_router.get("/cases/pending")
async def pending_cases(user=Depends(get_current_user)):
    await run_auto_pending(user["id"])
    cursor = db.cases.find({
        "vet_id": user["id"], "status": "pending",
        "is_opening_balance": {"$ne": True},
    }).sort("visit_date", -1).limit(50)
    return {"cases": [fmt_case(c) async for c in cursor]}

@api_router.get("/cases/closed")
async def closed_cases(user=Depends(get_current_user), skip: int = 0, limit: int = 50):
    q = {"vet_id": user["id"], "status": {"$in": ["closed", "forwarded"]}, "is_opening_balance": {"$ne": True}}
    cursor = db.cases.find(q).sort("updated_at", -1).skip(skip).limit(limit)
    total = await db.cases.count_documents(q)
    return {"cases": [fmt_case(c) async for c in cursor], "total": total}

@api_router.get("/clients/search")
async def search_clients(q: str = "", user=Depends(get_current_user)):
    """Search clients by name or mobile number."""
    if not q or len(q) < 2:
        return {"clients": []}
    if q.isdigit():
        match = {"vet_id": user["id"], "mobile": {"$regex": q}, "is_opening_balance": {"$ne": True}}
    else:
        match = {"vet_id": user["id"], "owner_name": {"$regex": q, "$options": "i"}, "is_opening_balance": {"$ne": True}}
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$mobile",
            "owner_name": {"$first": "$owner_name"},
            "mobile": {"$first": "$mobile"},
            "village_name": {"$first": "$village_name"},
            "animal_types": {"$addToSet": "$animal_type"},
            "total_cases": {"$sum": 1},
            "last_visit": {"$max": "$visit_date"},
        }},
        {"$sort": {"last_visit": -1}},
        {"$limit": 30},
    ]
    results = await db.cases.aggregate(pipeline).to_list(30)
    clients = []
    for r in results:
        outstanding_agg = await db.cases.aggregate([
            {"$match": {"vet_id": user["id"], "mobile": r["_id"], "is_paid": False, "amount": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount", "$paid_amount"]}}}}
        ]).to_list(1)
        clients.append({
            "mobile": r["_id"],
            "owner_name": r["owner_name"],
            "village_name": r.get("village_name", ""),
            "animal_types": list(r.get("animal_types", [])),
            "total_cases": r["total_cases"],
            "last_visit": r["last_visit"].isoformat() if r.get("last_visit") else None,
            "outstanding": round(outstanding_agg[0]["total"], 2) if outstanding_agg else 0,
        })
    return {"clients": clients}


@api_router.get("/cases/client/{mobile}")
async def client_case_history(mobile: str, user=Depends(get_current_user)):
    """All cases for a specific client (by mobile), for this vet only."""
    cursor = db.cases.find({
        "vet_id": user["id"], "mobile": mobile,
        "is_opening_balance": {"$ne": True},
    }).sort("visit_date", -1).limit(50)
    cases = [fmt_case(c) async for c in cursor]
    agg = await db.cases.aggregate([
        {"$match": {"vet_id": user["id"], "mobile": mobile, "is_paid": False, "amount": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount", "$paid_amount"]}}}}
    ]).to_list(1)
    return {"cases": cases, "total": len(cases), "outstanding": round(agg[0]["total"], 2) if agg else 0}

@api_router.get("/cases/client-outstanding/{mobile}")
async def client_outstanding(mobile: str, user=Depends(get_current_user)):
    agg = await db.cases.aggregate([
        {"$match": {"vet_id": user["id"], "mobile": mobile, "status": "closed", "is_paid": False, "amount": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount", "$paid_amount"]}}, "count": {"$sum": 1}}}
    ]).to_list(1)
    return {"outstanding": round(agg[0]["total"], 2) if agg else 0, "count": agg[0]["count"] if agg else 0}

@api_router.post("/cases/{case_id}/reactivate")
async def reactivate_case(case_id: str, user=Depends(get_current_user)):
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"], "status": "forwarded"})
    if not case:
        raise HTTPException(404, "Forwarded case not found")
    await db.cases.update_one({"_id": ObjectId(case_id)}, {"$set": {
        "status": "active", "forwarded_to_name": "",
        "notes": (case.get("notes", "") + " [Re-activated]").strip(),
        "updated_at": datetime.now(timezone.utc)
    }})
    return {"success": True}

@api_router.post("/cases/{case_id}/decline")
async def decline_case(case_id: str, user=Depends(get_current_user)):
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    now = datetime.now(timezone.utc)
    forwarded_from_name = case.get("forwarded_from", "")
    if forwarded_from_name:
        original_vet = await db.users.find_one({"name": forwarded_from_name, "role": "vet"})
        if original_vet:
            await db.cases.insert_one({
                "vet_id": str(original_vet["_id"]), "owner_name": case["owner_name"],
                "mobile": case["mobile"], "village_name": case.get("village_name", ""),
                "animal_type": case["animal_type"], "visit_reason": case["visit_reason"],
                "visit_date": now.replace(hour=0, minute=0, second=0, microsecond=0),
                "amount": 0.0, "notes": f"Returned — Declined by Dr. {user.get('name', '')}",
                "status": "active", "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
                "paid_at": None, "follow_up_date": None,
                "forwarded_to_name": "", "forwarded_from": "",
                "created_at": now, "updated_at": now, "is_opening_balance": False,
            })
    await db.cases.update_one({"_id": ObjectId(case_id)}, {"$set": {
        "status": "declined",
        "notes": (case.get("notes", "") + f" [Declined by Dr. {user.get('name','')}]").strip(),
        "updated_at": now
    }})
    return {"success": True, "returned_to": forwarded_from_name}

@api_router.post("/cases/{case_id}/close")
async def close_case(case_id: str, data: CloseCaseRequest, user=Depends(get_current_user)):
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    now = datetime.now(timezone.utc)

    update: dict = {
        "status": "closed",
        "treatment_status": data.treatment_status,
        "case_details": data.case_details or "",
        "updated_at": now,
    }

    if data.treatment_status == "treated":
        # Calculate actual paid amount based on payment_status
        if data.payment_status == "full":
            actual_paid = data.amount
        elif data.payment_status == "partial":
            actual_paid = max(0.0, data.paid_amount)
        else:  # not_paid / collect_later
            actual_paid = 0.0

        update.update({
            "amount": data.amount,
            "payment_status": data.payment_status,
            "payment_mode": data.payment_mode if data.payment_status != "not_paid" else None,
            "paid_amount": actual_paid,
            "is_paid": data.payment_status == "full",
            "paid_at": now if actual_paid > 0 else None,
        })
    else:
        # Not treated - no charges
        update.update({
            "amount": 0.0, "payment_status": "not_applicable",
            "payment_mode": None, "paid_amount": 0.0,
            "is_paid": False, "paid_at": None,
        })

    fu_date = parse_date(data.follow_up_date)
    if fu_date and data.treatment_status == "treated":
        update["follow_up_date"] = fu_date
        fu_reason = data.follow_up_reason.strip() if data.follow_up_reason else "Follow-up"
        await db.cases.insert_one({
            "vet_id": user["id"], "owner_name": case["owner_name"], "mobile": case["mobile"],
            "village_name": case.get("village_name", ""), "animal_type": case["animal_type"],
            "visit_reason": fu_reason, "visit_date": fu_date, "amount": 0.0,
            "notes": f"Follow-up from {case['visit_reason']} on {case.get('visit_date', case['created_at']).strftime('%d/%m/%Y')}",
            "status": "upcoming", "is_paid": False, "payment_mode": None, "paid_amount": 0.0,
            "paid_at": None, "follow_up_date": None, "forwarded_to_name": "", "forwarded_from": "",
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
    target = await db.users.find_one({"mobile": data.to_mobile, "is_suspended": {"$ne": True}, "role": "vet"})
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

# --------------------------- ledger -------------------------------------------

@api_router.put("/cases/{case_id}")
async def edit_case(case_id: str, data: dict, user=Depends(get_current_user)):
    """Edit notes and visit_reason of a case."""
    case = await db.cases.find_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if not case:
        raise HTTPException(404, "Case not found")
    update = {"updated_at": datetime.now(timezone.utc)}
    if "notes" in data:
        update["notes"] = data["notes"]
    if "visit_reason" in data and data["visit_reason"]:
        update["visit_reason"] = data["visit_reason"]
    await db.cases.update_one({"_id": ObjectId(case_id)}, {"$set": update})
    return {"success": True}
async def delete_case(case_id: str, user=Depends(get_current_user)):
    result = await db.cases.delete_one({"_id": ObjectId(case_id), "vet_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Case not found")
    return {"success": True}


@api_router.delete("/users/me")
async def delete_my_account(user=Depends(get_current_user)):
    """Factory reset - delete all user data. Freed mobile can re-register."""
    uid = user["id"]
    await db.cases.delete_many({"vet_id": uid})
    await db.payment_submissions.delete_many({"user_id": uid})
    # Free up their coupon code so it can't be reused (already activated = stays used)
    await db.users.delete_one({"_id": ObjectId(uid)})
    return {"success": True, "message": "All data deleted successfully"}


@api_router.post("/admin/users/{uid}/delete")
async def admin_delete_user(uid: str, user=Depends(get_admin_user)):
    """Admin deletes a user - their mobile is freed for re-registration."""
    await db.cases.delete_many({"vet_id": uid})
    await db.payment_submissions.delete_many({"user_id": uid})
    await db.users.delete_one({"_id": ObjectId(uid)})
    return {"success": True}
@api_router.get("/ledger/outstanding")
async def outstanding(period: str = "all", user=Depends(get_current_user)):
    query: dict = {
        "vet_id": user["id"], "status": "closed",
        "treatment_status": {"$ne": "not_treated"},
        "is_paid": False, "amount": {"$gt": 0},
    }
    if period == "week":
        query["created_at"] = {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
    elif period == "month":
        query["created_at"] = {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}

    # Fetch all outstanding cases sorted oldest first
    all_cases = []
    async for c in db.cases.find(query).sort("created_at", 1):
        fc = fmt_case(c)
        fc["outstanding"] = round(c.get("amount", 0) - c.get("paid_amount", 0), 2)
        all_cases.append(fc)

    # Group by mobile (farmer)
    farmer_map: dict = {}
    for c in all_cases:
        key = c["mobile"]
        if key not in farmer_map:
            farmer_map[key] = {
                "owner_name": c["owner_name"], "mobile": c["mobile"],
                "village_name": c["village_name"] or "",
                "total_outstanding": 0.0, "case_count": 0, "cases": [],
            }
        farmer_map[key]["total_outstanding"] = round(farmer_map[key]["total_outstanding"] + c["outstanding"], 2)
        farmer_map[key]["case_count"] += 1
        farmer_map[key]["cases"].append(c)

    farmers = sorted(farmer_map.values(), key=lambda x: x["total_outstanding"], reverse=True)
    total = round(sum(f["total_outstanding"] for f in farmers), 2)
    return {"total_outstanding": total, "total_farmers": len(farmers), "farmers": farmers}


class FarmerCollectRequest(BaseModel):
    mobile: str            # farmer mobile
    owner_name: str
    amount: float          # total amount being collected
    payment_mode: str


@api_router.post("/ledger/farmer-collect")
async def farmer_collect(data: FarmerCollectRequest, user=Depends(get_current_user)):
    """Apply payment FIFO across farmer's outstanding cases (oldest first)."""
    cases_cursor = db.cases.find({
        "vet_id": user["id"], "mobile": data.mobile,
        "status": "closed", "is_paid": False, "amount": {"$gt": 0},
        "treatment_status": {"$ne": "not_treated"},
    }).sort("created_at", 1)

    remaining = data.amount
    total_applied = 0.0
    now = datetime.now(timezone.utc)

    async for c in cases_cursor:
        if remaining <= 0:
            break
        case_outstanding = round(c.get("amount", 0) - c.get("paid_amount", 0), 2)
        if case_outstanding <= 0:
            continue

        if remaining >= case_outstanding:
            # Fully pay this case
            await db.cases.update_one({"_id": c["_id"]}, {"$set": {
                "paid_amount": c.get("amount", 0),
                "is_paid": True, "payment_mode": data.payment_mode,
                "paid_at": now, "updated_at": now,
            }})
            total_applied += case_outstanding
            remaining = round(remaining - case_outstanding, 2)
        else:
            # Partial - pay remaining balance into this case
            new_paid = round(c.get("paid_amount", 0) + remaining, 2)
            await db.cases.update_one({"_id": c["_id"]}, {"$set": {
                "paid_amount": new_paid, "is_paid": False,
                "payment_mode": data.payment_mode, "updated_at": now,
            }})
            total_applied += remaining
            remaining = 0

    return {"success": True, "collected": round(total_applied, 2)}

# --------------------------- dashboard stats ----------------------------------

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

# --------------------------- admin coupons ------------------------------------

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

# --------------------------- subscription / UTR -------------------------------

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


# --------------------------- reports ------------------------------------------

@api_router.get("/reports/animal-type")
async def report_animal_type(period: str = "month", user=Depends(get_current_user)):
    start = get_period_start(period)
    pipeline = [
        {"$match": {"vet_id": user["id"], "created_at": {"$gte": start}, "is_opening_balance": {"$ne": True}}},
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


# --------------------------- admin extended -----------------------------------

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


@api_router.get("/forward-history")
async def forward_history(user=Depends(get_current_user)):
    """List of doctors this vet has forwarded cases to before."""
    pipeline = [
        {"$match": {"vet_id": user["id"], "status": "forwarded", "forwarded_to_name": {"$ne": ""}}},
        {"$group": {"_id": "$forwarded_to_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db.cases.aggregate(pipeline).to_list(20)
    # Try to find mobile numbers for these doctors
    doctors = []
    for r in results:
        doc_name = r["_id"]
        # Find the case to get the target vet's mobile
        sample_case = await db.cases.find_one({"vet_id": user["id"], "forwarded_to_name": doc_name})
        # Find the vet by their name
        target_vet = await db.users.find_one({"name": doc_name, "role": "vet"})
        doctors.append({
            "name": doc_name,
            "mobile": target_vet["mobile"] if target_vet else "",
            "forward_count": r["count"],
        })
    return {"doctors": doctors}


@api_router.put("/users/me/profile")
async def update_profile(user=Depends(get_current_user)):
    """Placeholder — use POST with JSON body."""
    raise HTTPException(405, "Use POST method")


@api_router.post("/users/me/profile")
async def update_my_profile(data: dict, user=Depends(get_current_user)):
    """Update current user's profile fields."""
    allowed = {"name", "reg_no", "state", "district", "taluk", "profile_photo"}
    update = {k: v for k, v in data.items() if k in allowed}
    if not update:
        raise HTTPException(400, "No valid fields to update")
    update["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    return {"success": True}
@api_router.post("/admin/users/{uid}/reset-password")
async def admin_reset_password(uid: str, user=Depends(get_admin_user)):
    """Generate new random password for a user and return it to admin."""
    import string
    chars = string.ascii_letters + string.digits + "!@#$"
    new_pwd = ''.join(secrets.choice(chars) for _ in range(10))
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"password_hash": hash_password(new_pwd)}})
    return {"success": True, "new_password": new_pwd}


@api_router.post("/users/change-password")
async def change_my_password(data: dict, user=Depends(get_current_user)):
    """User changes their own password."""
    old_pwd = data.get("old_password", "")
    new_pwd = data.get("new_password", "")
    if len(new_pwd) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    db_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not db_user or not verify_password(old_pwd, db_user["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"password_hash": hash_password(new_pwd)}})
    return {"success": True}
@api_router.post("/admin/users/{uid}/activate")
async def admin_activate_user(uid: str, user=Depends(get_admin_user)):
    """Admin directly activates a user - auto-picks an unused coupon."""
    target = await db.users.find_one({"_id": ObjectId(uid)})
    if not target:
        raise HTTPException(404, "User not found")
    if target.get("is_activated"):
        raise HTTPException(400, "User is already activated")

    # Auto-pick first available unused coupon
    coupon = await db.coupons.find_one({"is_activated": False})
    if not coupon:
        raise HTTPException(400, "No available coupon codes. Please generate more.")

    now = datetime.now(timezone.utc)
    # Mark coupon as used
    await db.coupons.update_one({"_id": coupon["_id"]}, {"$set": {
        "is_activated": True, "activated_by": uid,
        "activated_at": now, "activated_by_admin": user["id"]
    }})
    # Activate user
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {
        "is_activated": True, "coupon_code": coupon["code"],
        "activated_at": now,
    }})
    return {"success": True, "coupon_used": coupon["code"],
            "message": f"User activated with coupon {coupon['code']}"}
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


# --------------------------- banners -----------------------------------------

class BannerRequest(BaseModel):
    title: str
    image_url: str
    link_url: str
    is_active: bool = True


@api_router.post("/admin/banners")
async def create_banner(data: BannerRequest, user=Depends(get_admin_user)):
    # Deactivate others if setting new one active
    if data.is_active:
        await db.banners.update_many({}, {"$set": {"is_active": False}})
    result = await db.banners.insert_one({
        "title": data.title, "image_url": data.image_url,
        "link_url": data.link_url, "is_active": data.is_active,
        "created_by": user["id"], "created_at": datetime.now(timezone.utc),
    })
    return {"success": True, "id": str(result.inserted_id)}


@api_router.get("/admin/banners")
async def list_banners(user=Depends(get_admin_user)):
    banners = []
    async for b in db.banners.find({}).sort("created_at", -1):
        banners.append({
            "id": str(b["_id"]), "title": b["title"],
            "image_url": b["image_url"], "link_url": b["link_url"],
            "is_active": b.get("is_active", False),
            "created_at": b["created_at"].isoformat(),
        })
    return {"banners": banners}


@api_router.put("/admin/banners/{bid}/toggle")
async def toggle_banner(bid: str, user=Depends(get_admin_user)):
    banner = await db.banners.find_one({"_id": ObjectId(bid)})
    if not banner:
        raise HTTPException(404, "Banner not found")
    new_state = not banner.get("is_active", False)
    if new_state:
        await db.banners.update_many({}, {"$set": {"is_active": False}})
    await db.banners.update_one({"_id": ObjectId(bid)}, {"$set": {"is_active": new_state}})
    return {"success": True, "is_active": new_state}


@api_router.delete("/admin/banners/{bid}")
async def delete_banner(bid: str, user=Depends(get_admin_user)):
    await db.banners.delete_one({"_id": ObjectId(bid)})
    return {"success": True}


@api_router.get("/banners/active")
async def active_banner(user=Depends(get_current_user)):
    banner = await db.banners.find_one({"is_active": True})
    if not banner:
        return {"banner": None}
    return {"banner": {
        "id": str(banner["_id"]), "title": banner["title"],
        "image_url": banner["image_url"], "link_url": banner["link_url"],
    }}
@api_router.get("/admin/analytics/top-performers")
async def top_performers(user=Depends(get_admin_user)):
    vets = []
    async for u in db.users.find({"role": "vet"}).sort("created_at", -1):
        uid = str(u["_id"])
        total_cases = await db.cases.count_documents({"vet_id": uid})
        closed_cases = await db.cases.count_documents({"vet_id": uid, "status": "closed"})
        pending_cases = await db.cases.count_documents({"vet_id": uid, "status": "pending"})
        earnings_agg = await db.cases.aggregate([
            {"$match": {"vet_id": uid, "is_paid": True}},
            {"$group": {"_id": None, "total": {"$sum": "$paid_amount"}}}
        ]).to_list(1)
        total_earnings = earnings_agg[0]["total"] if earnings_agg else 0
        outstanding_agg = await db.cases.aggregate([
            {"$match": {"vet_id": uid, "status": "closed", "is_paid": False}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        outstanding = outstanding_agg[0]["total"] if outstanding_agg else 0
        trial_start = u.get("trial_start_date") or u.get("created_at")
        if trial_start and trial_start.tzinfo is None:
            trial_start = trial_start.replace(tzinfo=timezone.utc)
        days_elapsed = (datetime.now(timezone.utc) - trial_start).days if trial_start else 0
        vets.append({
            "id": uid, "name": u["name"], "mobile": u["mobile"],
            "reg_no": u.get("reg_no", ""), "state": u.get("state", ""),
            "district": u.get("district", ""), "taluk": u.get("taluk", ""),
            "is_activated": u.get("is_activated", False),
            "is_suspended": u.get("is_suspended", False),
            "trial_days_elapsed": days_elapsed,
            "total_cases": total_cases, "closed_cases": closed_cases,
            "pending_cases": pending_cases,
            "total_earnings": round(total_earnings, 2),
            "outstanding": round(outstanding, 2),
            "registered_at": u["created_at"].isoformat(),
        })
    by_cases = sorted(vets, key=lambda x: x["total_cases"], reverse=True)
    by_earnings = sorted(vets, key=lambda x: x["total_earnings"], reverse=True)
    return {"total_vets": len(vets), "by_cases": by_cases, "by_earnings": by_earnings}


@api_router.get("/admin/export/owner-data")
async def export_owner_data(user=Depends(get_admin_user)):
    """Export all case owner data for WhatsApp/CSV sharing."""
    pipeline = [
        {"$group": {
            "_id": "$mobile",
            "owner_name": {"$first": "$owner_name"},
            "mobile": {"$first": "$mobile"},
            "village_name": {"$first": "$village_name"},
            "animal_types": {"$addToSet": "$animal_type"},
            "total_cases": {"$sum": 1},
            "vet_id": {"$first": "$vet_id"},
        }},
        {"$sort": {"total_cases": -1}},
        {"$limit": 500},
    ]
    results = await db.cases.aggregate(pipeline).to_list(500)
    vet_cache: dict = {}
    lines = ["OWNER NAME,MOBILE,VILLAGE,ANIMAL TYPES,TOTAL CASES,VET NAME,STATE,DISTRICT"]
    for r in results:
        vid = r.get("vet_id", "")
        if vid not in vet_cache:
            v = await db.users.find_one({"_id": ObjectId(vid)}) if vid else None
            vet_cache[vid] = v
        vet = vet_cache.get(vid)
        vet_name = vet.get("name", "") if vet else ""
        state = vet.get("state", "") if vet else ""
        district = vet.get("district", "") if vet else ""
        animals = "|".join(r.get("animal_types", []))
        lines.append(f"{r['owner_name']},{r['mobile']},{r.get('village_name','')},{animals},{r['total_cases']},{vet_name},{state},{district}")
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


# --------------------------- health -------------------------------------------

@api_router.get("/")
async def root():
    return {"message": "Animitra API running", "version": "3.0.0"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
