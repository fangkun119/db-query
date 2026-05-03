from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_api_endpoint: str = "https://api.openai.com/v1"
    default_limit: int = 1000
    db_query_db_path: str = "~/.db_query/db_query.db"
    openai_model: str = "gpt-4o"
    cors_origins: str = "*"

    class Config:
        env_file = Path.home() / "db_query.env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
