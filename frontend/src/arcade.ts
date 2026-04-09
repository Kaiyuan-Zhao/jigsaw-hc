
import { API_BASE_URL } from './config'

type EdgeType = 'tab' | 'hole' | 'flat'
type IconName = 'heart'
type Notch = { top: EdgeType; right: EdgeType; bottom: EdgeType; left: EdgeType }

type AuthUser = {
  id: string
  name?: string
  email?: string
  coins?: number
  isAdmin?: boolean
}

type AuthMeResponse = {
  authenticated: boolean
  user?: AuthUser
}

type ExampleCard = {
  title: string
  author: string
  genre: string
  thumbnail: string
  likes: number
  gameUrl?: string
}

type PuzzleOpts = {
  fill?: string
  stroke?: string
  strokeWidth?: number
  top?: EdgeType
  right?: EdgeType
  bottom?: EdgeType
  left?: EdgeType
  mid?: number
}

type ApiErrorResponse = { error?: string; coins?: number }

const HERO_THUMB = new URL('./assets/vite.svg', import.meta.url).href
const ARCADE_PASTEL_COLORS = ['#bae1ff', '#ffb3ba', '#baffc9', '#ffffba'] as const

const EXAMPLES: ExampleCard[] = [
  { title: 'Color Cipher', author: 'by @maya_codes', genre: 'Browser puzzle game', thumbnail: HERO_THUMB, likes: 24, gameUrl: 'http://localhost:3000/' },
  { title: 'Hidden Vault', author: 'by @ctf_master', genre: 'CTF-style challenge', thumbnail: HERO_THUMB, likes: 31 },
  { title: 'Ghost Protocol', author: 'by @arg_enthusiast', genre: 'ARG-inspired site', thumbnail: HERO_THUMB, likes: 19 },
  { title: 'Neural Maze', author: 'by @ai_puzzler', genre: 'AI puzzle', thumbnail: HERO_THUMB, likes: 42 },
  { title: 'Escape Box', author: 'by @escape_art', genre: 'Web Escape Room', thumbnail: HERO_THUMB, likes: 15 },
  { title: 'Pixel Hunt', author: 'by @retro_gamer', genre: 'Find the invisible pixel', thumbnail: HERO_THUMB, likes: 67 },
  { title: 'Decryptor', author: 'by @crypto_kid', genre: 'Cipher challenge', thumbnail: HERO_THUMB, likes: 88 },
  { title: 'Phantom Signal', author: 'by @spooky_dev', genre: 'Audio ARG', thumbnail: HERO_THUMB, likes: 54 },
]

const ICON_PATHS: Record<IconName, string> = {
  heart: '<path d="m12 20-1.1-1C6 14.7 3 12 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.4.8 4.5 2.1C14.1 3.8 15.8 3 17.5 3 20.6 3 23 5.4 23 8.5c0 3.5-3 6.2-7.9 10.5z"/>',
}

function icon(name: IconName, size = 20, filled = false): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`
}

function createElement<T extends HTMLElement = HTMLElement>(html: string): T {
  const container = document.createElement('div')
  container.innerHTML = html.trim()
  return container.firstElementChild as T
}

function buildPuzzlePath(top: EdgeType, right: EdgeType, bottom: EdgeType, left: EdgeType, mid: number): string {
  const tab = 25
  const neck = 15
  const segs: string[] = ['M 0 0']

  if (top === 'tab') {
    segs.push(`L ${mid - neck} 0`)
    segs.push(`C ${mid - neck} ${-tab} ${mid + neck} ${-tab} ${mid + neck} 0`)
  } else if (top === 'hole') {
    segs.push(`L ${mid - neck} 0`)
    segs.push(`C ${mid - neck} ${tab} ${mid + neck} ${tab} ${mid + neck} 0`)
  }
  segs.push('L 100 0')

  if (right === 'tab') {
    segs.push(`L 100 ${mid - neck}`)
    segs.push(`C ${100 + tab} ${mid - neck} ${100 + tab} ${mid + neck} 100 ${mid + neck}`)
  } else if (right === 'hole') {
    segs.push(`L 100 ${mid - neck}`)
    segs.push(`C ${100 - tab} ${mid - neck} ${100 - tab} ${mid + neck} 100 ${mid + neck}`)
  }
  segs.push('L 100 100')

  if (bottom === 'tab') {
    segs.push(`L ${mid + neck} 100`)
    segs.push(`C ${mid + neck} ${100 + tab} ${mid - neck} ${100 + tab} ${mid - neck} 100`)
  } else if (bottom === 'hole') {
    segs.push(`L ${mid + neck} 100`)
    segs.push(`C ${mid + neck} ${100 - tab} ${mid - neck} ${100 - tab} ${mid - neck} 100`)
  }
  segs.push('L 0 100')

  if (left === 'tab') {
    segs.push(`L 0 ${mid + neck}`)
    segs.push(`C ${-tab} ${mid + neck} ${-tab} ${mid - neck} 0 ${mid - neck}`)
  } else if (left === 'hole') {
    segs.push(`L 0 ${mid + neck}`)
    segs.push(`C ${tab} ${mid + neck} ${tab} ${mid - neck} 0 ${mid - neck}`)
  }
  segs.push('L 0 0 Z')

  return segs.join(' ')
}

function puzzleSVG(opts: PuzzleOpts = {}): string {
  const {
    fill = '#ffffff',
    stroke = '#111827',
    strokeWidth = 3,
    top = 'tab',
    right = 'tab',
    bottom = 'tab',
    left = 'tab',
    mid = 50,
  } = opts

  const path = buildPuzzlePath(top, right, bottom, left, mid)

  return `
