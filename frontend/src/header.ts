import { API_BASE_URL } from './config'

type AuthMeResponse = {
	authenticated: boolean
	user?: {
		id: string
		name?: string
		email?: string
		coins?: number
		isAdmin?: boolean
	}
}

function el<T extends HTMLElement = HTMLElement>(html: string): T {
	const d = document.createElement('div')
	d.innerHTML = html.trim()
	return d.firstElementChild as T
}

export function buildSiteHeader(): HTMLElement {
	const header = el<HTMLElement>(`
		<header class="j-site-header">
			<div class="j-site-header-inner">
				<div class="j-site-header-left">
					<a class="j-site-logo" href="/">Jigsaw</a>
					<nav class="j-site-header-nav" aria-label="Site">
						<a class="j-site-nav-link" href="/arcade">Arcade</a>
						<a class="j-site-nav-link" href="/docs">Docs</a>
					</nav>
				</div>
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

	const setSignedIn = (name: string, coins = 0, isAdmin = false): void => {
		authSlot.innerHTML = `
			<div class="j-site-user-wrap">
				<span class="j-site-coin-pill">🪙 ${coins}</span>
				<span class="j-site-user">${name}</span>
				${isAdmin ? '<span class="j-site-admin-pill">Admin</span>' : ''}
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
			setSignedIn(userName, payload.user?.coins || 0, Boolean(payload.user?.isAdmin))
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
