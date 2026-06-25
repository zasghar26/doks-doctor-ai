import re
from typing import Any


SENSITIVE_PATTERNS = [
    r"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9._\-]+",
    r"(?i)(api[_-]?key\s*[:=]\s*)[A-Za-z0-9._\-]+",
    r"(?i)(token\s*[:=]\s*)[A-Za-z0-9._\-]+",
    r"(?i)(password\s*[:=]\s*)[^\s]+",
    r"(?i)(DATABASE_URL\s*[:=]\s*)[^\s]+",
    r"-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----",
]

SENSITIVE_KEYS = {
    "secret",
    "secrets",
    "token",
    "password",
    "authorization",
    "api_key",
    "apikey",
    "private_key",
    "client_secret",
}



def redact_text(text: str) -> str:
    redacted = text
    for pattern in SENSITIVE_PATTERNS:
        redacted = re.sub(pattern, r"\1[REDACTED]", redacted, flags=re.DOTALL)
    return redacted



def redact_object(obj: Any) -> Any:
    if isinstance(obj, dict):
        clean = {}
        for key, value in obj.items():
            if key.lower() in SENSITIVE_KEYS:
                clean[key] = "[REDACTED]"
            else:
                clean[key] = redact_object(value)
        return clean

    if isinstance(obj, list):
        return [redact_object(item) for item in obj]

    if isinstance(obj, str):
        return redact_text(obj)

    return obj