<svg class="j-puzzle-svg" viewBox="-16 -16 132 132"
     xmlns="http://www.w3.org/2000/svg"
     style="position:absolute;left:-16%;top:-16%;width:132%;height:132%;overflow:visible;display:block;pointer-events:none">
  <path d="${path}" fill="${fill}"/>
  <path d="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"
        stroke-linejoin="round" paint-order="stroke fill"/>
</svg>`
}

function puzzleEl(fill: string, notch: Notch): string {
  return puzzleSVG({ fill, ...notch })
}

function buildCoinPanel(user: AuthUser): string {
  return `
    <section class="j-arcade-coins-panel">
      <div class="j-arcade-coins-head">
        <h2 class="j-arcade-coins-title">Arcade Coins</h2>
        <p class="j-arcade-coins-user">${user.name || user.email || 'Signed in'}</p>
      </div>
      <div class="j-arcade-coins-value">🪙 ${user.coins || 0}</div>
      <div class="j-arcade-coin-test-controls">
        <button class="j-coin-test-btn" type="button" data-delta="1">+1 coin</button>
        <button class="j-coin-test-btn" type="button" data-delta="-1">-1 coin</button>
      </div>
      <p class="j-arcade-coin-test-status" aria-live="polite"></p>
    </section>
  `
}

function buildAdminPanel(): string {
  return `
    <section class="j-arcade-admin-panel">
      <h2 class="j-arcade-admin-title">Admin: Grant Coins</h2>
      <form class="j-admin-grant-form">
        <label class="j-admin-grant-label" for="grant-user-id">Hack Club user ID</label>
        <input id="grant-user-id" name="userId" class="j-admin-grant-input" type="text" required />
        <label class="j-admin-grant-label" for="grant-amount">Amount</label>
        <input id="grant-amount" name="amount" class="j-admin-grant-input" type="number" min="1" step="1" required />
        <label class="j-admin-grant-label" for="grant-reason">Reason (optional)</label>
        <input id="grant-reason" name="reason" class="j-admin-grant-input" type="text" />
        <button class="j-admin-grant-submit" type="submit">Grant coins</button>
        <p class="j-admin-grant-status" aria-live="polite"></p>
      </form>
    </section>
  `
}

function buildCard(entry: ExampleCard, index: number): string {
  const fill = ARCADE_PASTEL_COLORS[index % ARCADE_PASTEL_COLORS.length]
  const thumbMarkup = entry.gameUrl
    ? `<a class="j-arcade-thumb-link" href="${entry.gameUrl}" target="_self" rel="noopener noreferrer"><img class="j-arcade-thumb" src="${entry.thumbnail}" alt="${entry.title} thumbnail" /></a>`
    : `<img class="j-arcade-thumb" src="${entry.thumbnail}" alt="${entry.title} thumbnail" />`

  return `
    <div class="j-arcade-stack" style="z-index:${50 - index}" data-card-index="${index}">
      <article class="j-arcade-piece j-arcade-piece-top">
        ${puzzleEl(fill, { top: 'flat', right: 'flat', bottom: 'tab', left: 'flat' })}
        <div class="j-arcade-piece-inner j-arcade-piece-inner-top">
          <div class="j-arcade-thumb-wrap">
            ${thumbMarkup}
          </div>
        </div>
      </article>
      <article class="j-arcade-piece j-arcade-piece-bottom">
        ${puzzleEl(fill, { top: 'hole', right: 'flat', bottom: 'flat', left: 'flat' })}
        <div class="j-arcade-piece-inner j-arcade-piece-inner-bottom">
          <h2 class="j-arcade-card-title">${entry.title}</h2>
          <p class="j-arcade-card-desc">${entry.genre}</p>
          <div class="j-arcade-card-footer">
            <span class="j-arcade-card-author">${entry.author}</span>
            <button class="j-like-btn" type="button" data-liked="false" data-base-count="${entry.likes}" aria-pressed="false" aria-label="Like ${entry.title}">
              <span class="j-like-icon">${icon('heart', 15, false)}</span>
              <span class="j-like-count">${entry.likes}</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  `
}

function buildCards(): string {
  return EXAMPLES.map((entry, index) => buildCard(entry, index)).join('')
}

function buildArcadePage(auth: AuthMeResponse | null): HTMLElement {
  const user = auth?.authenticated ? auth.user : undefined
  const coinPanel = user ? buildCoinPanel(user) : ''
  const adminGrantPanel = user?.isAdmin ? buildAdminPanel() : ''

  return createElement(`
