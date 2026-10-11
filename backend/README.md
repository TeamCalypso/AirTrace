# Backend

- `api/`: FastAPI service. Runs locally with uvicorn and on AWS Lambda (via Mangum) behind API Gateway.
- `functions/`: scheduled Lambda handlers
  - `ingest/`: pull station, weather, CAMS and fire data into S3
  - `inference/`: build features, run the model, write forecast payloads
  - `summaries/`: generate plain-language summaries with Amazon Bedrock
  - `alerts/`: match forecasts to subscriptions and send via Amazon SNS
- `tests/`: pytest suite

## API

Served under both `/api/*` (paths the web app calls) and `/v1/*` (public alias).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | liveness |
| GET | `/api/search?q=` | neighborhood suggestions (empty `q` returns quick picks) |
| GET | `/api/forecast?id=` or `?name=` | 48-hour forecast for one neighborhood |
| POST | `/api/alerts` | `{email, neighborhoodId, neighborhoodName?, threshold}`; idempotent |

## Run locally

```bash
cd backend/api
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt   # Linux/macOS: .venv/bin/pip
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
.venv/Scripts/python -m pytest ../tests -q
```

## Configuration (environment)

| Variable | Default | Purpose |
|---|---|---|
| `FORECAST_SOURCE` | `mock` | `mock` serves the deterministic demo scenario |
| `SUBSCRIPTIONS_TABLE` | empty | DynamoDB table name; empty uses an in-memory store |
| `AWS_REGION` | `us-east-1` | |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | comma separated |

## Deploy (AWS Lambda + API Gateway)

```bash
scripts/build_api.sh      # builds build/api (Linux wheels, no Docker needed)
scripts/deploy.sh         # sam deploy of infra/template.yaml
```
Handler: `app.main.handler`.
