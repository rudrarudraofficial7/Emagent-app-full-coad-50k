"""Freezy Prop Firm Command Center - Backend API."""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
import uuid
import httpx
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Freezy Prop Firm Command Center")
api_router = APIRouter(prefix="/api")

# ====================== Helpers ======================

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def strip(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ====================== Auth ======================

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class SessionBody(BaseModel):
    session_token: str


async def get_current_user(request: Request) -> dict:
    """Extract Bearer token and resolve user. Raises 401 if missing/invalid."""
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth_header.split(" ", 1)[1].strip()

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@api_router.post("/auth/session")
async def auth_session(body: SessionBody):
    """Exchange Emergent session_token: verify via Emergent, upsert user, persist session."""
    if not body.session_token:
        raise HTTPException(400, "session_token required")
    async with httpx.AsyncClient(timeout=20.0) as client_http:
        resp = await client_http.get(
            EMERGENT_AUTH_URL,
            headers={"X-Session-ID": body.session_token},
        )
    if resp.status_code != 200:
        raise HTTPException(401, f"Emergent session lookup failed: {resp.status_code}")
    data = resp.json()
    email = data.get("email")
    if not email:
        raise HTTPException(401, "Invalid session payload")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name")),
                      "picture": data.get("picture", existing.get("picture"))}},
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(user.copy())

    session_token = data.get("session_token") or body.session_token
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user["user_id"],
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {
        "user": strip(user),
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
    }


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {"user": user}


@api_router.post("/auth/logout")
async def auth_logout(request: Request):
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}

# ====================== Models ======================

class Settings(BaseModel):
    id: str = "singleton"
    tradingDaysAvailable: int = 90
    expectedR: float = 210.0
    profitSplit: float = 0.9
    goalAmount: float = 50000.0
    startDate: str = Field(default_factory=now_iso)
    traderName: str = "Freezy"

class SettingsUpdate(BaseModel):
    tradingDaysAvailable: Optional[int] = None
    expectedR: Optional[float] = None
    profitSplit: Optional[float] = None
    goalAmount: Optional[float] = None
    startDate: Optional[str] = None
    traderName: Optional[str] = None

ACCOUNT_PRICES = {"25K": 60.0, "50K": 80.0}
ACCOUNT_SIZES = {"25K": 25000.0, "50K": 50000.0}
ACCOUNT_MAX_PAYOUT = {"25K": 1000.0, "50K": 2000.0}

AccountType = Literal["25K", "50K"]
AccountStatus = Literal["evaluation_running", "evaluation_passed", "funded_active", "blown"]

class FundedDay(BaseModel):
    dayNumber: int
    date: str
    profit: float
    counts: bool

class PayoutRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    payoutNumber: int
    date: str
    grossProfit: float
    splitPct: float
    netReceived: float

