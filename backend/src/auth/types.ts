export type HackClubMeResponse = {
	identity: {
		id: string
		username?: string
		display_name?: string
		first_name?: string
		last_name?: string
		primary_email?: string
		slack_id?: string
		verification_status?: string
	}
	scopes?: string[]
}

export type OAuthTokenResponse = {
	access_token: string
	token_type: string
	expires_in: number
	refresh_token?: string
	scope?: string
}

export type SessionUser = {
	id: string
	email?: string
	name?: string
	slackId?: string
	verificationStatus?: string
}

export type SessionRecord = {
	createdAt: number
	expiresAt: number
	accessToken: string
	refreshToken?: string
	tokenExpiresAt: number
	user: SessionUser
}
