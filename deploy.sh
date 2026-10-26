#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

set -a
source .env
set +a

npx vercel@latest deploy --prod --token="$VERCEL_TOKEN" --yes
