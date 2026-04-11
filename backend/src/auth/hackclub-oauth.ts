import {
	CLIENT_ID,
	CLIENT_SECRET,
	HCAUTH_URL,
	REDIRECT_URI,
	SCOPES,
} from '../config.js'
import type { HackClubMeResponse, OAuthTokenResponse } from './types.js'

async function requestToken(
	body: Record<string, string>,
	errorPrefix: 'Token exchange failed' | 'Token refresh failed'
): Promise<OAuthTokenResponse> {
	const response = await fetch(`${HCAUTH_URL}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!response.ok) {
		throw new Error(`${errorPrefix}: ${response.status}`)
	}
	return (await response.json()) as OAuthTokenResponse
}

export function createAuthorizationUrl(): string {
	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		response_type: 'code',
		scope: SCOPES,
	})
	return `${HCAUTH_URL}/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
	return requestToken({
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		redirect_uri: REDIRECT_URI,
		code,
		grant_type: 'authorization_code',
	}, 'Token exchange failed')
}

export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
	return requestToken({
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		refresh_token: refreshToken,
		grant_type: 'refresh_token',
	}, 'Token refresh failed')
}

export async function fetchCurrentUser(accessToken: string): Promise<HackClubMeResponse> {
	const response = await fetch(`${HCAUTH_URL}/api/v1/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch user: ${response.status}`)
	}

	return (await response.json()) as HackClubMeResponse
}
