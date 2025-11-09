import secrets
from datetime import datetime, timedelta
from typing import Dict, List

from .schemas import (
    BLEIntent,
    BLETrustEntry,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    RiskFactor,
    VaultEntry,
)

# In-memory stores (v0.1 placeholder)
_vault: Dict[str, VaultEntry] = {}
_ble_intents: Dict[str, BLEIntent] = {}
_ble_trust: Dict[str, List[BLETrustEntry]] = {}


def create_ble_intent(device_id: str, action: str) -> BLEIntent:
    intent_id = secrets.token_hex(8)
    challenge = secrets.token_urlsafe(16)
    expires_at = datetime.utcnow() + timedelta(minutes=2)
    intent = BLEIntent(intent_id=intent_id, challenge=challenge, expires_at=expires_at)
    _ble_intents[intent_id] = intent
    return intent


def confirm_ble_intent(intent_id: str, signature: str) -> bool:
    intent = _ble_intents.get(intent_id)
    if not intent or intent.expires_at < datetime.utcnow():
        return False
    # Placeholder signature validation
    return signature.endswith(intent.challenge[:4])


def upsert_ble_trust(entry: BLETrustEntry) -> List[BLETrustEntry]:
    circle = _ble_trust.setdefault(entry.owner_id, [])
    circle = [e for e in circle if e.device_id != entry.device_id]
    circle.append(entry)
    _ble_trust[entry.owner_id] = circle
    return circle


def list_ble_trust(owner_id: str) -> List[BLETrustEntry]:
    return _ble_trust.get(owner_id, [])


def list_vault_entries() -> List[VaultEntry]:
    return list(_vault.values())


def add_vault_entry(entry: VaultEntry) -> VaultEntry:
    _vault[entry.id] = entry
    return entry


def analyze_risk(payload: RiskAnalysisRequest) -> RiskAnalysisResponse:
    factors = [
        RiskFactor(label="LGPD", score=0.32, notes="Cláusulas de consentimento ok."),
        RiskFactor(label="Trabalhista", score=0.58, notes="Verificar regime PJ x CLT."),
        RiskFactor(label="Inadimplência", score=0.41, notes="Histórico positivo, porém sem garantia."),
    ]
    avg = sum(f.score for f in factors) / len(factors)
    return RiskAnalysisResponse(
        overall_score=avg,
        factors=factors,
        recommendations=["Adicionar cláusula de multa", "Detalhar política de dados pessoais"]
    )
