const PORT = Number(process.env.PORT || 8787)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const HCAUTH_URL = 'https://auth.hackclub.com'
const CLIENT_ID = process.env.HCAUTH_CLIENT_ID || ''
const CLIENT_SECRET = process.env.HCAUTH_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.HCAUTH_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`
const SCOPES = process.env.HCAUTH_SCOPES || 'openid profile email name slack_id verification_status'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'
const IS_PROD = process.env.NODE_ENV === 'production'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const REWARD_TICKET_TTL_MS = 5 * 60 * 1000
const REWARD_AMOUNT = 10
const GAME_ALLOWED_ORIGINS = (process.env.GAME_ALLOWED_ORIGINS || 'http://localhost:3000')
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean)
const ALLOWED_CORS_ORIGINS = new Set([FRONTEND_URL, ...GAME_ALLOWED_ORIGINS])
const CLAIM_TOKEN_SECRET = process.env.CLAIM_TOKEN_SECRET || SESSION_SECRET
const CLAIM_TOKEN_TTL_SECONDS = Math.max(30, Number(process.env.CLAIM_TOKEN_TTL_SECONDS || 180))

export {
	ALLOWED_CORS_ORIGINS,
	CLAIM_TOKEN_SECRET,
	CLAIM_TOKEN_TTL_SECONDS,
	CLIENT_ID,
	CLIENT_SECRET,
	FRONTEND_URL,
	GAME_ALLOWED_ORIGINS,
	HCAUTH_URL,
	IS_PROD,
	PORT,
	REDIRECT_URI,
	REWARD_AMOUNT,
	REWARD_TICKET_TTL_MS,
	SCOPES,
	SESSION_SECRET,
	SESSION_TTL_MS,
}
