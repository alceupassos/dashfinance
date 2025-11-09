from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class VaultType(str, Enum):
    credential = "credential"
    otp = "otp"
    streaming = "streaming"
    contract = "contract"


class VaultEntry(BaseModel):
    id: str
    label: str
    type: VaultType
    username: Optional[str] = None
    secret_hint: Optional[str] = None
    updated_at: datetime


class VaultEntryCreate(BaseModel):
    label: str
    type: VaultType
    username: Optional[str] = None
    payload: str  # encrypted client-side


class BLEIntent(BaseModel):
    intent_id: str
    challenge: str
    expires_at: datetime


class BLEIntentRequest(BaseModel):
    device_id: str
    action: str


class BLEIntentConfirm(BaseModel):
    intent_id: str
    device_id: str
    signature: str


class BLETrustEntry(BaseModel):
    owner_id: str
    device_id: str
    alias: Optional[str] = None
    proximity_threshold: float = 1.5  # meters


class BLETrustRequest(BaseModel):
    owner_id: str
    device_id: str
    alias: Optional[str] = None
    proximity_threshold: Optional[float] = None


class BLETrustResponse(BaseModel):
    entries: List[BLETrustEntry]


class RiskFactor(BaseModel):
    label: str
    score: float
    notes: Optional[str] = None


class RiskAnalysisRequest(BaseModel):
    contract_text: str
    jurisdiction: str = "BR"
    parties: List[str] = []


class RiskAnalysisResponse(BaseModel):
    overall_score: float
    factors: List[RiskFactor]
    recommendations: List[str]


class CaptchaResponse(BaseModel):
    captcha_id: str
    prompt: str
    assets: List[str] = Field(default_factory=list)


class CaptchaSolveRequest(BaseModel):
    captcha_id: str
    answer: str


class CaptchaSolveResponse(BaseModel):
    success: bool
    next_challenge_in: Optional[int] = None


class UserProfile(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    devices: List[str] = Field(default_factory=list)
