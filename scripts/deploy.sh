#!/usr/bin/env bash
# Deploy the API stack. Run scripts/build_api.sh first.
set -euo pipefail
cd "$(dirname "$0")/.."

SAM="${SAM:-sam}"
REGION="${AWS_REGION:-us-east-1}"
CORS="${CORS_ORIGINS:-http://localhost:3000,http://localhost:5173}"

"$SAM" deploy \
  --template-file infra/template.yaml \
  --stack-name airtrace-api \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --tags Project=airtrace \
  --parameter-overrides "CorsOrigins=${CORS}" \
  --no-confirm-changeset --no-fail-on-empty-changeset
