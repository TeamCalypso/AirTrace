# Backend

- `api/`: FastAPI service exposing `/v1/*` endpoints. Runs locally with uvicorn and on AWS Lambda behind API Gateway.
- `functions/`: scheduled Lambda handlers
  - `ingest/`: pull station, weather, CAMS and fire data into S3
  - `inference/`: build features, run the model, write forecast payloads
  - `summaries/`: generate plain-language summaries with Amazon Bedrock
  - `alerts/`: match forecasts to subscriptions and send via Amazon SNS
