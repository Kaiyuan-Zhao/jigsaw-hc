import { API_BASE_URL } from './config'
import { fetchJson } from './lib/api'
import { htmlToElement } from './lib/dom'
import type { AuthMeResponse } from './types/auth'

export function buildSiteHeader(): HTMLElement {
	const header = htmlToElement<HTMLElement>(`
		<header class="c-site-header">
			<div class="c-site-header-inner">
				<a class="c-site-logo" href="/">Jigsaw</a>
				<nav class="c-site-nav" aria-label="Primary">
					<a class="c-site-nav-link c-site-nav-link--home" href="/">Home</a>
					<a class="c-site-nav-link c-site-nav-link--arcade" href="/arcade">Arcade</a>
					<a class="c-site-nav-link c-site-nav-link--shop" href="/shop">Shop</a>
				</nav>
				<div class="c-site-auth"></div>
			</div>
		</header>
	`)

	const authSlot = header.querySelector<HTMLElement>('.c-site-auth')
	if (!authSlot) return header

	const setSignedOut = (): void => {
		authSlot.innerHTML = `<a class="c-site-signup" href="${API_BASE_URL}/auth/login">Sign up</a>`
	}

	const setSignedIn = (name: string, pieces = 0): void => {
		authSlot.innerHTML = `
			<div class="c-site-user-wrap">
				<span class="c-site-piece-pill" data-ui-hook="piece-pill">🧩 ${pieces}</span>
				<span class="c-site-user">${name}</span>
				<button class="c-site-logout" type="button">Logout</button>
			</div>
		`

		const logoutButton = authSlot.querySelector<HTMLButtonElement>('.c-site-logout')
		if (!logoutButton) return

		logoutButton.addEventListener('click', async () => {
			logoutButton.disabled = true
			try {
				await fetchJson<{ success: boolean }>('/auth/logout', {
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
			const payload = await fetchJson<AuthMeResponse>('/auth/me', {
				credentials: 'include',
			})
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
