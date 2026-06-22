from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment / .env."""

    anthropic_api_key: str = ""
    contract_mint_model_reasoning: str = "claude-opus-4-8"
    contract_mint_model_drafting: str = "claude-sonnet-4-6"
    contract_mint_default_tenant: str = "demo-merchant"
    contract_mint_storage_dir: str = "./_storage"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def llm_enabled(self) -> bool:
        return bool(self.anthropic_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
