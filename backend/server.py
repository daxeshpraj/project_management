from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
import shutil

from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import pandas as pd
import io
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone, tzinfo, timedelta
from enum import Enum
from sqlmodel import SQLModel, Field, Session, create_engine, select, Relationship
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, extract, or_
from jose import JWTError, jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
DATABASE_URL = os.environ.get(
    'DATABASE_URL', 
    'postgresql+asyncpg://postgres:Daxesh%249173@localhost:5432/aemje_architect_db'
)
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Add missing columns to existing tables if they don't exist
        try:
            await conn.execute(text("ALTER TABLE vendor ADD COLUMN IF NOT EXISTS vendor_type_id VARCHAR"))
            await conn.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation_id VARCHAR"))
            await conn.execute(text("ALTER TABLE stafftransaction ADD COLUMN IF NOT EXISTS paid_by VARCHAR"))
            await conn.execute(text("ALTER TABLE loanrepayment ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'RETURNED'"))
            # Add person_name to loanrepayment
            await conn.execute(text("ALTER TABLE loanrepayment ADD COLUMN IF NOT EXISTS person_name VARCHAR"))
            
            # Multi-tenancy migration: Add company_id to all tables
            await conn.execute(text("ALTER TABLE company ADD COLUMN IF NOT EXISTS subdomain VARCHAR"))
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_company_subdomain ON company (subdomain)"))
            
            tables = [
                "vendortypemaster", "designationmaster", "permissionmapping", 
                "partnershare", "project", "vendor", "vendorpayment", "customerpayment", 
                "generalexpense", "looseexpense", "serviceexpense", "staff", 
                "stafftransaction", "personalloan", "loanrepayment", "loosepurchase", "\"user\""
            ]
            for table in tables:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS company_id VARCHAR REFERENCES company(id)"))

            # Backfill person_name for existing records
            await conn.execute(text("""
                UPDATE loanrepayment 
                SET person_name = (SELECT person_name FROM personalloan WHERE personalloan.id = loanrepayment.loan_id)
                WHERE person_name IS NULL
            """))
            await conn.execute(text("ALTER TABLE generalexpense ADD COLUMN IF NOT EXISTS added_by VARCHAR"))
            await conn.execute(text("ALTER TABLE stafftransaction ADD COLUMN IF NOT EXISTS ledger_type VARCHAR DEFAULT 'BANK'"))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS looseexpense (
                    id VARCHAR PRIMARY KEY,
                    project_id VARCHAR NOT NULL REFERENCES project(id),
                    vendor_name VARCHAR NOT NULL,
                    amount FLOAT NOT NULL,
                    date TIMESTAMP NOT NULL,
                    category VARCHAR NOT NULL,
                    description VARCHAR,
                    payment_mode VARCHAR NOT NULL,
                    added_by VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS serviceexpense (
                    id VARCHAR PRIMARY KEY,
                    service_name VARCHAR NOT NULL,
                    vendor_name VARCHAR,
                    amount FLOAT NOT NULL,
                    date TIMESTAMP NOT NULL,
                    category VARCHAR NOT NULL,
                    description VARCHAR,
                    payment_mode VARCHAR NOT NULL,
                    added_by VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS linked_staff_id VARCHAR"))
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS profile_image VARCHAR"))
            await conn.commit()
        except Exception as e:
            logging.error(f"Schema migration error: {e}")
    
    # Pre-populate masters if empty
    async with async_session() as session:
        # Vendor Types
        vt_res = await session.execute(select(VendorTypeMaster))
        if not vt_res.scalars().first():
            for vt in VendorType:
                session.add(VendorTypeMaster(name=vt.value))
        
        # Designations
        d_res = await session.execute(select(DesignationMaster))
        if not d_res.scalars().first():
            # Initial designations from staff table if any
            staff_res = await session.execute(select(Staff))
            staff_members = staff_res.scalars().all()
            designations = {s.designation for s in staff_members if s.designation}
            for d in designations:
                session.add(DesignationMaster(name=d))
            if not designations:
                session.add(DesignationMaster(name="Architect"))
                session.add(DesignationMaster(name="Draftsman"))
                session.add(DesignationMaster(name="Interior Designer"))
        
        await session.commit()

        # Migrate existing Vendors to use vendor_type_id
        vt_map = {vt.name: vt.id for vt in (await session.execute(select(VendorTypeMaster))).scalars().all()}
        vendors_res = await session.execute(select(Vendor).where(Vendor.vendor_type_id == None))
        for v in vendors_res.scalars().all():
            if v.vendor_type and v.vendor_type.value in vt_map:
                v.vendor_type_id = vt_map[v.vendor_type.value]
                session.add(v)
        
        # Migrate existing Staff to use designation_id
        d_map = {d.name: d.id for d in (await session.execute(select(DesignationMaster))).scalars().all()}
        staff_res = await session.execute(select(Staff).where(Staff.designation_id == None))
        for s in staff_res.scalars().all():
            if s.designation and s.designation in d_map:
                s.designation_id = d_map[s.designation]
                session.add(s)

        # Permissions
        p_res = await session.execute(select(PermissionMapping))
        if not p_res.scalars().first():
            # Defaults for ADMIN
            modules = ['dashboard', 'projects', 'vendors', 'staff', 'expenses', 'reports', 'user-management', 'role-management', 'master-settings']
            for m in modules:
                session.add(PermissionMapping(role='ADMIN', module_id=m, is_enabled=True))
            
            # Defaults for STAFF
            staff_modules = ['dashboard', 'projects', 'vendors', 'expenses']
            for m in staff_modules:
                session.add(PermissionMapping(role='STAFF', module_id=m, is_enabled=True))
            
            # Defaults for USER
            user_modules = ['dashboard', 'projects']
            for m in user_modules:
                session.add(PermissionMapping(role='USER', module_id=m, is_enabled=True))

        await session.commit()
    yield
    # Cleanup logic if needed

app = FastAPI(lifespan=lifespan)
API_PREFIX = os.environ.get("API_PREFIX", "/api")
api_router = APIRouter()

import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
    )

# CORS Middleware
cors_origins_str = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost,http://localhost:3001,http://localhost:80,http://localhost:8080,http://localhost:8089",
)
cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins + ["http://localhost:3001", "http://localhost:8089"],
    allow_origin_regex=r"http://.*\.lvh\.me:3001|http://.*\.localhost:3001",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "aemje-architect-secure-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")



