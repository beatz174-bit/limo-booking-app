#!/usr/bin/env bash
set -euo pipefail

npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g typescript-axios \
  -o frontend/src/api-client \
  --skip-validate-spec
