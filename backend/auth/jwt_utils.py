from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt


class JWTManager:
    def __init__(self, secret: str, algorithm: str, expiry_days: int) -> None:
        self.secret = secret
        self.algorithm = algorithm
        self.expiry_days = expiry_days

    def create_token(self, payload: Dict[str, Any]) -> str:
        now = datetime.now(timezone.utc)
        data = {
            **payload,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(days=self.expiry_days)).timestamp()),
        }
        return jwt.encode(data, self.secret, algorithm=self.algorithm)

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(token, self.secret, algorithms=[self.algorithm])
        except jwt.InvalidTokenError:
            return None
