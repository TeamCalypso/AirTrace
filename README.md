# Airtrace: Satellite Smog Forecast

**48-hour, neighborhood-level (~3 km) PM2.5 / AQI forecasts for Delhi NCR**, built by fusing satellite aerosol data, weather forecasts and fire detections. Built on AWS.

> "Delhi will be severe" isn't enough. A cyclist in Dwarka and a parent in Noida need to know what *their* 8 AM looks like.

## What it does
- **48-h forecast map:** 3 km grid, hourly animation
- **Neighborhood view:** timeline with uncertainty, best and worst hours to be outside, plain-language summary
- **Source breakdown:** regional transport (stubble fires, stagnation) vs. local sources
- **Alerts:** subscribe by neighborhood ("Air turns hazardous after 4 PM tomorrow in your area")
- **Track record:** replay past episodes (e.g. Diwali week) and compare predicted vs. observed
- **Open API** for civic apps, schools and media

## Architecture (AWS)
| Layer | Services |
|---|---|
| Ingestion | AWS Lambda + Amazon EventBridge Scheduler → Amazon S3 |
| Training | Amazon SageMaker (LightGBM quantile models) |
| Inference | AWS Lambda / SageMaker Processing → S3 + Amazon DynamoDB |
| API | Amazon API Gateway + AWS Lambda (FastAPI) |
| Language layer | Amazon Bedrock (summaries, alert text, Knowledge Base) |
| Alerts | Amazon SNS |
| Frontend | React + MapLibre + deck.gl on AWS Amplify Hosting |
| CI / retraining | GitHub Actions |

## Data sources (all free)
CPCB ground stations (via OpenAQ) · ERA5 / Open-Meteo weather · CAMS aerosol forecasts · NASA FIRMS (MODIS/VIIRS) fire detections · Sentinel-5P NO₂ / Aerosol Index

## Repository layout
```
frontend/    React + Vite + MapLibre + deck.gl web app
backend/
  api/        FastAPI service (runs locally or on Lambda)
  functions/  Lambda handlers: ingest, inference, summaries, alerts
ml/
  airtrace_ml/     shared feature engineering + model code
  training/   training & evaluation scripts (local / SageMaker)
  notebooks/  exploration
infra/        AWS infrastructure as code (CDK)
knowledge/    health guidance sources for the knowledge base
data/         local data cache (not committed; canonical copy in S3)
scripts/      helper scripts (data download, local runs)
```

## Getting started
```bash
cp .env.example .env   # fill in keys
```
Setup instructions for each component live in its folder's README.

## Team
Team Calypso: Saket, Ritvik, Mahek. Built for the WeMakeDevs × AWS Environmental Hacks (Air track).