# Static files (uploads)
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Enums
class Role(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    USER = "USER"
    OWNER = "OWNER" # Company Owner/Admin
class ProjectType(str, Enum):
    TURNKEY = "Turnkey Project"
    CONSULTATION = "Consultation-based Project"

class ProjectStatus(str, Enum):
    ACTIVE = "Active"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"

class VendorType(str, Enum):
    FURNITURE_CARPENTER = "Furniture Provider / Carpenter"
    CEILING_POP = "Ceiling Work (POP)"
    PLYWOOD = "Plywood Provider"
    ELECTRIC = "Electric Work Provider"
    DECOR_PAINTER = "Décor / Colour Painter"
    OTHER = "Other"

class PaymentMode(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    CREDIT_CARD = "CREDIT_CARD"
    UPI = "UPI"

class ExpenseCategory(str, Enum):
    OFFICE_SUPPLIES = "Office Supplies"
    SOFTWARE = "Software & Tools"
    MARKETING = "Marketing & Advertising"
    UTILITIES = "Utilities"
    CLIENT_MEETING = "Client Meetings"
    TRANSPORTATION = "Transportation"
    MISCELLANEOUS = "Miscellaneous"
    
class PlanType(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"

class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    TRIAL = "TRIAL"
    LOCKED = "LOCKED"

class StaffType(str, Enum):
    EMPLOYEE = "Employee"
    PARTNER = "Partner"

class StaffTransactionType(str, Enum):
    ADVANCE = "Advance"
    EXPENSE = "Expense"
    SALARY = "Salary"
    SETTLEMENT = "Settlement"
    PROFIT_SHARE = "Profit Share"

class LoanType(str, Enum):
    HELP = "HELP"

class LoanStatus(str, Enum):
    PAID = "PAID"
    RETURNED = "RETURNED"

class LoanTransactionType(str, Enum):
    GIVEN = "GIVEN"
    RETURNED = "RETURNED"

# SQL Models
class Company(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    subdomain: str = Field(unique=True, index=True) # e.g. "aemje" for aemje.platform.com
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    bank_details: Optional[str] = None # JSON string or text
    currency: str = Field(default="INR")
    date_format: str = Field(default="DD-MM-YYYY")
    plan_type: PlanType = Field(default=PlanType.FREE)
    subscription_status: SubscriptionStatus = Field(default=SubscriptionStatus.TRIAL)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class VendorTypeMaster(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class DesignationMaster(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class PermissionMapping(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    role: str = Field(index=True) # ADMIN, STAFF, USER
    module_id: str = Field(index=True) # e.g. 'dashboard', 'projects'
    is_enabled: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class PartnerShare(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    project_id: str = Field(foreign_key="project.id")
    staff_id: str
    share_percentage: float

class Project(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    name: str
    client_name: str
    project_type: ProjectType
    contract_amount: Optional[float] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    start_date: datetime
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    profit_distributed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class Vendor(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    name: str
    vendor_type_id: Optional[str] = Field(default=None, foreign_key="vendortypemaster.id")
    vendor_type: Optional[VendorType] = None # Deprecated, use vendor_type_id
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class VendorPayment(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    vendor_id: str = Field(foreign_key="vendor.id")
    project_id: str = Field(foreign_key="project.id")
    amount: float
    payment_date: datetime
    payment_mode: PaymentMode
    description: Optional[str] = None
    invoice_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class CustomerPayment(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    project_id: str = Field(foreign_key="project.id")
    amount: float
    payment_date: datetime
    payment_mode: PaymentMode
    description: Optional[str] = None
    receipt_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class GeneralExpense(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    title: str
    amount: float
    category: ExpenseCategory
    date: datetime
    description: Optional[str] = None
    payment_mode: PaymentMode
    added_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class LooseExpense(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    project_id: str = Field(foreign_key="project.id")
    vendor_name: str
    amount: float
    date: datetime
    category: str
    description: Optional[str] = None
    payment_mode: PaymentMode
    added_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class ServiceExpense(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    service_name: str
    vendor_name: Optional[str] = None
    amount: float
    date: datetime
    category: str
    description: Optional[str] = None
    payment_mode: PaymentMode
    added_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class Staff(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    name: str
    staff_type: StaffType
    designation_id: Optional[str] = Field(default=None, foreign_key="designationmaster.id")
    designation: Optional[str] = None # Deprecated, use designation_id
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    monthly_salary: Optional[float] = None
    join_date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class StaffTransaction(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    staff_id: str = Field(foreign_key="staff.id")
    transaction_type: StaffTransactionType
    amount: float
    transaction_date: datetime
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    description: Optional[str] = None
    is_advance: bool = False
    reference_number: Optional[str] = None
    paid_by: Optional[str] = None
    ledger_type: str = Field(default="BANK")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class PersonalLoan(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    person_name: str
    loan_type: LoanType
    amount: float
    given_date: datetime
    purpose: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    status: LoanStatus = LoanStatus.PAID
    expected_return_date: Optional[datetime] = None
    payment_mode: PaymentMode
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class LoanRepayment(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    loan_id: str = Field(foreign_key="personalloan.id")
    amount: float
    repayment_date: datetime
    payment_mode: PaymentMode
    type: LoanTransactionType = LoanTransactionType.RETURNED
    person_name: Optional[str] = None # Denormalized for easier DB review
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id", index=True)
    username: str = Field(index=True, unique=True)
    full_name: str
    hashed_password: str
    role: Role = Role.USER
    is_superadmin: bool = Field(default=False)
    linked_staff_id: Optional[str] = Field(default=None, foreign_key="staff.id")
    profile_image: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        company_id: str = payload.get("company_id")
        if username is None or company_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    statement = select(User).where(User.username == username, User.company_id == company_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_company(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    statement = select(Company).where(Company.id == current_user.company_id)
    result = await session.execute(statement)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

async def get_super_admin(current_user: User = Depends(get_current_user)):
    logger.info(f"SuperAdmin check for user: {current_user.username}, is_super: {current_user.is_superadmin}")
    if not current_user.is_superadmin:
        logger.warning(f"SuperAdmin access DENIED for user: {current_user.username}")
        raise HTTPException(status_code=403, detail="Super Admin access required")
    logger.info(f"SuperAdmin access GRANTED for user: {current_user.username}")
    return current_user

# Super Admin Endpoints (directly on api_router)
@api_router.get("/super/stats")
async def get_platform_stats(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_super_admin)
):
    from sqlalchemy import func
    try:
        # Count companies
        company_count_res = await session.execute(select(func.count()).select_from(Company))
        total_companies = company_count_res.scalar() or 0
        
        # Count users
        user_count_res = await session.execute(select(func.count()).select_from(User))
        total_users = user_count_res.scalar() or 0
        
        logger.info(f"Platform stats: {total_companies} companies, {total_users} users")
        
        return {
            "total_companies": total_companies,
            "total_users": total_users,
            "revenue_estimate": total_companies * 5000
        }
    except Exception as e:
        logger.error(f"Error fetching platform stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/super/companies")
async def get_all_companies(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_super_admin)
):
    try:
        result = await session.execute(select(Company).order_by(Company.created_at.desc()))
        companies = result.scalars().all()
        logger.info(f"Fetched {len(companies)} companies for super admin")
        return companies
    except Exception as e:
        logger.error(f"Error fetching companies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/super/companies/{company_id}")
async def update_company_subscription(
    company_id: str, 
    input: dict, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_super_admin)
):
    result = await session.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    for key, value in input.items():
        if hasattr(company, key):
            setattr(company, key, value)
            
    await session.commit()
    await session.refresh(company)
    return company

async def get_tenant_company(request: Request, session: AsyncSession = Depends(get_session)):
    """Identifies the tenant from the Host header (subdomain) or X-Tenant-Subdomain header"""
    subdomain = request.headers.get("X-Tenant-Subdomain")
    
    if not subdomain:
        host = request.headers.get("host", "")
        # Handle cases like company.platform.com or company.localhost:3000
        parts = host.split(".")
        if len(parts) > 2: # company.platform.com
            subdomain = parts[0]
        elif len(parts) == 2 and "localhost" in host: # company.localhost:3000
            subdomain = parts[0]
            
    if subdomain:
        result = await session.execute(select(Company).where(Company.subdomain == subdomain))
        return result.scalar_one_or_none()
    return None

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


# Pydantic models for API Input
from pydantic import BaseModel as PydanticBaseModel

class PartnerShareInput(PydanticBaseModel):
    staff_id: str
    share_percentage: float

class ProjectCreate(PydanticBaseModel):
    name: str
    client_name: str
    project_type: ProjectType
    contract_amount: Optional[float] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    start_date: datetime
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    partner_shares: List[PartnerShareInput] = []

class ProjectUpdate(PydanticBaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    project_type: Optional[ProjectType] = None
    contract_amount: Optional[float] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    partner_shares: Optional[List[PartnerShareInput]] = None

class LoginInput(PydanticBaseModel):
    username: str
    password: str

class UserCreate(PydanticBaseModel):
    username: str
    full_name: str
    password: str
    role: Role = Role.USER

class CompanySignup(PydanticBaseModel):
    company_name: str
    subdomain: str
    admin_username: str
    admin_full_name: str
    admin_password: str

# Helper to include partner shares in project response
# Helper to normalize datetimes for database
def normalize_dt(dt):
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            # Handle potential Z suffix or offset
            clean_dt = dt.replace('Z', '+00:00')
            dt = datetime.fromisoformat(clean_dt)
        except ValueError:
            return None
    
    # If it's a datetime object (or now is one)
    if isinstance(dt, datetime):
        if dt.tzinfo is not None:
            # Convert to UTC first, then make naive
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

# Auth Helpers
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Ensure company_id is in the token
    if "company_id" not in to_encode:
        # Fallback if not provided, though it should be
        pass
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_project_with_shares(project: Project, session: AsyncSession):
    statement = select(PartnerShare).where(PartnerShare.project_id == project.id)
    result = await session.execute(statement)
    shares = result.scalars().all()
    project_dict = project.model_dump()
    project_dict["partner_shares"] = [s.model_dump() for s in shares]
    return project_dict

# Project Routes
@api_router.post("/projects")
async def create_project(input: ProjectCreate, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    project_data = input.model_dump(exclude={"partner_shares"})
    
    # Ensure datetimes are naive UTC
    project_data["start_date"] = normalize_dt(project_data.get("start_date"))
    project_data["end_date"] = normalize_dt(project_data.get("end_date"))
            
    project_obj = Project(**project_data, company_id=current_user.company_id)
    session.add(project_obj)
    
    for share in input.partner_shares:
        share_obj = PartnerShare(
            project_id=project_obj.id,
            company_id=current_user.company_id,
            staff_id=share.staff_id,
            share_percentage=share.share_percentage
        )
        session.add(share_obj)
    
    await session.commit()
    await session.refresh(project_obj)
    return await get_project_with_shares(project_obj, session)

@api_router.get("/projects")
async def get_projects(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Project).where(Project.company_id == current_user.company_id).order_by(Project.created_at.desc())
    result = await session.execute(statement)
    projects = result.scalars().all()
    return [await get_project_with_shares(p, session) for p in projects]

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Project).where(Project.id == project_id, Project.company_id == current_user.company_id)
    result = await session.execute(statement)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await get_project_with_shares(project, session)

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, input: ProjectUpdate, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Project).where(Project.id == project_id)
    result = await session.execute(statement)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"partner_shares"})
    for key, value in update_data.items():
        if key in ["start_date", "end_date"]:
            value = normalize_dt(value)
        setattr(project, key, value)
    
    if input.partner_shares is not None:
        delete_stmt = select(PartnerShare).where(PartnerShare.project_id == project_id)
        existing_shares = await session.execute(delete_stmt)
        for s in existing_shares.scalars().all():
            await session.delete(s)
        for share in input.partner_shares:
            share_obj = PartnerShare(project_id=project_id, staff_id=share.staff_id, share_percentage=share.share_percentage)
            session.add(share_obj)
            
    await session.commit()
    await session.refresh(project)
    return await get_project_with_shares(project, session)

@api_router.post("/projects/bulk-delete")
async def bulk_delete_projects(input: dict, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    ids = input.get("ids", [])
    if not ids: return {"message": "No IDs"}
    for pid in ids:
        await session.execute(text(f"DELETE FROM partnershare WHERE project_id = '{pid}'"))
        await session.execute(text(f"DELETE FROM customerpayment WHERE project_id = '{pid}'"))
        await session.execute(text(f"DELETE FROM vendorpayment WHERE project_id = '{pid}'"))
        await session.execute(text(f"DELETE FROM generalexpense WHERE project_id = '{pid}'"))
        await session.execute(text(f"DELETE FROM stafftransaction WHERE project_id = '{pid}'"))
        await session.execute(text(f"DELETE FROM project WHERE id = '{pid}'"))
    await session.commit()
    return {"message": f"Deleted {len(ids)} projects"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Project).where(Project.id == project_id)
    result = await session.execute(statement)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Cascade Delete related records
    # 1. Partner Shares
    await session.execute(text(f"DELETE FROM partnershare WHERE project_id = '{project_id}'"))
    # 2. Payments
    await session.execute(text(f"DELETE FROM customerpayment WHERE project_id = '{project_id}'"))
    await session.execute(text(f"DELETE FROM vendorpayment WHERE project_id = '{project_id}'"))
    # 3. Expenses
    await session.execute(text(f"DELETE FROM generalexpense WHERE project_id = '{project_id}'"))
    # 4. Staff Transactions
    await session.execute(text(f"DELETE FROM stafftransaction WHERE project_id = '{project_id}'"))
    
    await session.delete(project)
    await session.commit()
    return {"message": "Project deleted successfully"}

# Vendor Routes
@api_router.post("/vendors")
async def create_vendor(input: Vendor, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/vendors")
async def get_vendors(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Vendor).where(Vendor.company_id == current_user.company_id)
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Vendor).where(Vendor.id == vendor_id)
    result = await session.execute(statement)
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, input: Vendor, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Vendor).where(Vendor.id == vendor_id)
    result = await session.execute(statement)
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        setattr(vendor, key, value)
    
    await session.commit()
    await session.refresh(vendor)
    return vendor

@api_router.post("/vendors/bulk-delete")
async def bulk_delete_vendors(input: dict, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    ids = input.get("ids", [])
    if not ids: return {"message": "No IDs"}
    await session.execute(text(f"DELETE FROM vendor WHERE id IN ({','.join([f"'{i}'" for i in ids])})"))
    await session.commit()
    return {"message": f"Deleted {len(ids)} vendors"}

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Vendor).where(Vendor.id == vendor_id)
    result = await session.execute(statement)
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await session.delete(vendor)
    await session.commit()
    return {"message": "Vendor deleted successfully"}

# Vendor Payments
@api_router.post("/vendor-payments")
async def create_vendor_payment(input: VendorPayment, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.payment_date = normalize_dt(input.payment_date)
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/vendor-payments")
async def get_vendor_payments(project_id: Optional[str] = None, vendor_id: Optional[str] = None, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(VendorPayment).where(VendorPayment.company_id == current_user.company_id).order_by(VendorPayment.payment_date.desc())
    if project_id: statement = statement.where(VendorPayment.project_id == project_id)
    if vendor_id: statement = statement.where(VendorPayment.vendor_id == vendor_id)
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.put("/vendor-payments/{payment_id}")
async def update_vendor_payment(payment_id: str, input: VendorPayment, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(VendorPayment).where(VendorPayment.id == payment_id)
    result = await session.execute(statement)
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "payment_date":
            value = normalize_dt(value)
        setattr(payment, key, value)
    
    await session.commit()
    await session.refresh(payment)
    return payment

@api_router.delete("/vendor-payments/{payment_id}")
async def delete_vendor_payment(payment_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(VendorPayment).where(VendorPayment.id == payment_id)
    result = await session.execute(statement)
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await session.delete(payment)
    await session.commit()
    return {"message": "Payment deleted successfully"}

# Customer Payments
@api_router.post("/customer-payments")
async def create_customer_payment(input: CustomerPayment, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.payment_date = normalize_dt(input.payment_date)
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/customer-payments")
async def get_customer_payments(project_id: Optional[str] = None, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(CustomerPayment).where(CustomerPayment.company_id == current_user.company_id).order_by(CustomerPayment.payment_date.desc())
    if project_id: statement = statement.where(CustomerPayment.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.put("/customer-payments/{payment_id}")
async def update_customer_payment(payment_id: str, input: CustomerPayment, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(CustomerPayment).where(CustomerPayment.id == payment_id)
    result = await session.execute(statement)
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "payment_date":
            value = normalize_dt(value)
        setattr(payment, key, value)
    
    await session.commit()
    await session.refresh(payment)
    return payment

@api_router.delete("/customer-payments/{payment_id}")
async def delete_customer_payment(payment_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(CustomerPayment).where(CustomerPayment.id == payment_id)
    result = await session.execute(statement)
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await session.delete(payment)
    await session.commit()
    return {"message": "Payment deleted successfully"}

# General Expenses
@api_router.post("/general-expenses")
async def create_general_expense(input: GeneralExpense, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.date = normalize_dt(input.date)
    if not input.added_by:
        input.added_by = current_user.full_name or current_user.username
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/general-expenses")
async def get_general_expenses(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(GeneralExpense).order_by(GeneralExpense.date.desc())
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.put("/general-expenses/{expense_id}")
async def update_general_expense(expense_id: str, input: GeneralExpense, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(GeneralExpense).where(GeneralExpense.id == expense_id)
    result = await session.execute(statement)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "date":
            value = normalize_dt(value)
        setattr(expense, key, value)
    
    await session.commit()
    await session.refresh(expense)
    return expense

@api_router.delete("/general-expenses/{expense_id}")
async def delete_general_expense(expense_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(GeneralExpense).where(GeneralExpense.id == expense_id)
    result = await session.execute(statement)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await session.delete(expense)
    await session.commit()
    return {"message": "Expense deleted successfully"}

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    file_extension = Path(file.filename).suffix
    new_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / new_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/uploads/{new_filename}", "filename": new_filename}

# Loose Expenses (Misc Project Expenses)
@api_router.post("/loose-expenses")
async def create_loose_expense(input: LooseExpense, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.date = normalize_dt(input.date)
    if not input.added_by:
        input.added_by = current_user.full_name or current_user.username
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/loose-expenses")
async def get_loose_expenses(project_id: Optional[str] = None, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(LooseExpense).order_by(LooseExpense.date.desc())
    if project_id:
        statement = statement.where(LooseExpense.project_id == project_id)
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.put("/loose-expenses/{expense_id}")
async def update_loose_expense(expense_id: str, input: LooseExpense, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(LooseExpense).where(LooseExpense.id == expense_id)
    result = await session.execute(statement)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "date":
            value = normalize_dt(value)
        setattr(expense, key, value)
    
    await session.commit()
    await session.refresh(expense)
    return expense

@api_router.delete("/loose-expenses/{expense_id}")
async def delete_loose_expense(expense_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(LooseExpense).where(LooseExpense.id == expense_id)
    result = await session.execute(statement)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await session.delete(expense)
    await session.commit()
    return {"message": "Expense deleted successfully"}

# Service Expenses
@api_router.post("/service-expenses")
async def create_service_expense(input: ServiceExpense, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.date = normalize_dt(input.date)
    input.company_id = current_user.company_id
    if not input.added_by:
        input.added_by = current_user.full_name or current_user.username
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/service-expenses")
async def get_service_expenses(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(ServiceExpense).where(ServiceExpense.company_id == current_user.company_id).order_by(ServiceExpense.date.desc())
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.put("/service-expenses/{expense_id}")
async def update_service_expense(expense_id: str, input: ServiceExpense, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(ServiceExpense).where(ServiceExpense.id == expense_id)
    result = await session.execute(statement)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "date":
            value = normalize_dt(value)
        setattr(expense, key, value)
    
    await session.commit()
    await session.refresh(expense)
    return expense

@api_router.delete("/service-expenses/{expense_id}")
async def delete_service_expense(expense_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(ServiceExpense).where(ServiceExpense.id == expense_id)
    result = await session.execute(statement)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await session.delete(expense)
    await session.commit()
    return {"message": "Expense deleted successfully"}

# Staff Routes
@api_router.post("/staff")
async def create_staff(input: Staff, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.join_date = normalize_dt(input.join_date)
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/staff")
async def get_staff_list(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Staff).where(Staff.company_id == current_user.company_id)
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.get("/staff/{staff_id}")
async def get_staff(staff_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Staff).where(Staff.id == staff_id, Staff.company_id == current_user.company_id)
    result = await session.execute(statement)
    staff = result.scalar_one_or_none()
    if not staff: raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@api_router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, input: Staff, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Staff).where(Staff.id == staff_id)
    result = await session.execute(statement)
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "join_date":
            value = normalize_dt(value)
        setattr(staff, key, value)
    
    await session.commit()
    await session.refresh(staff)
    return staff

@api_router.post("/staff/bulk-delete")
async def bulk_delete_staff(input: dict, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    ids = input.get("ids", [])
    if not ids: return {"message": "No IDs"}
    await session.execute(text(f"DELETE FROM stafftransaction WHERE staff_id IN ({','.join([f"'{i}'" for i in ids])})"))
    await session.execute(text(f"DELETE FROM staff WHERE id IN ({','.join([f"'{i}'" for i in ids])})"))
    await session.commit()
    return {"message": f"Deleted {len(ids)} staff"}

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Staff).where(Staff.id == staff_id)
    result = await session.execute(statement)
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Cascade Delete related records
    # 1. Partner Shares
    await session.execute(text(f"DELETE FROM partnershare WHERE staff_id = '{staff_id}'"))
    # 2. Transactions
    await session.execute(text(f"DELETE FROM stafftransaction WHERE staff_id = '{staff_id}'"))
    # 3. Loans linked to staff? (PersonalLoan doesn't have staff_id by default, it uses person_name string usually)
    # But if there are any other links, we clean them here.
    
    await session.delete(staff)
    await session.commit()
    return {"message": "Staff deleted successfully"}

# Staff Transactions
@api_router.post("/staff-transactions")
async def create_staff_transaction(input: StaffTransaction, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.transaction_date = normalize_dt(input.transaction_date)
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/staff-transactions")
async def get_staff_transactions(staff_id: Optional[str] = None, project_id: Optional[str] = None, ledger_type: Optional[str] = None, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(StaffTransaction).where(StaffTransaction.company_id == current_user.company_id).order_by(StaffTransaction.transaction_date.desc())
    if staff_id: statement = statement.where(StaffTransaction.staff_id == staff_id)
    if project_id: statement = statement.where(StaffTransaction.project_id == project_id)
    if ledger_type: statement = statement.where(StaffTransaction.ledger_type == ledger_type)
    result = await session.execute(statement)
    return result.scalars().all()

@api_router.put("/staff-transactions/{tx_id}")
async def update_staff_transaction(tx_id: str, input: StaffTransaction, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(StaffTransaction).where(StaffTransaction.id == tx_id)
    result = await session.execute(statement)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key == "transaction_date":
            value = normalize_dt(value)
        setattr(tx, key, value)
    
    await session.commit()
    await session.refresh(tx)
    return tx

@api_router.delete("/staff-transactions/{tx_id}")
async def delete_staff_transaction(tx_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(StaffTransaction).where(StaffTransaction.id == tx_id)
    result = await session.execute(statement)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await session.delete(tx)
    await session.commit()
    return {"message": "Transaction deleted successfully"}

@api_router.get("/staff/{staff_id}/ledger")
async def get_staff_ledger(staff_id: str, ledger_type: Optional[str] = None, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Get transactions for this staff (Focus on Advance/Expense/Settlement)
    stmt = select(StaffTransaction).where(StaffTransaction.staff_id == staff_id, StaffTransaction.company_id == current_user.company_id)
    if ledger_type:
        stmt = stmt.where(StaffTransaction.ledger_type == ledger_type)
    stmt = stmt.order_by(StaffTransaction.transaction_date)
    result = await session.execute(stmt)
    transactions = result.scalars().all()
    
    ledger = []
    balance = 0.0
    for tx in transactions:
        # Received (Advance) = Plus to balance (They have company money)
        # Spent/Returned (Expense/Settlement) = Minus from balance (They spent or returned it)
        received = 0.0
        spent = 0.0
        
        if tx.transaction_type == StaffTransactionType.ADVANCE:
            received = tx.amount
            balance += received
        elif tx.transaction_type in [StaffTransactionType.EXPENSE, StaffTransactionType.SETTLEMENT]:
            spent = tx.amount
            balance -= spent
        else:
            # Salary/Profit Share - optional for this ledger, but let's keep them as "Received" for completeness
            # unless user specifically wants them excluded. Let's keep them as Received.
            received = tx.amount
            balance += received
            
        ledger.append({
            **tx.model_dump(),
            "received": received,
            "spent": spent,
            "balance": balance
        })
    
    return {
        "staff_id": staff_id,
        "transactions": ledger[::-1],
        "current_balance": balance
    }

# Personal Loans
@api_router.post("/personal-loans")
async def create_loan(input: PersonalLoan, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    input.given_date = normalize_dt(input.given_date)
    input.expected_return_date = normalize_dt(input.expected_return_date)
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.get("/personal-loans")
async def get_loans(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(PersonalLoan).where(PersonalLoan.company_id == current_user.company_id).order_by(PersonalLoan.given_date.desc())
    result = await session.execute(statement)
    loans = result.scalars().all()
    
    # Enrich with repayment data
    enriched_loans = []
    for loan in loans:
        rep_stmt = select(LoanRepayment).where(LoanRepayment.loan_id == loan.id)
        rep_res = await session.execute(rep_stmt)
        repayments = rep_res.scalars().all()
        
        total_repaid = sum(float(r.amount or 0) for r in repayments if r.type == LoanTransactionType.RETURNED or str(r.type) == "RETURNED")
        extra_given = sum(float(r.amount or 0) for r in repayments if r.type == LoanTransactionType.GIVEN or str(r.type) == "GIVEN")
        total_given = float(loan.amount or 0) + extra_given
        
        loan_dict = loan.model_dump()
        loan_dict["total_given"] = total_given
        loan_dict["total_repaid"] = total_repaid
        loan_dict["outstanding"] = max(0, total_given - total_repaid)
        enriched_loans.append(loan_dict)
        
    return jsonable_encoder(enriched_loans)

@api_router.put("/personal-loans/{loan_id}")
async def update_loan(loan_id: str, input: PersonalLoan, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(PersonalLoan).where(PersonalLoan.id == loan_id)
    result = await session.execute(statement)
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        if key in ["given_date", "expected_return_date"]:
            value = normalize_dt(value)
        setattr(loan, key, value)
    
    await session.commit()
    await session.refresh(loan)
    return loan

@api_router.post("/personal-loans/bulk-delete")
async def bulk_delete_loans(input: dict, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    ids = input.get("ids", [])
    if not ids:
        return {"message": "No IDs provided"}
    
    # Delete repayments first
    await session.execute(text(f"DELETE FROM loanrepayment WHERE loan_id IN ({','.join([f"'{i}'" for i in ids])})"))
    
    # Delete loans
    await session.execute(text(f"DELETE FROM personalloan WHERE id IN ({','.join([f"'{i}'" for i in ids])})"))
    
    await session.commit()
    return {"message": f"Successfully deleted {len(ids)} records"}

@api_router.delete("/personal-loans/{loan_id}")
async def delete_loan(loan_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(PersonalLoan).where(PersonalLoan.id == loan_id)
    result = await session.execute(statement)
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Cascade delete repayments
    await session.execute(text(f"DELETE FROM loanrepayment WHERE loan_id = '{loan_id}'"))
    
    await session.delete(loan)
    await session.commit()
    return {"message": "Loan deleted successfully"}

@api_router.get("/personal-loans/analytics/summary")
async def get_loan_analytics(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    loans_stmt = select(PersonalLoan).where(PersonalLoan.company_id == current_user.company_id)
    loans_res = await session.execute(loans_stmt)
    loans = loans_res.scalars().all()
    
    total_initial_given = sum(float(l.amount or 0) for l in loans)
    
    # Repayments & Extra Given
    rep_stmt = select(LoanRepayment)
    rep_res = await session.execute(rep_stmt)
    repayments = rep_res.scalars().all()
    
    total_extra_given = sum(float(r.amount or 0) for r in repayments if r.type == LoanTransactionType.GIVEN or str(r.type) == "GIVEN")
    total_returned = sum(float(r.amount or 0) for r in repayments if r.type == LoanTransactionType.RETURNED or str(r.type) == "RETURNED")
    
    total_given = total_initial_given + total_extra_given
    
    return jsonable_encoder({
        "total_given": total_given,
        "total_returned": total_returned,
        "balance_due": max(0, total_given - total_returned),
        "entries_count": len(loans),
        "paid_entries": len([l for l in loans if l.status == LoanStatus.PAID])
    })

@api_router.get("/personal-loans/{loan_id}/details")
async def get_loan_details(loan_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(PersonalLoan).where(PersonalLoan.id == loan_id)
    result = await session.execute(statement)
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    rep_stmt = select(LoanRepayment).where(LoanRepayment.loan_id == loan_id).order_by(LoanRepayment.repayment_date.asc())
    rep_res = await session.execute(rep_stmt)
    repayments = rep_res.scalars().all()
    
    total_repaid = sum(float(r.amount or 0) for r in repayments if r.type == LoanTransactionType.RETURNED or str(r.type) == "RETURNED")
    extra_given = sum(float(r.amount or 0) for r in repayments if r.type == LoanTransactionType.GIVEN or str(r.type) == "GIVEN")
    total_given = float(loan.amount or 0) + extra_given
    outstanding = max(0, total_given - total_repaid)
    
    return jsonable_encoder({
        "loan": loan.model_dump(),
        "repayments": [r.model_dump() for r in repayments],
        "total_given": total_given,
        "total_repaid": total_repaid,
        "outstanding": outstanding
    })

@api_router.delete("/loan-repayments/{repayment_id}")
async def delete_loan_repayment(repayment_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(LoanRepayment).where(LoanRepayment.id == repayment_id)
    result = await session.execute(statement)
    repayment = result.scalar_one_or_none()
    if not repayment:
        raise HTTPException(status_code=404, detail="Repayment not found")
    
    await session.delete(repayment)
    await session.commit()
    return {"message": "Repayment deleted successfully"}

@api_router.post("/loan-repayments")
async def create_loan_repayment(input: LoanRepayment, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Auto-populate person_name from the associated loan
    loan_stmt = select(PersonalLoan).where(PersonalLoan.id == input.loan_id, PersonalLoan.company_id == current_user.company_id)
    loan_res = await session.execute(loan_stmt)
    loan = loan_res.scalar_one_or_none()
    if loan:
        input.person_name = loan.person_name
        
    input.repayment_date = normalize_dt(input.repayment_date)
    input.company_id = current_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

# Analytics: Project Profit Distribution

# Analytics: Project Profit Distribution
@api_router.get("/analytics/project/{project_id}")
async def get_project_analytics(project_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Project).where(Project.id == project_id, Project.company_id == current_user.company_id)
    result = await session.execute(statement)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Customer Payments
    cust_stmt = select(CustomerPayment).where(CustomerPayment.project_id == project_id)
    cust_res = await session.execute(cust_stmt)
    customer_payments = cust_res.scalars().all()
    total_received = sum(p.amount for p in customer_payments)
    
    # Vendor Payments
    vend_stmt = select(VendorPayment).where(VendorPayment.project_id == project_id)
    vend_res = await session.execute(vend_stmt)
    vendor_payments = vend_res.scalars().all()
    total_vendor_paid = sum(p.amount for p in vendor_payments)
    
    # Staff Expenses linked to project
    staff_stmt = select(StaffTransaction).where(StaffTransaction.project_id == project_id)
    staff_res = await session.execute(staff_stmt)
    staff_transactions = staff_res.scalars().all()
    total_staff_paid = sum(t.amount for t in staff_transactions)

    # Loose Expenses linked to project
    loose_stmt = select(LooseExpense).where(LooseExpense.project_id == project_id)
    loose_res = await session.execute(loose_stmt)
    loose_expenses = loose_res.scalars().all()
    total_loose_paid = sum(e.amount for e in loose_expenses)
    
    contract_amount = float(project.contract_amount or 0)
    total_spent = total_vendor_paid + total_staff_paid + total_loose_paid
    profit = total_received - total_spent
    
    return jsonable_encoder({
        "contract_amount": contract_amount,
        "total_received": total_received,
        "total_vendor_paid": total_vendor_paid,
        "total_staff_paid": total_staff_paid,
        "total_loose_paid": total_loose_paid,
        "loose_expenses": jsonable_encoder(loose_expenses),
        "outstanding_balance": max(0, contract_amount - total_received),
        "profit": profit
    })

@api_router.post("/projects/{project_id}/distribute-profit")
async def distribute_project_profit(project_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Project).where(Project.id == project_id)
    result = await session.execute(statement)
    project = result.scalar_one_or_none()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    if project.profit_distributed: raise HTTPException(status_code=400, detail="Profit already distributed")
    if project.status != ProjectStatus.COMPLETED: raise HTTPException(status_code=400, detail="Only completed projects can have profit distributed")
    cust_stmt = select(CustomerPayment).where(CustomerPayment.project_id == project_id)
    vend_stmt = select(VendorPayment).where(VendorPayment.project_id == project_id)
    cust_res = await session.execute(cust_stmt)
    vend_res = await session.execute(vend_stmt)
    total_received = sum(p.amount for p in cust_res.scalars().all())
    total_vendor = sum(p.amount for p in vend_res.scalars().all())
    profit = total_received - total_vendor
    if profit <= 0: raise HTTPException(status_code=400, detail=f"No profit to distribute. Profit: {profit}")
    share_stmt = select(PartnerShare).where(PartnerShare.project_id == project_id)
    share_res = await session.execute(share_stmt)
    partner_shares = share_res.scalars().all()
    distributed = []
    for share in partner_shares:
        share_amount = (profit * share.share_percentage) / 100
        tx = StaffTransaction(staff_id=share.staff_id, transaction_type=StaffTransactionType.PROFIT_SHARE, amount=share_amount, transaction_date=datetime.now(timezone.utc), project_id=project_id, description=f"Profit share ({share.share_percentage}%) from project: {project.name}")
        session.add(tx)
        distributed.append({"staff_id": share.staff_id, "percentage": share.share_percentage, "amount": share_amount})
    project.profit_distributed = True
    session.add(project)
    await session.commit()
    return {"message": "Profit distributed successfully", "project_profit": profit, "distributions": distributed}

@api_router.get("/projects/{project_id}/ledger")
async def get_project_ledger(project_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    try:
        # 1. Get Project Details
        project_stmt = select(Project).where(Project.id == project_id)
        project = (await session.execute(project_stmt)).scalar_one_or_none()
        if not project: raise HTTPException(status_code=404, detail="Project not found")
        
        # 2. Get Inflows (Customer Payments)
        cust_stmt = select(CustomerPayment).where(CustomerPayment.project_id == project_id).order_by(CustomerPayment.payment_date)
        customer_payments = (await session.execute(cust_stmt)).scalars().all()
        
        # 3. Get Outflows (Vendor Payments)
        vend_stmt = select(VendorPayment).where(VendorPayment.project_id == project_id).order_by(VendorPayment.payment_date)
        vendor_payments = (await session.execute(vend_stmt)).scalars().all()
        
        # 4. Get Outflows (Staff Expenses)
        staff_stmt = select(StaffTransaction).where(StaffTransaction.project_id == project_id).order_by(StaffTransaction.transaction_date)
        staff_transactions = (await session.execute(staff_stmt)).scalars().all()

        # 4b. Get Outflows (Loose Expenses)
        loose_stmt = select(LooseExpense).where(LooseExpense.project_id == project_id).order_by(LooseExpense.date)
        loose_expenses = (await session.execute(loose_stmt)).scalars().all()
        
        # Get Staff list for names
        staff_list = {str(s.id): s.name for s in (await session.execute(select(Staff))).scalars().all()}
        # Get Vendor list for names
        vendor_list = {str(v.id): v.name for v in (await session.execute(select(Vendor))).scalars().all()}

        # 5. Combine and Sort
        ledger = []
        
        for p in customer_payments:
            ledger.append({
                "id": str(p.id),
                "date": p.payment_date.isoformat() if p.payment_date else "",
                "type": "Inflow",
                "category": "Customer Payment",
                "particulars": f"From Client: {project.client_name}",
                "amount": float(p.amount or 0),
                "reference": p.receipt_number or (p.payment_mode.value if hasattr(p.payment_mode, 'value') else p.payment_mode),
                "source_type": "customer_payment"
            })
            
        for p in vendor_payments:
            ledger.append({
                "id": str(p.id),
                "date": p.payment_date.isoformat() if p.payment_date else "",
                "type": "Outflow",
                "category": "Vendor Payment",
                "particulars": f"To Vendor: {vendor_list.get(str(p.vendor_id), 'Unknown')}",
                "amount": float(p.amount or 0),
                "reference": p.invoice_number or (p.payment_mode.value if hasattr(p.payment_mode, 'value') else p.payment_mode),
                "source_type": "vendor_payment"
            })
            
        for t in staff_transactions:
            ledger.append({
                "id": str(t.id),
                "date": t.transaction_date.isoformat() if t.transaction_date else "",
                "type": "Outflow",
                "category": f"Staff {t.transaction_type.value if hasattr(t.transaction_type, 'value') else t.transaction_type}",
                "particulars": f"By Staff: {staff_list.get(str(t.staff_id), 'Unknown')}",
                "amount": float(t.amount or 0),
                "reference": t.reference_number or t.description,
                "source_type": "staff_transaction"
            })

        for e in loose_expenses:
            ledger.append({
                "id": str(e.id),
                "date": e.date.isoformat() if e.date else "",
                "type": "Outflow",
                "category": f"Loose: {e.category}",
                "particulars": f"To: {e.vendor_name}",
                "amount": float(e.amount or 0),
                "reference": e.payment_mode.value if hasattr(e.payment_mode, 'value') else e.payment_mode,
                "source_type": "loose_expense"
            })
            
        # Sort by date (handle None/Empty dates)
        ledger.sort(key=lambda x: x["date"] or "0000-00-00")
        
        # 6. Calculate Running Balance
        balance = 0.0
        for item in ledger:
            if item["type"] == "Inflow":
                balance += item["amount"]
            else:
                balance -= item["amount"]
            item["balance"] = balance
            
        return {
            "project": {
                "id": project.id,
                "name": project.name,
                "client_name": project.client_name,
                "contract_amount": float(project.contract_amount or 0)
            },
            "ledger": ledger[::-1], 
            "summary": {
                "total_inflow": float(sum(p.amount or 0 for p in customer_payments)),
                "total_outflow": float(sum(p.amount or 0 for p in vendor_payments) + sum(t.amount or 0 for t in staff_transactions) + sum(e.amount or 0 for e in loose_expenses)),
                "net_balance": float(balance)
            }
        }
    except Exception as e:
        import traceback
        error_msg = f"Error in get_project_ledger: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
async def import_from_excel(
    entity_type: str, 
    file: UploadFile = File(...), 
    session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")

    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    
    # Replace NaN with None for database compatibility
    df = df.where(pd.notnull(df), None)
    
    records_imported = 0
    errors = []

    if entity_type == "vendors":
        for _, row in df.iterrows():
            try:
                vendor = Vendor(
                    name=str(row.get("name", "")),
                    vendor_type=VendorType(row.get("vendor_type", VendorType.OTHER)),
                    contact_number=str(row.get("contact_number", "")) if row.get("contact_number") else None,
                    email=str(row.get("email", "")) if row.get("email") else None,
                    address=str(row.get("address", "")) if row.get("address") else None,
                )
                session.add(vendor)
                records_imported += 1
            except Exception as e:
                errors.append(f"Error importing row {_+2}: {str(e)}")

    elif entity_type == "expenses":
        for _, row in df.iterrows():
            try:
                expense = GeneralExpense(
                    title=str(row.get("title", "")),
                    amount=float(row.get("amount", 0)),
                    category=ExpenseCategory(row.get("category", ExpenseCategory.MISCELLANEOUS)),
                    date=normalize_dt(row.get("date", datetime.now())),
                    description=str(row.get("description", "")) if row.get("description") else None,
                    payment_mode=PaymentMode(row.get("payment_mode", PaymentMode.CASH)),
                )
                session.add(expense)
                records_imported += 1
            except Exception as e:
                errors.append(f"Error importing row {_+2}: {str(e)}")

    elif entity_type == "staff":
        for _, row in df.iterrows():
            try:
                staff = Staff(
                    name=str(row.get("name", "")),
                    staff_type=StaffType(row.get("staff_type", StaffType.EMPLOYEE)),
                    designation=str(row.get("designation", "")) if row.get("designation") else None,
                    contact_number=str(row.get("contact_number", "")) if row.get("contact_number") else None,
                    email=str(row.get("email", "")) if row.get("email") else None,
                    address=str(row.get("address", "")) if row.get("address") else None,
                    monthly_salary=float(row.get("monthly_salary", 0)) if row.get("monthly_salary") else None,
                    join_date=normalize_dt(row.get("join_date", datetime.now())),
                    is_active=True
                )
                session.add(staff)
                records_imported += 1
            except Exception as e:
                errors.append(f"Error importing row {_+2}: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported entity type")

    if records_imported > 0:
        await session.commit()
    
    return {
        "message": f"Successfully imported {records_imported} records.",
        "errors": errors
    }

# Analytics: Dashboard Summary
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(
    year: Optional[int] = None, 
    months: Optional[str] = None, 
    session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)
):
    # Aggregates for dashboard
    projects_res = await session.execute(select(Project).where(Project.company_id == current_user.company_id))
    projects = projects_res.scalars().all()
    
    cust_stmt = select(CustomerPayment).where(CustomerPayment.company_id == current_user.company_id)
    vend_stmt = select(VendorPayment).where(VendorPayment.company_id == current_user.company_id)
    exp_stmt = select(GeneralExpense).where(GeneralExpense.company_id == current_user.company_id)
    staff_exp_stmt = select(StaffTransaction).where(StaffTransaction.transaction_type == StaffTransactionType.EXPENSE, StaffTransaction.company_id == current_user.company_id)
    
    if year:
        cust_stmt = cust_stmt.where(extract('year', CustomerPayment.payment_date) == year)
        vend_stmt = vend_stmt.where(extract('year', VendorPayment.payment_date) == year)
        exp_stmt = exp_stmt.where(extract('year', GeneralExpense.date) == year)
        staff_exp_stmt = staff_exp_stmt.where(extract('year', StaffTransaction.transaction_date) == year)
    
    if months:
        month_list = [int(m) for m in months.split(',')]
        cust_stmt = cust_stmt.where(extract('month', CustomerPayment.payment_date).in_(month_list))
        vend_stmt = vend_stmt.where(extract('month', VendorPayment.payment_date).in_(month_list))
        exp_stmt = exp_stmt.where(extract('month', GeneralExpense.date).in_(month_list))
        staff_exp_stmt = staff_exp_stmt.where(extract('month', StaffTransaction.transaction_date).in_(month_list))

    cust_payments_res = await session.execute(cust_stmt)
    total_revenue = sum(p.amount for p in cust_payments_res.scalars().all())
    
    vend_payments_res = await session.execute(vend_stmt)
    total_vendor_payments = sum(p.amount for p in vend_payments_res.scalars().all())
    
    gen_expenses_res = await session.execute(exp_stmt)
    total_general_expenses = sum(p.amount for p in gen_expenses_res.scalars().all())

    staff_expenses_res = await session.execute(staff_exp_stmt)
    total_staff_expenses = sum(p.amount for p in staff_expenses_res.scalars().all())
    
    total_project_expenses = total_vendor_payments + total_staff_expenses
    total_profit = total_revenue - total_project_expenses - total_general_expenses
    
    active_projects = len([p for p in projects if p.status == ProjectStatus.ACTIVE])
    
    return {
        "total_revenue": total_revenue,
        "total_vendor_payments": total_project_expenses,
        "total_general_expenses": total_general_expenses,
        "total_profit": total_profit,
        "total_projects": len(projects),
        "active_projects": active_projects
    }

# Auth Routes
@api_router.post("/auth/login")
async def login(
    input: LoginInput, 
    session: AsyncSession = Depends(get_session),
    tenant: Optional[Company] = Depends(get_tenant_company)
):
    logger.info(f"Login attempt for user: {input.username}")
    statement = select(User).where(User.username == input.username)
    
    # If tenant identified via subdomain/header, filter by it (superadmins may log in on any tenant host)
    if tenant:
        statement = statement.where(
            or_(User.company_id == tenant.id, User.is_superadmin == True)
        )
        
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        logger.warning(f"Login failed: User {input.username} not found")
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if not verify_password(input.password, user.hashed_password):
        logger.warning(f"Login failed: Incorrect password for user {input.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    logger.info(f"Login successful for user: {input.username}, role: {user.role}")
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "company_id": user.company_id, "is_superadmin": user.is_superadmin})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "id": user.id,
            "username": user.username, 
            "full_name": user.full_name, 
            "role": user.role,
            "company_id": user.company_id,
            "is_superadmin": user.is_superadmin,
            "profile_image": user.profile_image,
            "linked_staff_id": user.linked_staff_id
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "company_id": current_user.company_id,
        "is_superadmin": current_user.is_superadmin,
        "profile_image": current_user.profile_image,
        "linked_staff_id": current_user.linked_staff_id
    }

# Company Profile & Lookup
@api_router.get("/company/lookup/{subdomain}")
async def lookup_company(subdomain: str, session: AsyncSession = Depends(get_session)):
    """Public endpoint to get company branding by subdomain"""
    result = await session.execute(select(Company).where(Company.subdomain == subdomain))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@api_router.get("/company/profile")
async def get_company_profile(company: Company = Depends(get_current_company)):
    return company

@api_router.put("/company/profile")
async def update_company_profile(
    input: Company, 
    session: AsyncSession = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    # Only Admin or Owner can update company profile
    if current_user.role not in [Role.ADMIN, Role.OWNER]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    statement = select(Company).where(Company.id == current_user.company_id)
    result = await session.execute(statement)
    db_company = result.scalar_one_or_none()
    
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = input.model_dump(exclude_unset=True, exclude={"id", "created_at"})
    for key, value in update_data.items():
        setattr(db_company, key, value)
    
    await session.commit()
    await session.refresh(db_company)
    return db_company


@app.post("/api/auth/signup")
async def signup(input: CompanySignup, session: AsyncSession = Depends(get_session)):
    """Registers a new company and its owner admin"""
    logger.info(f"Signup attempt for company: {input.company_name}, subdomain: {input.subdomain}")
    
    # 1. Check if subdomain exists
    result = await session.execute(select(Company).where(Company.subdomain == input.subdomain))
    if result.scalar_one_or_none():
        logger.warning(f"Signup failed: Subdomain {input.subdomain} already taken")
        raise HTTPException(status_code=400, detail="Subdomain already taken")
        
    # 2. Check if username exists
    result = await session.execute(select(User).where(User.username == input.admin_username))
    if result.scalar_one_or_none():
        logger.warning(f"Signup failed: Username {input.admin_username} already exists")
        raise HTTPException(status_code=400, detail="Username already exists")
        
    try:
        # 3. Create Company
        company = Company(
            name=input.company_name,
            subdomain=input.subdomain,
            currency="INR",
            date_format="DD-MM-YYYY"
        )
        session.add(company)
        await session.flush() # Get company ID
        logger.info(f"Created company with ID: {company.id}")
        
        # 4. Create Owner Admin
        user = User(
            username=input.admin_username,
            full_name=input.admin_full_name,
            hashed_password=get_password_hash(input.admin_password),
            role=Role.OWNER,
            company_id=company.id
        )
        session.add(user)
        logger.info(f"Created owner user: {user.username}")
        
        # 5. Initialize Permissions for OWNER role in this company
        modules = ['dashboard', 'projects', 'vendors', 'staff', 'expenses', 'reports', 'user-management', 'role-management', 'master-settings', 'company-settings']
        for m in modules:
            session.add(PermissionMapping(company_id=company.id, role='OWNER', module_id=m, is_enabled=True))
            # Also add for ADMIN just in case
            session.add(PermissionMapping(company_id=company.id, role='ADMIN', module_id=m, is_enabled=True))
        
        # 6. Initialize Defaults (Masters)
        default_vendor_types = [
            "Furniture / Carpenter", "Ceiling Work (POP)", "Plywood Provider", 
            "Electric Work", "Décor / Painter", "Glass Work", "Civil Work"
        ]
        for vt in default_vendor_types:
            session.add(VendorTypeMaster(name=vt, company_id=company.id))
            
        default_designations = ["Manager", "Designer", "Supervisor", "Accountant"]
        for d in default_designations:
            session.add(DesignationMaster(name=d, company_id=company.id))
            
        await session.commit()
        logger.info("Signup completed successfully")
        return {"message": "Signup successful", "subdomain": company.subdomain}
        
    except Exception as e:
        await session.rollback()
        logger.error(f"Signup CRITICAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")

@api_router.post("/auth/setup-admin")
async def setup_admin(input: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check if any users exist
    result = await session.execute(select(User))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Admin setup already completed")
    
    user_obj = User(
        username=input.username,
        full_name=input.full_name,
        hashed_password=get_password_hash(input.password),
        role=Role.ADMIN
    )
    session.add(user_obj)
    await session.commit()
    await session.refresh(user_obj)
    return {"message": "Admin user created successfully", "username": user_obj.username}

@api_router.get("/users")
async def get_users(session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    result = await session.execute(select(User).where(User.company_id == admin_user.company_id))
    users = result.scalars().all()
    # Return everything except hashed_password
    return [u.model_dump(exclude={"hashed_password"}) for u in users]

@api_router.post("/users")
async def create_user(input: UserCreate, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    # Check if username exists
    stmt = select(User).where(User.username == input.username)
    existing = await session.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
        
    user_obj = User(
        username=input.username,
        full_name=input.full_name,
        hashed_password=get_password_hash(input.password),
        role=input.role,
        company_id=admin_user.company_id
    )
    session.add(user_obj)
    await session.commit()
    await session.refresh(user_obj)
    return user_obj.model_dump(exclude={"hashed_password"})

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, input: UserCreate, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.username = input.username
    user.full_name = input.full_name
    user.role = input.role
    
    # Only update password if provided and not dummy/empty
    if input.password and input.password != "********":
        user.hashed_password = get_password_hash(input.password)
        
    await session.commit()
    await session.refresh(user)
    return user.model_dump(exclude={"hashed_password"})

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await session.delete(user)
    await session.commit()
    return {"message": "User deleted successfully"}

# Master Management Routes
@api_router.get("/masters/vendor-types")
async def get_vendor_types(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    result = await session.execute(select(VendorTypeMaster).where(VendorTypeMaster.company_id == current_user.company_id).order_by(VendorTypeMaster.name))
    return result.scalars().all()

@api_router.post("/masters/vendor-types")
async def create_vendor_type(input: VendorTypeMaster, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    input.company_id = admin_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.delete("/masters/vendor-types/{vt_id}")
async def delete_vendor_type(vt_id: str, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    vt = await session.get(VendorTypeMaster, vt_id)
    if not vt: raise HTTPException(status_code=404, detail="Vendor type not found")
    await session.delete(vt)
    await session.commit()
    return {"message": "Vendor type deleted"}

@api_router.get("/masters/designations")
async def get_designations(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    result = await session.execute(select(DesignationMaster).where(DesignationMaster.company_id == current_user.company_id).order_by(DesignationMaster.name))
    return result.scalars().all()

@api_router.post("/masters/designations")
async def create_designation(input: DesignationMaster, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    input.company_id = admin_user.company_id
    session.add(input)
    await session.commit()
    await session.refresh(input)
    return input

@api_router.delete("/masters/designations/{d_id}")
async def delete_designation(d_id: str, session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    await session.commit()
    return {"message": "Designation deleted"}

# Permission Management Routes
@api_router.get("/permissions")
async def get_permissions(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    result = await session.execute(select(PermissionMapping).where(PermissionMapping.company_id == current_user.company_id))
    return result.scalars().all()

@api_router.post("/permissions/sync")
async def sync_permissions(permissions: List[dict], session: AsyncSession = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    # Simple strategy: clear and re-insert for the current company
    await session.execute(text(f"DELETE FROM permissionmapping WHERE company_id = '{admin_user.company_id}'"))
    for p in permissions:
        mapping = PermissionMapping(
            role=p['role'],
            module_id=p['module_id'],
            is_enabled=p['is_enabled'],
            company_id=admin_user.company_id
        )
        session.add(mapping)
    await session.commit()
    return {"message": "Permissions synced successfully"}

@api_router.get("/ping")
async def ping():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "Project Management API (SQL Version)"}

@api_router.post("/admin/restart")
async def restart_server():
    # Force process exit. IIS will restart it automatically.
    import os
    os._exit(0)

app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

