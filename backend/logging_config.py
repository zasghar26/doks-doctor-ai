import logging
import re


REDACT_PATTERNS = [
    re.compile(r"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9._\-]+"),
    re.compile(r"(?i)(token\s*[=:]\s*)[A-Za-z0-9._\-]+"),
    re.compile(r"(?i)(password\s*[=:]\s*)[^\s]+"),
]


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = str(record.getMessage())
        for pattern in REDACT_PATTERNS:
            message = pattern.sub(r"\1[REDACTED]", message)
        record.msg = message
        record.args = ()
        return True



def configure_logging(level: str) -> None:
    logger = logging.getLogger()
    logger.setLevel(level.upper())

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.addFilter(SensitiveDataFilter())
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)


class RequestLoggerAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        extra = kwargs.setdefault("extra", {})
        if "request_id" not in extra:
            extra["request_id"] = self.extra.get("request_id", "-")
        return msg, kwargs
