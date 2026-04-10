import { API_BASE_URL } from './config'
import { htmlToElement } from './lib/dom'
import type { AuthMeResponse } from './types/auth'

export function buildSiteHeader(): HTMLElement {
	const header = htmlToElement<HTMLElement>(`
		<header class="j-site-header">
			<div class="j-site-header-inner">
				<a class="j-site-logo" href="/">Jigsaw</a>
				<nav class="j-site-nav" aria-label="Primary">
					<a class="j-site-nav-link" href="/">Home</a>
					<a class="j-site-nav-link" href="/arcade">Arcade</a>
					<a class="j-site-nav-link" href="/shop">Shop</a>
					<a class="j-site-nav-link" href="/docs/solve-crediting">Docs</a>
				</nav>
				<div class="j-site-auth"></div>
			</div>
		</header>
	`)

	const authSlot = header.querySelector<HTMLElement>('.j-site-auth')
	if (!authSlot) return header

	const setSignedOut = (): void => {
		authSlot.innerHTML = `<a class="j-site-signup" href="${API_BASE_URL}/auth/login">Sign up</a>`
		const signup = authSlot.querySelector<HTMLAnchorElement>('.j-site-signup')
		if (signup) {
			signup.addEventListener('click', (event) => {
				event.preventDefault()
				window.location.href = `${API_BASE_URL}/auth/login`
			})
		}
	}

	const setSignedIn = (name: string, pieces = 0): void => {
		authSlot.innerHTML = `
			<div class="j-site-user-wrap">
				<span class="j-site-piece-pill">🧩 ${pieces}</span>
				<span class="j-site-user">${name}</span>
				<button class="j-site-logout" type="button">Logout</button>
			</div>
		`

		const logoutButton = authSlot.querySelector<HTMLButtonElement>('.j-site-logout')
		if (!logoutButton) return

		logoutButton.addEventListener('click', async () => {
			logoutButton.disabled = true
			try {
				await fetch(`${API_BASE_URL}/auth/logout`, {
					method: 'POST',
					credentials: 'include',
				})
			} catch {
				// no-op: fallback to signed-out state
			}
			setSignedOut()
		})
	}

	const syncAuthState = async (): Promise<void> => {
		try {
			const response = await fetch(`${API_BASE_URL}/auth/me`, {
				credentials: 'include',
			})
			if (!response.ok) {
				setSignedOut()
				return
			}

			const payload = (await response.json()) as AuthMeResponse
			if (!payload.authenticated) {
				setSignedOut()
				return
			}

			const userName = payload.user?.name || payload.user?.email || 'Signed in'
			setSignedIn(userName, payload.user?.pieces || 0)
		} catch {
			setSignedOut()
		}
	}

	if (window.location.search.includes('auth=')) {
		const url = new URL(window.location.href)
		url.searchParams.delete('auth')
		history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
	}

	setSignedOut()
	void syncAuthState()

	return header
}
