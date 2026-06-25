import os
from dataclasses import dataclass
from typing import List


def _get_required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _split_csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    do_oauth_client_id: str
    do_oauth_client_secret: str
    do_oauth_redirect_uri: str
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_expiry_days: int
    model_access_key: str
    ai_base_url: str
    ai_model: str
    cors_origins: List[str]
    log_level: str
    environment: str
    cookie_secure: bool
    frontend_url: str



def load_settings() -> Settings:
    environment = os.getenv("ENVIRONMENT", "development").lower()
    cors_origins = _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:3000"))

    return Settings(
        do_oauth_client_id=_get_required("DO_OAUTH_CLIENT_ID"),
        do_oauth_client_secret=_get_required("DO_OAUTH_CLIENT_SECRET"),
        do_oauth_redirect_uri=_get_required("DO_OAUTH_REDIRECT_URI"),
        jwt_secret_key=_get_required("JWT_SECRET_KEY"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwt_expiry_days=int(os.getenv("JWT_EXPIRY_DAYS", "7")),
        model_access_key=_get_required("MODEL_ACCESS_KEY"),
        ai_base_url=os.getenv("AI_BASE_URL", "https://inference.do-ai.run/v1"),
        ai_model=os.getenv("AI_MODEL", "router:my-router"),
        cors_origins=cors_origins,
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        environment=environment,
        cookie_secure=environment == "production",
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
    )
