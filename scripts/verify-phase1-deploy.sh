#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
	echo "Usage: $0 <frontend_base_url> <backend_base_url>"
	echo "Example: $0 https://www.example.com https://api.example.com"
	exit 1
fi

FRONTEND_BASE_URL="${1%/}"
BACKEND_BASE_URL="${2%/}"

check_status_200() {
	local url="$1"
	local label="$2"
	local code
	code="$(curl -sS -o /dev/null -w "%{http_code}" "$url")"
	if [ "$code" != "200" ]; then
		echo "FAIL: $label ($url) returned HTTP $code"
		exit 1
	fi
	echo "PASS: $label ($url)"
}

echo "Running Phase 1 deployment checks..."
check_status_200 "$BACKEND_BASE_URL/health" "backend health endpoint"
check_status_200 "$FRONTEND_BASE_URL/" "frontend home route"
check_status_200 "$FRONTEND_BASE_URL/arcade" "frontend arcade route"
check_status_200 "$FRONTEND_BASE_URL/shop" "frontend shop route"
check_status_200 "$FRONTEND_BASE_URL/docs/solve-crediting" "frontend docs route"

echo "All route and health checks passed."
echo "Manual follow-up checks still required:"
echo "- Confirm OAuth login flow works end-to-end"
echo "- Confirm authenticated /auth/me returns authenticated: true"
echo "- Confirm browser shows no CORS errors"