<section class="j-arcade-gallery-page">
  <div class="j-arcade-gallery-inner">
    <header class="j-arcade-gallery-head">
      <h1 class="j-arcade-gallery-title">Arcade Gallery</h1>
      <p class="j-arcade-gallery-subtitle">Every game is one puzzle piece in the full arcade.</p>
      <a href="/" class="j-arcade-back-link">Back to Home</a>
    </header>
    ${coinPanel}
    ${adminGrantPanel}
    <div class="j-arcade-gallery-grid">
      ${buildCards()}
    </div>
  </div>
</section>
`)
}

function setupLikes(root: HTMLElement): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('.j-like-btn')
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const liked = button.dataset.liked === 'true'
      const baseCount = Number(button.dataset.baseCount ?? '0')
      const nextLiked = !liked
      const countEl = button.querySelector<HTMLElement>('.j-like-count')

      button.dataset.liked = nextLiked ? 'true' : 'false'
      button.setAttribute('aria-pressed', nextLiked ? 'true' : 'false')
      button.classList.toggle('is-liked', nextLiked)
      if (countEl) {
        countEl.textContent = String(nextLiked ? baseCount + 1 : baseCount)
      }
    })
  })
}

function setStatusMessage(statusEl: HTMLElement, message: string, type: 'error' | 'success' | 'pending'): void {
  statusEl.textContent = message
  statusEl.classList.remove('is-error', 'is-success')
  if (type === 'error') statusEl.classList.add('is-error')
  if (type === 'success') statusEl.classList.add('is-success')
}

function setupAdminGrant(root: HTMLElement, auth: AuthMeResponse | null): void {
  if (!auth?.authenticated || !auth.user?.isAdmin) return

  const form = root.querySelector<HTMLFormElement>('.j-admin-grant-form')
  const status = root.querySelector<HTMLElement>('.j-admin-grant-status')
  if (!form || !status) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const userId = String(formData.get('userId') || '').trim()
    const amount = Number(formData.get('amount'))
    const reason = String(formData.get('reason') || '').trim()
    const normalizedAmount = Math.floor(amount)

    if (!userId || !Number.isFinite(amount) || normalizedAmount <= 0) {
      setStatusMessage(status, 'Enter a valid user ID and positive coin amount.', 'error')
      return
    }

    const submitButton = form.querySelector<HTMLButtonElement>('.j-admin-grant-submit')
    if (submitButton) submitButton.disabled = true
    setStatusMessage(status, 'Granting coins...', 'pending')

    try {
      const response = await fetch(`${API_BASE_URL}/admin/coins/grant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: normalizedAmount,
          reason: reason || undefined,
        }),
      })

      const payload = (await response.json()) as ApiErrorResponse
      if (!response.ok) throw new Error(payload.error || 'Failed to grant coins')

      setStatusMessage(status, `Granted ${normalizedAmount} coins to ${userId}. New balance: ${payload.coins || 0}.`, 'success')
      form.reset()
    } catch (error) {
      setStatusMessage(status, error instanceof Error ? error.message : 'Failed to grant coins', 'error')
    } finally {
      if (submitButton) submitButton.disabled = false
    }
  })
}

function setupCoinTestControls(root: HTMLElement, auth: AuthMeResponse | null): void {
  if (!auth?.authenticated || !auth.user) return

  const buttons = root.querySelectorAll<HTMLButtonElement>('.j-coin-test-btn')
  const status = root.querySelector<HTMLElement>('.j-arcade-coin-test-status')
  const coinsValue = root.querySelector<HTMLElement>('.j-arcade-coins-value')
  if (!buttons.length || !status || !coinsValue) return

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const delta = Number(button.dataset.delta || '0')
      if (!Number.isFinite(delta) || delta === 0) return

      buttons.forEach((item) => {
        item.disabled = true
      })
      setStatusMessage(status, 'Updating coins...', 'pending')

      try {
        const response = await fetch(`${API_BASE_URL}/coins/test-adjust`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: delta }),
        })

        const payload = (await response.json()) as ApiErrorResponse
        if (!response.ok) throw new Error(payload.error || 'Failed to update coins')

        const nextCoins = Number(payload.coins || 0)
        coinsValue.textContent = `🪙 ${nextCoins}`
        setStatusMessage(status, `Coins updated. New balance: ${nextCoins}.`, 'success')
      } catch (error) {
        setStatusMessage(status, error instanceof Error ? error.message : 'Failed to update coins', 'error')
      } finally {
        buttons.forEach((item) => {
          item.disabled = false
        })
      }
    })
  })
}

function mountArcade(root: HTMLElement, auth: AuthMeResponse | null): void {
  root.innerHTML = ''
  root.appendChild(buildArcadePage(auth))
  setupLikes(root)
  setupCoinTestControls(root, auth)
  setupAdminGrant(root, auth)
}

async function fetchAuthState(): Promise<AuthMeResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
    if (!response.ok) return null
    return (await response.json()) as AuthMeResponse
  } catch {
    return null
  }
}

export function initArcade(root: HTMLElement): void {
  mountArcade(root, null)
  const hydrateAuth = async (): Promise<void> => {
    const auth = await fetchAuthState()
    mountArcade(root, auth)
  }
  void hydrateAuth()
}