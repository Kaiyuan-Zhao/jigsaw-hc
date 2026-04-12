export function buildGamesSdk(frontendUrl: string): string {
	return `(function () {
	const scriptEl = document.currentScript
	const scriptUrl = scriptEl && scriptEl.src ? new URL(scriptEl.src) : new URL(window.location.href)
	const scriptPath = scriptUrl.pathname || ''
	const basePath = scriptPath.endsWith('/games/sdk.js') ? scriptPath.slice(0, -('/games/sdk.js'.length)) : ''
	const API_BASE_URL = scriptUrl.origin + basePath
	const DEFAULT_REDIRECT_URL = '${frontendUrl}/arcade'
	const DEFAULT_SELECTOR = '[data-jigsaw-win]'
	const POPUP_TIMEOUT_MS = 90_000
	const statusColors = { ok: '#4b5563', error: '#b91c1c' }

	function asMessage(error) {
		if (error && typeof error.message === 'string' && error.message) return error.message
		return 'Unable to claim reward'
	}

	function setStatus(target, text, isError) {
		if (!target) return
		target.textContent = text
		target.style.color = isError ? statusColors.error : statusColors.ok
	}

	async function requestJson(url, options) {
		const response = await fetch(url, options)
		const payload = await response.json().catch(function () { return {} })
		if (!response.ok) throw new Error(payload && payload.error ? payload.error : 'Request failed')
		return payload
	}

	function waitForClaimToken(origin) {
		return new Promise(function (resolve, reject) {
			const popupUrl = API_BASE_URL + '/games/claim-popup?origin=' + encodeURIComponent(origin)
			const popup = window.open(popupUrl, 'jigsaw-claim-auth', 'width=520,height=720')
			if (!popup) {
				reject(new Error('Popup blocked. Please allow popups and try again.'))
				return
			}

			const timeoutId = window.setTimeout(function () {
				cleanup()
				try { popup.close() } catch (_) {}
				reject(new Error('Auth popup timed out'))
			}, POPUP_TIMEOUT_MS)

			function onMessage(event) {
				if (event.origin !== API_BASE_URL) return
				const data = event.data || {}
				if (data.type === 'jigsaw-claim-token') {
					cleanup()
					resolve(data.token)
					return
				}
				if (data.type === 'jigsaw-claim-error') {
					cleanup()
					reject(new Error(data.error || 'Could not authenticate claim'))
				}
			}

			function cleanup() {
				window.clearTimeout(timeoutId)
				window.removeEventListener('message', onMessage)
			}

			window.addEventListener('message', onMessage)
		})
	}

	async function claim(options) {
		var config = options || {}
		var puzzleId = (config.puzzleId || '').toString().trim()
		if (!puzzleId) throw new Error('puzzleId is required')
		var redirectUrl = (config.redirectUrl || DEFAULT_REDIRECT_URL).toString()
		var statusEl = config.statusEl || null
		var triggerEl = config.triggerEl || null
		if (triggerEl) triggerEl.disabled = true
		setStatus(statusEl, 'Authenticating...', false)

		try {
			var claimToken = await waitForClaimToken(window.location.origin)
			setStatus(statusEl, 'Crediting solve...', false)
			await requestJson(API_BASE_URL + '/games/redeem-token', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: claimToken, puzzleId: puzzleId })
			})
			setStatus(statusEl, 'Reward claimed. Redirecting...', false)
			window.location.href = redirectUrl
			return { ok: true }
		} catch (error) {
			setStatus(statusEl, asMessage(error), true)
			if (triggerEl) triggerEl.disabled = false
			throw error
		}
	}

	function bindButton(button) {
		if (!(button instanceof HTMLButtonElement)) return
		if (button.dataset.jigsawBound === 'true') return
		button.dataset.jigsawBound = 'true'
		button.addEventListener('click', function () {
			var puzzleId = button.getAttribute('data-puzzle-id') || ''
			var redirectUrl = button.getAttribute('data-redirect-url') || DEFAULT_REDIRECT_URL
			var statusSelector = button.getAttribute('data-status-target')
			var statusEl = statusSelector ? document.querySelector(statusSelector) : null
			claim({ puzzleId: puzzleId, redirectUrl: redirectUrl, statusEl: statusEl, triggerEl: button }).catch(function () {})
		})
	}

	function autoBind(selector) {
		document.querySelectorAll(selector || DEFAULT_SELECTOR).forEach(bindButton)
	}

	window.JigsawGames = { claim: claim, autoBind: autoBind }
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { autoBind(DEFAULT_SELECTOR) })
	} else {
		autoBind(DEFAULT_SELECTOR)
	}
})()
`
}
