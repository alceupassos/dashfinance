from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status

from . import services
from .schemas import (
    BLEIntentConfirm,
    BLEIntentRequest,
    BLETrustEntry,
    BLETrustRequest,
    BLETrustResponse,
    CaptchaResponse,
    CaptchaSolveRequest,
    CaptchaSolveResponse,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    VaultEntry,
    VaultEntryCreate,
)

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.post("/auth/ble/intent")
def create_ble_intent(payload: BLEIntentRequest):
    intent = services.create_ble_intent(payload.device_id, payload.action)
    return intent


@router.post("/auth/ble/confirm")
def confirm_ble(payload: BLEIntentConfirm):
    if not services.confirm_ble_intent(payload.intent_id, payload.signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid intent or signature")
    return {"status": "approved"}


@router.post("/auth/ble/trust", response_model=BLETrustResponse)
def register_ble_trust(payload: BLETrustRequest):
    entry = BLETrustEntry(
        owner_id=payload.owner_id,
        device_id=payload.device_id,
        alias=payload.alias,
        proximity_threshold=payload.proximity_threshold or 1.5,
    )
    entries = services.upsert_ble_trust(entry)
    return BLETrustResponse(entries=entries)


@router.get("/auth/ble/trust/{owner_id}", response_model=BLETrustResponse)
def list_ble_trust(owner_id: str):
    return BLETrustResponse(entries=services.list_ble_trust(owner_id))


@router.get("/vault/entries", response_model=List[VaultEntry])
def vault_entries():
    return services.list_vault_entries()


@router.post("/vault/entries", response_model=VaultEntry)
def create_vault_entry(payload: VaultEntryCreate):
    entry = VaultEntry(
        id=payload.label.lower().replace(" ", "-"),
        label=payload.label,
        type=payload.type,
        username=payload.username,
        secret_hint="encrypted",
        updated_at=datetime.utcnow(),
    )
    return services.add_vault_entry(entry)


@router.post("/risk/analyze", response_model=RiskAnalysisResponse)
def analyze_risk(payload: RiskAnalysisRequest):
    return services.analyze_risk(payload)


@router.post("/captcha/generate", response_model=CaptchaResponse)
def captcha_generate():
    # placeholder IA-friendly captcha
    return CaptchaResponse(
        captcha_id="demo",
        prompt="Arraste o slider até alinhar o padrão.",
        assets=[],
    )


@router.post("/captcha/solve", response_model=CaptchaSolveResponse)
def captcha_solve(payload: CaptchaSolveRequest):
    success = payload.answer.endswith("42")
    return CaptchaSolveResponse(success=success, next_challenge_in=0 if success else 10)
