export type AuthUser = {
	id: string
	name?: string
	email?: string
	pieces?: number
}

export type AuthMeResponse = {
	authenticated: boolean
	user?: AuthUser
}

export type ApiErrorResponse = {
	error?: string
	message?: string
	pieces?: number
}
