import os


class Settings:
    """Runtime configuration, read from the environment at import time."""

    # "mock" serves the deterministic demo scenario; "s3" serves model output.
    forecast_source: str = os.getenv("FORECAST_SOURCE", "mock")
    bucket: str = os.getenv("AIRTRACE_BUCKET", "")
    forecast_prefix: str = os.getenv("FORECAST_PREFIX", "forecasts/latest/")

    # Empty table name -> in-memory alert store (local dev and tests).
    subscriptions_table: str = os.getenv("SUBSCRIPTIONS_TABLE", "")
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")

    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
        ).split(",")
        if o.strip()
    ]


settings = Settings()
