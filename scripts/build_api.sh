#!/usr/bin/env bash
# Build the Lambda package for the API into build/api (Linux wheels, no Docker).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf build/api
mkdir -p build/api
python -m pip install -q -r backend/api/requirements.txt \
  --platform manylinux2014_x86_64 --python-version 3.12 --implementation cp \
  --only-binary=:all: --target build/api
cp -r backend/api/app build/api/app
find build/api -name __pycache__ -type d -prune -exec rm -rf {} +
echo "built build/api ($(du -sh build/api | cut -f1))"
