from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .config import settings
from .routers.api import router

app = FastAPI(title="Airtrace Smog Forecast API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# `/api/*` matches the paths the web app already calls; `/v1/*` is the
# public, versioned alias for third-party consumers.
app.include_router(router, prefix="/api")
app.include_router(router, prefix="/v1")

# AWS Lambda entry point (API Gateway HTTP API, payload v2).
handler = Mangum(app, lifespan="off")
