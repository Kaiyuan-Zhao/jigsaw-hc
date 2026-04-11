import type express from 'express'
import {
	CLIENT_ID,
	CLIENT_SECRET,
	FRONTEND_URL,
} from '../config.js'
import {
	createAuthorizationUrl,
	exchangeCodeForTokens,
	fetchCurrentUser,
	refreshAccessToken,
} from '../auth/hackclub-oauth.js'
import {
	SESSION_COOKIE,
	buildSessionCookieOptions,
	clearSessionCookieOptions,
	createSignedSessionCookieValue,
	getSessionFromRequest,
} from '../auth/session.js'
import { getUserPieceBalance } from '../piece-store.js'

export function registerAuthRoutes(app: express.Express): void {
	app.get('/auth/login', (req, res) => {
		if (!CLIENT_ID || !CLIENT_SECRET) {
			res.status(500).json({ error: 'OAuth is not configured on the backend' })
			return
		}

		res.redirect(createAuthorizationUrl())
	})

	app.get('/auth/callback', async (req, res) => {
		const code = req.query.code as string | undefined

		if (!code) {
			res.redirect(`${FRONTEND_URL}/?auth=error`)
			return
		}

		try {
			const tokens = await exchangeCodeForTokens(code)
			const me = await fetchCurrentUser(tokens.access_token)
			const identity = me.identity
			const fullName = [identity.first_name, identity.last_name].filter(Boolean).join(' ')
			const user = {
				id: identity.id,
				email: identity.primary_email,
				name: identity.display_name || identity.username || fullName || identity.primary_email,
				slackId: identity.slack_id,
				verificationStatus: identity.verification_status,
			}

			const signedSession = createSignedSessionCookieValue({
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresInSeconds: tokens.expires_in,
				user,
			})

			res.cookie(SESSION_COOKIE, signedSession, buildSessionCookieOptions())
			res.redirect(`${FRONTEND_URL}/?auth=success`)
		} catch (error) {
			console.error('[oauth] callback error', error)
			res.redirect(`${FRONTEND_URL}/?auth=error`)
		}
	})

	app.get('/auth/me', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			if (!sessionData) {
				res.json({ authenticated: false })
				return
			}

			let session = sessionData.session
			if (Date.now() > session.tokenExpiresAt && session.refreshToken) {
				try {
					const refreshed = await refreshAccessToken(session.refreshToken)
					session = {
						...session,
						accessToken: refreshed.access_token,
						refreshToken: refreshed.refresh_token || session.refreshToken,
						tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
					}
					res.cookie(
						SESSION_COOKIE,
						createSignedSessionCookieValue({
							accessToken: session.accessToken,
							refreshToken: session.refreshToken,
							expiresInSeconds: Math.max(30, Math.ceil((session.tokenExpiresAt - Date.now()) / 1000)),
							user: session.user,
						}),
						buildSessionCookieOptions()
					)
				} catch (error) {
					console.error('[oauth] refresh failed', error)
					res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions())
					res.json({ authenticated: false })
					return
				}
			}

			res.json({
				authenticated: true,
				user: {
					...session.user,
					pieces: await getUserPieceBalance(session.user.id),
				},
			})
		} catch (error) {
			console.error('[auth] failed to fetch current user', error)
			res.status(500).json({ authenticated: false })
		}
	})

	app.post('/auth/logout', (req, res) => {
		res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions())
		res.json({ success: true })
	})
}
