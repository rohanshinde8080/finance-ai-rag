from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os
from pathlib import Path

# Resolve base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    """Central configuration for FinanceAI backend."""
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "FinanceAI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Database (PostgreSQL + pgvector)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/finance_ai_db"
    DB_MIN_CONNECTIONS: int = 2
    DB_MAX_CONNECTIONS: int = 10
    DB_TIMEOUT_SECONDS: int = 10

    # Security & JWT
    JWT_SECRET_KEY: str = "dev_secret_key_change_in_production_finance_ai_super_secret_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Initial Admin Seed Credentials
    INITIAL_ADMIN_EMAIL: str = "admin@financeai.com"
    INITIAL_ADMIN_PASSWORD: str = "AdminSecure#2026!"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    # AI & External APIs
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    TAVILY_API_KEY: str = ""

    # RAG Hyperparameters
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    SIMILARITY_THRESHOLD: float = 0.70
    TOP_K_CHUNKS: int = 4

    # Storage paths
    STORAGE_DIR: Path = BACKEND_DIR / "storage"
    DOCUMENTS_DIR: Path = BACKEND_DIR / "storage" / "documents"
    INDICES_DIR: Path = BACKEND_DIR / "storage" / "vector_indices"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return ["http://localhost:3000", "http://127.0.0.1:3000"]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

settings = Settings()

# Ensure storage directories exist
settings.DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
settings.INDICES_DIR.mkdir(parents=True, exist_ok=True)
