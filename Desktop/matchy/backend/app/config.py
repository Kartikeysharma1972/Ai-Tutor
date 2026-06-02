from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "Matchy"
    env: str = "development"
    debug: bool = True

    # Security
    secret_key: str = "change-this-to-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Database
    database_url: str = "sqlite:///./matchy.db"

    # Commission (percent taken from each party on a closed engagement)
    commission_rate_client: float = 8.0
    commission_rate_developer: float = 5.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
