from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = Field("AuthSet API", alias="APP_NAME")
    app_version: str = "0.1.0"
    bleed_secret: str = Field("dev-ble-secret", alias="BLE_SECRET")
    vault_key: str = Field("change-me", alias="VAULT_KEY")
    risk_model: str = Field("heuristic", alias="RISK_MODEL")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