class Account(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    accountType: AccountType
    price: float
    accountSize: float
    maxPayout: float
    status: AccountStatus = "evaluation_running"
    currentProfitPct: float = 0.0
    consistencyPct: float = 0.0
    purchaseDate: str = Field(default_factory=now_iso)
    evaluationStartDate: Optional[str] = None
    evaluationPassDate: Optional[str] = None
    fundedDate: Optional[str] = None
    fundedDays: List[FundedDay] = []
    payouts: List[PayoutRecord] = []
    isMaster: bool = False
    copyEnabled: bool = False

class AccountCreate(BaseModel):
    name: str
    accountType: AccountType

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[AccountStatus] = None
    currentProfitPct: Optional[float] = None
    consistencyPct: Optional[float] = None
    evaluationStartDate: Optional[str] = None
    evaluationPassDate: Optional[str] = None
    fundedDate: Optional[str] = None
    isMaster: Optional[bool] = None
    copyEnabled: Optional[bool] = None

class FundedDayCreate(BaseModel):
    dayNumber: int
    date: Optional[str] = None
    profit: float

class PayoutCreate(BaseModel):
    grossProfit: float
    date: Optional[str] = None

class PlanDay(BaseModel):
    dayNumber: int
    date: str
    targetR: float
    status: Literal["pending", "in_progress", "completed", "missed"] = "pending"
    notes: str = ""
    rEarned: float = 0.0
    checklist: Dict[str, bool] = Field(default_factory=lambda: {
        "marketAnalysis": False,
        "setupFound": False,
        "tradeTaken": False,
        "riskFollowed": False,
        "journalUpdated": False,
        "dayCompleted": False,
    })

class PlanDayUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    rEarned: Optional[float] = None
    checklist: Optional[Dict[str, bool]] = None

class JournalEntry(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str = Field(default_factory=now_iso)
    market: str = ""
    setupType: str = ""
    entry: float = 0.0
    stopLoss: float = 0.0
    takeProfit: float = 0.0
    risk: float = 0.0
    result: Literal["win", "loss", "be"] = "win"
    rEarned: float = 0.0
    notes: str = ""
    screenshotBase64: Optional[str] = None
    accountId: Optional[str] = None

class JournalCreate(BaseModel):
    date: Optional[str] = None
    market: str = ""
    setupType: str = ""
    entry: float = 0.0
    stopLoss: float = 0.0
    takeProfit: float = 0.0
    risk: float = 0.0
    result: Literal["win", "loss", "be"] = "win"
    rEarned: float = 0.0
    notes: str = ""
    screenshotBase64: Optional[str] = None
    accountId: Optional[str] = None

class JournalUpdate(BaseModel):
    date: Optional[str] = None
    market: Optional[str] = None
    setupType: Optional[str] = None
    entry: Optional[float] = None
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    risk: Optional[float] = None
    result: Optional[str] = None
    rEarned: Optional[float] = None
    notes: Optional[str] = None
    screenshotBase64: Optional[str] = None
    accountId: Optional[str] = None

# ====================== Seeding ======================

async def ensure_settings() -> dict:
    s = await db.settings.find_one({"id": "singleton"})
    if not s:
        s = Settings().model_dump()
        await db.settings.insert_one(s.copy())
    return strip(s)

async def ensure_plan(start_date_iso: str, total_days: int, expected_r: float):
    existing_count = await db.plan_days.count_documents({})
    daily_r = round(expected_r / total_days, 2) if total_days > 0 else 0
    start = datetime.fromisoformat(start_date_iso.replace("Z", "+00:00")) if start_date_iso else datetime.now(timezone.utc)

    # Trim down: drop only the trailing days the user no longer wants.
    if existing_count > total_days:
        await db.plan_days.delete_many({"dayNumber": {"$gt": total_days}})

    # Refresh target R on every existing day so a new expectedR propagates.
    await db.plan_days.update_many({}, {"$set": {"targetR": daily_r}})

    # Append any missing days without touching user-entered checklist/notes/rEarned.
    if existing_count < total_days:
        docs = []
        for i in range(existing_count + 1, total_days + 1):
            d = PlanDay(
                dayNumber=i,
                date=(start + timedelta(days=i - 1)).isoformat(),
                targetR=daily_r,
            ).model_dump()
            docs.append(d)
        if docs:
            await db.plan_days.insert_many(docs)

async def ensure_starter_account():
    cnt = await db.accounts.count_documents({})
    if cnt == 0:
        acc = Account(
            name="25K Starter",
            accountType="25K",
            price=ACCOUNT_PRICES["25K"],
            accountSize=ACCOUNT_SIZES["25K"],
            maxPayout=ACCOUNT_MAX_PAYOUT["25K"],
            evaluationStartDate=now_iso(),
        ).model_dump()
        await db.accounts.insert_one(acc.copy())

async def bootstrap():
    s = await ensure_settings()
    await ensure_plan(s.get("startDate") or now_iso(), int(s.get("tradingDaysAvailable", 90)), float(s.get("expectedR", 210)))
    await ensure_starter_account()

# ====================== Settings ======================

@api_router.get("/settings")
async def get_settings():
    return await ensure_settings()

@api_router.put("/settings")
async def update_settings(payload: SettingsUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.settings.update_one({"id": "singleton"}, {"$set": updates}, upsert=True)
    s = await db.settings.find_one({"id": "singleton"})
    # If plan-affecting fields changed, regenerate plan keeping completed work
    if any(k in updates for k in ("tradingDaysAvailable", "expectedR", "startDate")):
        await ensure_plan(s.get("startDate") or now_iso(), int(s.get("tradingDaysAvailable", 90)), float(s.get("expectedR", 210)))
    return strip(s)

# ====================== Accounts ======================

@api_router.get("/accounts")
async def list_accounts():
    cursor = db.accounts.find({}, {"_id": 0})
    items = await cursor.to_list(1000)
    items.sort(key=lambda a: a.get("purchaseDate", ""))
    return items

@api_router.post("/accounts")
async def create_account(payload: AccountCreate):
    t = payload.accountType
    if t not in ACCOUNT_PRICES:
        raise HTTPException(400, "Invalid accountType")
    acc = Account(
        name=payload.name,
        accountType=t,
        price=ACCOUNT_PRICES[t],
        accountSize=ACCOUNT_SIZES[t],
        maxPayout=ACCOUNT_MAX_PAYOUT[t],
        evaluationStartDate=now_iso(),
    ).model_dump()
    await db.accounts.insert_one(acc.copy())
    return strip(acc)

@api_router.get("/accounts/{account_id}")
async def get_account(account_id: str):
    a = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Account not found")
    return a

@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, payload: AccountUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return await get_account(account_id)
    # Auto-stamp transition dates
    if updates.get("status") == "evaluation_passed" and "evaluationPassDate" not in updates:
        updates["evaluationPassDate"] = now_iso()
    if updates.get("status") == "funded_active" and "fundedDate" not in updates:
        updates["fundedDate"] = now_iso()
    res = await db.accounts.update_one({"id": account_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Account not found")
    return await get_account(account_id)

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    res = await db.accounts.delete_one({"id": account_id})
    return {"deleted": res.deleted_count}

@api_router.post("/accounts/{account_id}/funded-days")
async def add_funded_day(account_id: str, payload: FundedDayCreate):
    a = await db.accounts.find_one({"id": account_id})
    if not a:
        raise HTTPException(404, "Account not found")
    new_day = FundedDay(
        dayNumber=payload.dayNumber,
        date=payload.date or now_iso(),
        profit=payload.profit,
        counts=payload.profit >= 150.0,
    ).model_dump()
    # Replace if exists, else append
    existing = [d for d in a.get("fundedDays", []) if d.get("dayNumber") != payload.dayNumber]
    existing.append(new_day)
    existing.sort(key=lambda d: d["dayNumber"])
    await db.accounts.update_one({"id": account_id}, {"$set": {"fundedDays": existing}})
    return await get_account(account_id)

@api_router.delete("/accounts/{account_id}/funded-days/{day_number}")
async def remove_funded_day(account_id: str, day_number: int):
    a = await db.accounts.find_one({"id": account_id})
    if not a:
        raise HTTPException(404, "Account not found")
    remaining = [d for d in a.get("fundedDays", []) if d.get("dayNumber") != day_number]
    await db.accounts.update_one({"id": account_id}, {"$set": {"fundedDays": remaining}})
    return await get_account(account_id)

@api_router.post("/accounts/{account_id}/payouts")
async def add_payout(account_id: str, payload: PayoutCreate):
    a = await db.accounts.find_one({"id": account_id})
    if not a:
        raise HTTPException(404, "Account not found")
    s = await ensure_settings()
    split = float(s.get("profitSplit", 0.9))
    payouts = a.get("payouts", [])
    rec = PayoutRecord(
        payoutNumber=len(payouts) + 1,
        date=payload.date or now_iso(),
        grossProfit=payload.grossProfit,
        splitPct=split,
        netReceived=round(payload.grossProfit * split, 2),
    ).model_dump()
    payouts.append(rec)
    await db.accounts.update_one({"id": account_id}, {"$set": {"payouts": payouts}})
    return await get_account(account_id)

@api_router.delete("/accounts/{account_id}/payouts/{payout_id}")
async def delete_payout(account_id: str, payout_id: str):
    a = await db.accounts.find_one({"id": account_id})
    if not a:
        raise HTTPException(404, "Account not found")
    remaining = [p for p in a.get("payouts", []) if p.get("id") != payout_id]
    # Renumber
    for i, p in enumerate(remaining):
        p["payoutNumber"] = i + 1
    await db.accounts.update_one({"id": account_id}, {"$set": {"payouts": remaining}})
    return await get_account(account_id)

# ====================== Plan ======================

@api_router.get("/plan")
async def get_plan():
    s = await ensure_settings()
    await ensure_plan(s.get("startDate") or now_iso(), int(s.get("tradingDaysAvailable", 90)), float(s.get("expectedR", 210)))
    cursor = db.plan_days.find({}, {"_id": 0}).sort("dayNumber", 1)
    return await cursor.to_list(500)

@api_router.put("/plan/{day_number}")
async def update_plan_day(day_number: int, payload: PlanDayUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        d = await db.plan_days.find_one({"dayNumber": day_number}, {"_id": 0})
        return d
    res = await db.plan_days.update_one({"dayNumber": day_number}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Plan day not found")
    return await db.plan_days.find_one({"dayNumber": day_number}, {"_id": 0})

# ====================== Journal ======================

@api_router.get("/journal")
async def list_journal():
    cursor = db.journal.find({}, {"_id": 0}).sort("date", -1)
    return await cursor.to_list(2000)

@api_router.post("/journal")
async def create_journal(payload: JournalCreate):
    entry = JournalEntry(**{k: v for k, v in payload.model_dump().items() if v is not None}).model_dump()
    if not entry.get("date"):
        entry["date"] = now_iso()
    await db.journal.insert_one(entry.copy())
    return strip(entry)

@api_router.put("/journal/{entry_id}")
async def update_journal(entry_id: str, payload: JournalUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.journal.update_one({"id": entry_id}, {"$set": updates})
    return await db.journal.find_one({"id": entry_id}, {"_id": 0})

@api_router.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str):
    res = await db.journal.delete_one({"id": entry_id})
    return {"deleted": res.deleted_count}

# ====================== Dashboard ======================

ACHIEVEMENT_DEFS = [
    {"id": "first_eval_pass", "title": "First Evaluation Pass", "desc": "Pass your first evaluation"},
    {"id": "first_funded", "title": "First Funded Account", "desc": "Unlock your first funded account"},
    {"id": "first_payout", "title": "First Payout", "desc": "Receive your first payout"},
    {"id": "payout_5k", "title": "$5K Milestone", "desc": "Cumulative payouts reach $5,000"},
    {"id": "payout_10k", "title": "$10K Milestone", "desc": "Cumulative payouts reach $10,000"},
    {"id": "payout_25k", "title": "$25K Milestone", "desc": "Cumulative payouts reach $25,000"},
    {"id": "payout_50k", "title": "Mission Complete", "desc": "Hit the $50,000 goal"},
]

@api_router.get("/dashboard")
async def dashboard():
    s = await ensure_settings()
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(1000)
    plan = await db.plan_days.find({}, {"_id": 0}).to_list(500)
    journal = await db.journal.find({}, {"_id": 0}).to_list(2000)

    eval_accounts = [a for a in accounts if a["status"] in ("evaluation_running", "evaluation_passed")]
    funded_accounts = [a for a in accounts if a["status"] == "funded_active"]
    all_payouts: List[dict] = []
    for a in accounts:
        for p in a.get("payouts", []):
            all_payouts.append({**p, "accountId": a["id"], "accountName": a["name"], "accountType": a["accountType"]})
    all_payouts.sort(key=lambda p: p["date"])
    total_payout = round(sum(p["netReceived"] for p in all_payouts), 2)

    days_used = sum(1 for d in plan if d.get("status") == "completed")
    total_r = round(sum(float(d.get("rEarned", 0)) for d in plan), 2)

    wins = sum(1 for j in journal if j.get("result") == "win")
    losses = sum(1 for j in journal if j.get("result") == "loss")
    total_trades = wins + losses
    win_rate = round((wins / total_trades) * 100, 1) if total_trades else 0.0
    avg_r = round(sum(float(j.get("rEarned", 0)) for j in journal) / len(journal), 2) if journal else 0.0
    best_day = max((float(j.get("rEarned", 0)) for j in journal), default=0.0)
    worst_day = min((float(j.get("rEarned", 0)) for j in journal), default=0.0)

    goal = float(s.get("goalAmount", 50000.0))
    progress_pct = round(min((total_payout / goal) * 100, 100), 1) if goal > 0 else 0.0
    motivation = (
        "Mission Complete" if progress_pct >= 100 else
        "Elite Trader" if progress_pct >= 75 else
        "Scaler" if progress_pct >= 50 else
        "Builder" if progress_pct >= 25 else
        "Rookie"
    )

    achieved = set()
    if any(a.get("evaluationPassDate") for a in accounts):
        achieved.add("first_eval_pass")
    if funded_accounts or any(a.get("fundedDate") for a in accounts):
        achieved.add("first_funded")
    if all_payouts:
        achieved.add("first_payout")
    if total_payout >= 5000:
        achieved.add("payout_5k")
    if total_payout >= 10000:
        achieved.add("payout_10k")
    if total_payout >= 25000:
        achieved.add("payout_25k")
    if total_payout >= 50000:
        achieved.add("payout_50k")
    achievements = [{**d, "unlocked": d["id"] in achieved} for d in ACHIEVEMENT_DEFS]

    # Account growth & payout growth curve (cumulative)
    payout_curve = []
    cum = 0.0
    for p in all_payouts:
        cum += p["netReceived"]
        payout_curve.append({"date": p["date"], "value": round(cum, 2)})

    days_available = int(s.get("tradingDaysAvailable", 90))
    days_remaining = max(days_available - days_used, 0)
    remaining_payout = max(round(goal - total_payout, 2), 0.0)
    remaining_r = max(round(float(s.get("expectedR", 210)) - total_r, 2), 0.0)

    # Required R/day & velocity-based ETA
    today_required_r = round(remaining_r / days_remaining, 2) if days_remaining > 0 else 0.0
    pace_status = "on_track"
    if days_remaining == 0 and total_r < float(s.get("expectedR", 210)):
        pace_status = "expired"
    elif today_required_r > (float(s.get("expectedR", 210)) / days_available) * 1.5 and days_available > 0:
        pace_status = "behind"
    elif total_r > (float(s.get("expectedR", 210)) / days_available) * days_used:
        pace_status = "ahead"

    # ETA forecast based on payout velocity
    eta_date = None
    days_to_goal = None
    projected_monthly = 0.0
    forecast_available = False
    if all_payouts and total_payout > 0:
        first_dt = datetime.fromisoformat(all_payouts[0]["date"].replace("Z", "+00:00"))
        elapsed_days = max((datetime.now(timezone.utc) - first_dt).days, 1)
        daily_velocity = total_payout / elapsed_days
        if daily_velocity > 0 and remaining_payout > 0:
            days_to_goal = int(remaining_payout / daily_velocity) + 1
            eta_dt = datetime.now(timezone.utc) + timedelta(days=days_to_goal)
            eta_date = eta_dt.isoformat()
            projected_monthly = round(daily_velocity * 30, 2)
            forecast_available = True
        elif remaining_payout == 0:
            eta_date = datetime.now(timezone.utc).isoformat()
            days_to_goal = 0
            forecast_available = True

    # Next account to add: rule says start 1x25K, after each payout add 1x50K.
    eligible_to_add = len(all_payouts) >= (len(accounts) - 1)

    return {
        "settings": s,
        "kpis": {
            "totalAccounts": len(accounts),
            "evaluationAccounts": len(eval_accounts),
            "fundedAccounts": len(funded_accounts),
            "totalTradingDays": days_available,
            "daysUsed": days_used,
            "daysRemaining": days_remaining,
            "totalR": total_r,
            "remainingR": round(float(s.get("expectedR", 210)) - total_r, 2),
            "totalPayout": total_payout,
            "remainingPayout": remaining_payout,
            "winRate": win_rate,
            "avgR": avg_r,
            "bestDay": best_day,
            "worstDay": worst_day,
            "totalTrades": total_trades,
            "wins": wins,
            "losses": losses,
            "todayRequiredR": today_required_r,
            "paceStatus": pace_status,
            "originalDailyR": round(float(s.get("expectedR", 210)) / days_available, 2) if days_available > 0 else 0,
        },
        "forecast": {
            "available": forecast_available,
            "etaDate": eta_date,
            "daysToGoal": days_to_goal,
            "projectedMonthly": projected_monthly,
            "dailyVelocity": round(total_payout / max((datetime.now(timezone.utc) - datetime.fromisoformat(all_payouts[0]["date"].replace("Z", "+00:00"))).days, 1), 2) if all_payouts else 0,
        },
        "goal": {
            "target": goal,
            "current": total_payout,
            "progressPct": progress_pct,
            "motivation": motivation,
            "accountsNeeded": max(0, int((goal - total_payout) / 2000.0) + (1 if (goal - total_payout) % 2000 else 0)) if total_payout < goal else 0,
        },
        "achievements": achievements,
        "payoutCurve": payout_curve,
        "recentPayouts": list(reversed(all_payouts))[:10],
        "scalingRoadmap": [
            {"step": 1, "label": "1× 25K Eval", "done": len(accounts) >= 1},
            {"step": 2, "label": "1st Payout", "done": len(all_payouts) >= 1},
            {"step": 3, "label": "Add 50K", "done": len([a for a in accounts if a["accountType"] == "50K"]) >= 1},
            {"step": 4, "label": "2 Funded", "done": len(funded_accounts) >= 2},
            {"step": 5, "label": "3 Funded", "done": len(funded_accounts) >= 3},
            {"step": 6, "label": "5 Funded", "done": len(funded_accounts) >= 5},
            {"step": 7, "label": "$50K Goal", "done": total_payout >= goal},
        ],
        "canAddAccount": eligible_to_add,
    }

# ====================== Copy Trading ======================

@api_router.get("/copy-trading")
async def copy_trading():
    accounts = await db.accounts.find({"status": "funded_active"}, {"_id": 0}).to_list(100)
    master = next((a for a in accounts if a.get("isMaster")), accounts[0] if accounts else None)
    slaves = [a for a in accounts if not (master and a["id"] == master["id"])]
    return {
        "master": master,
        "slaves": slaves,
        "enabled": bool(master) and len(accounts) > 1,
    }

@api_router.put("/copy-trading/master/{account_id}")
async def set_master(account_id: str):
    await db.accounts.update_many({}, {"$set": {"isMaster": False}})
    res = await db.accounts.update_one({"id": account_id}, {"$set": {"isMaster": True, "copyEnabled": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Account not found")
    return await copy_trading()

# ====================== Root ======================

@api_router.get("/")
async def root():
    return {"message": "Freezy Prop Firm Command Center API", "version": "1.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    try:
        await bootstrap()
        # Auth indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        logger.info("Bootstrap complete")
    except Exception as e:
        logger.error(f"Bootstrap failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
