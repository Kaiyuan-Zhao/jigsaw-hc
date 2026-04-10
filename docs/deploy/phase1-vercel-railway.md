# Phase 1 Deployment: Vercel Frontend + Railway Backend

This runbook deploys the frontend on Vercel and keeps the backend on Railway.

## Production Defaults

- Frontend domain: `www.<your-domain>` (or apex `<your-domain>`)
- Backend domain: `api.<your-domain>`
- Backend host: Railway

## What You Need To Provide

- DNS access for your domain provider
- Hack Club OAuth app access (to update callback URL)
- Production secrets:
  - `HCAUTH_CLIENT_ID`
  - `HCAUTH_CLIENT_SECRET`
  - `SESSION_SECRET`
  - `CLAIM_TOKEN_SECRET`

Generate secrets with:

```bash
openssl rand -hex 32
```

## Environment Variable Matrix

### Frontend (Vercel project rooted at `frontend/`)

- `VITE_API_URL=https://api.<your-domain>`

### Backend (Railway service rooted at `backend/`)

- `NODE_ENV=production`
- `PORT=8787` (or Railway-assigned; app reads `PORT`)
- `FRONTEND_URL=https://www.<your-domain>` (or apex domain)
- `GAME_ALLOWED_ORIGINS=https://www.<your-domain>,https://<your-domain>`
- `PIECE_DB_PATH=/data/pieces.sqlite`
- `HCAUTH_CLIENT_ID=<from_hack_club_auth>`
- `HCAUTH_CLIENT_SECRET=<from_hack_club_auth>`
- `HCAUTH_REDIRECT_URI=https://api.<your-domain>/auth/callback`
- `HCAUTH_SCOPES=openid profile email name slack_id verification_status`
- `SESSION_SECRET=<random_64_hex_chars>`
- `CLAIM_TOKEN_SECRET=<random_64_hex_chars>`
- `CLAIM_TOKEN_TTL_SECONDS=180`

## Deploy Steps

## 1) Deploy backend to Railway

1. Create new Railway project and service from this repo.
2. Set service root to `backend/`.
3. Build/start:
   - Install: `npm ci`
   - Start: `npm run start`
4. Set all backend environment variables from the matrix above.
5. Attach persistent volume at `/data` so `PIECE_DB_PATH=/data/pieces.sqlite` survives restarts.
6. Deploy and verify:
   - `GET https://<railway-url>/health` returns `{ "ok": true }`.

## 2) Deploy frontend to Vercel

1. Import project into Vercel.
2. Set root directory to `frontend/`.
3. Confirm build settings:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Set `VITE_API_URL=https://api.<your-domain>`.
5. Deploy.

`frontend/vercel.json` already rewrites route-like paths to `index.html`, so deep links for `/arcade`, `/shop`, and `/docs/<slug>` work.

## 3) Domain + DNS Cutover

1. In Vercel, add:
   - `www.<your-domain>` (or apex) to frontend project
2. In Railway, add:
   - `api.<your-domain>` to backend service
3. Add DNS records requested by Vercel and Railway.
4. Wait for SSL provisioning on both hosts.

## 4) OAuth Update

In Hack Club OAuth app settings:

- Set callback URL to `https://api.<your-domain>/auth/callback`

Keep backend values in sync:

- `HCAUTH_CLIENT_ID`
- `HCAUTH_CLIENT_SECRET`
- `HCAUTH_REDIRECT_URI`

## 5) Post-Deploy Verification Checklist

- `GET https://api.<your-domain>/health` returns `ok: true`
- Visiting `https://www.<your-domain>/` loads the app
- Route refreshes work:
  - `/arcade`
  - `/shop`
  - `/docs/solve-crediting`
- Login flow succeeds end-to-end and returns to frontend
- Browser network shows no CORS failures for API calls
- Session persists after login and `GET /auth/me` shows authenticated user
