import { API_BASE_URL } from '../config'
import type { ApiErrorResponse } from '../types/auth'

export class ApiError extends Error {
	status: number
	payload: ApiErrorResponse

	constructor(message: string, status: number, payload: ApiErrorResponse = {}) {
		super(message)
		this.status = status
		this.payload = payload
	}
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`, init)
	const payload = (await response.json().catch(() => ({}))) as T & ApiErrorResponse
	if (!response.ok) {
		throw new ApiError(payload.message || payload.error || `Request failed (${response.status})`, response.status, payload)
	}
	return payload
}
