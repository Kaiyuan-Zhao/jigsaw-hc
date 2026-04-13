import { fetchJson } from './lib/api'
import type { EdgeType } from './puzzle-path'
import { htmlToElement } from './lib/dom'
import { puzzleSVG } from './ui/puzzle-svg'
import { PASTEL_COLORS } from './lib/palette'
import type { ApiErrorResponse, AuthMeResponse } from './types/auth'
import type { UserPuzzleCard } from './types/arcade'
type Notch = { top: EdgeType; right: EdgeType; bottom: EdgeType; left: EdgeType }

const ARCADE_PASTEL_COLORS = PASTEL_COLORS
const ICON_GAME_OF_GODS = new URL('./assets/arcade_thumbnails/angel.jpg', import.meta.url).href
const ICON_HIDDEN_VAULT = new URL('./assets/arcade_thumbnails/hidden-vault.svg', import.meta.url).href
const ICON_GHOST_PROTOCOL = new URL('./assets/arcade_thumbnails/ghost-protocol.svg', import.meta.url).href
const ICON_PIECE_PLATFORMER = new URL('./assets/arcade_thumbnails/piece-platformer.svg', import.meta.url).href

const USER_PUZZLES: UserPuzzleCard[] = [
  // Set creatorUserId to the Hack Club OpenID user ID to pre-disable self-like.
  { puzzleId: 'game-of-gods', title: 'Game of Gods', author: 'by Kaiyuan Zhao', genre: 'LLM Logic Puzzle', thumbnail: ICON_GAME_OF_GODS, baseLikes: 0, gameUrl: 'https://game-of-gods.vercel.app/' },
  { puzzleId: 'hidden-vault', title: 'Hidden Vault (dummy)', author: 'by Ken Zhao', genre: 'CTF-style challenge', thumbnail: ICON_HIDDEN_VAULT, baseLikes: 2 },
  { puzzleId: 'ghost-protocol', title: 'Ghost Protocol (dummy)', author: 'by @arg_enthusiast', genre: 'ARG site', thumbnail: ICON_GHOST_PROTOCOL, baseLikes: 16 },
  { puzzleId: 'piece-platformer', title: 'Piece Platformer (dummy)', author: 'by @retro_kid', genre: 'Retro puzzle game', thumbnail: ICON_PIECE_PLATFORMER, baseLikes: 5 },
]

const HEART_ICON_PATH =
	'<path d="m12 20-1.1-1C6 14.7 3 12 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.4.8 4.5 2.1C14.1 3.8 15.8 3 17.5 3 20.6 3 23 5.4 23 8.5c0 3.5-3 6.2-7.9 10.5z"/>'

function icon(size = 20, filled = false): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${HEART_ICON_PATH}</svg>`
}

function verifyEnterIcon(size = 14): string {
  return `<svg class="c-arcade-solution-submit-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`
}

function verifyCheckIcon(size = 14): string {
  return `<svg class="c-arcade-solution-submit-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`
}

function verifyXIcon(size = 14): string {
  return `<svg class="c-arcade-solution-submit-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`
}

type SolutionSubmitVisual = 'default' | 'success' | 'error'

function setSolutionSubmitVisual(button: HTMLButtonElement, visual: SolutionSubmitVisual, detail?: string): void {
  button.classList.remove('c-arcade-solution-submit--default', 'c-arcade-solution-submit--success', 'c-arcade-solution-submit--error')
  if (visual === 'success') {
    button.classList.add('c-arcade-solution-submit--success')
    button.innerHTML = verifyCheckIcon(14)
    const label = detail || 'Verified'
    button.setAttribute('aria-label', label)
    button.title = label
    return
  }
  if (visual === 'error') {
    button.classList.add('c-arcade-solution-submit--error')
    button.innerHTML = verifyXIcon(14)
    const label = detail || 'Verification failed'
    button.setAttribute('aria-label', label)
    button.title = label
    return
  }
  button.classList.add('c-arcade-solution-submit--default')
  button.innerHTML = verifyEnterIcon(14)
  button.setAttribute('aria-label', 'Verify solve password')
  button.title = 'Verify'
}

function puzzleEl(fill: string, notch: Notch): string {
  return puzzleSVG({ fill, ...notch })
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

type PuzzleLikeOptions = {
  count: number
  liked: boolean
  ownPuzzle: boolean
  disabled: boolean
  titleAttr: string
  puzzleId: string
  seedCount: number
}

function buildCardInner(
  entry: UserPuzzleCard,
  index: number,
  likeOpts: PuzzleLikeOptions
): string {
  const fill = ARCADE_PASTEL_COLORS[index % ARCADE_PASTEL_COLORS.length]
  const safeUrl = entry.gameUrl?.trim()
  const safeTitle = escapeHtml(entry.title)
  const thumbMarkup = safeUrl
    ? `<a class="c-arcade-thumb-link" href="${escapeAttr(safeUrl)}" target="_self" rel="noopener noreferrer"><img class="c-arcade-thumb" src="${escapeAttr(entry.thumbnail)}" alt="${escapeAttr(entry.title)} thumbnail" /></a>`
    : `<img class="c-arcade-thumb" src="${escapeAttr(entry.thumbnail)}" alt="${escapeAttr(entry.title)} thumbnail" />`

  const likedClass = likeOpts.liked ? ' is-liked' : ''
  const likedStr = likeOpts.liked ? 'true' : 'false'
  const pressedStr = likeOpts.liked ? 'true' : 'false'
  const disabledAttr = likeOpts.disabled ? ' disabled' : ''
  const verificationPuzzleId = entry.puzzleId.trim().toLowerCase()
  const ownPuzzleAttr = likeOpts.ownPuzzle ? ' data-own-puzzle="1"' : ''
  const ownPuzzleInputAttrs = likeOpts.ownPuzzle ? ' value="This is your puzzle!" disabled readonly' : ''
  const ownPuzzleButtonAttrs = likeOpts.ownPuzzle
    ? ' c-arcade-solution-submit--success" type="button" aria-label="This is your puzzle" title="This is your puzzle" disabled'
    : ' c-arcade-solution-submit--default" type="submit" aria-label="Verify solve password" title="Verify"'
  const solutionButtonIcon = likeOpts.ownPuzzle ? verifyCheckIcon(14) : verifyEnterIcon(14)
  const likeBlock = `<button class="c-like-btn${likedClass}" type="button" data-upvote-api="1" data-puzzle-id="${escapeAttr(likeOpts.puzzleId)}" data-liked="${likedStr}" data-base-count="${likeOpts.count}" data-seed-count="${likeOpts.seedCount}" aria-pressed="${pressedStr}" aria-label="${escapeAttr(likeOpts.titleAttr)}" title="${escapeAttr(likeOpts.titleAttr)}"${disabledAttr}>
              <span class="c-like-icon">${icon(15, likeOpts.liked)}</span>
              <span class="c-like-count">${likeOpts.count}</span>
            </button>`
  const verificationMarkup = verificationPuzzleId
    ? `
      <form class="c-arcade-solution-form c-arcade-solution-form--top${likeOpts.ownPuzzle ? ' is-solved' : ''}" data-puzzle-id="${escapeAttr(verificationPuzzleId)}"${ownPuzzleAttr}>
        <input type="hidden" name="puzzleId" value="${escapeAttr(verificationPuzzleId)}" />
        <div class="c-arcade-solution-controls">
          <input id="arcade-solution-${index}" class="c-arcade-solution-input" type="text" autocomplete="off" placeholder="Solve password" aria-label="Solve password" required${ownPuzzleInputAttrs} />
          <button class="c-arcade-solution-submit${ownPuzzleButtonAttrs}>${solutionButtonIcon}</button>
        </div>
      </form>
    `
    : ''

  return `
    <div class="c-arcade-stack" style="z-index:${50 - index}" data-card-index="${index}">
      <article class="c-arcade-piece c-arcade-piece-top">
        ${puzzleEl(fill, { top: 'flat', right: 'flat', bottom: 'tab', left: 'flat' })}
        <div class="c-arcade-piece-inner c-arcade-piece-inner-top">
          ${verificationMarkup}
          <div class="c-arcade-thumb-wrap">
            ${thumbMarkup}
          </div>
        </div>
      </article>
      <article class="c-arcade-piece c-arcade-piece-bottom">
        ${puzzleEl(fill, { top: 'hole', right: 'flat', bottom: 'flat', left: 'flat' })}
        <div class="c-arcade-piece-inner c-arcade-piece-inner-bottom">
          <h2 class="c-arcade-card-title">${safeTitle}</h2>
          <p class="c-arcade-card-desc">${escapeHtml(entry.genre)}</p>
          <div class="c-arcade-card-footer">
            <span class="c-arcade-card-author">${escapeHtml(entry.author)}</span>
            ${likeBlock}
          </div>
        </div>
      </article>
    </div>
  `
}

type UpvoteState = {
  likeCount: number
  likedByMe: boolean
  ownPuzzle: boolean
}

function buildUserPuzzleCard(
  entry: UserPuzzleCard,
  index: number,
  auth: AuthMeResponse | null,
  byPuzzleId: Record<string, UpvoteState>
): string {
  const signedIn = Boolean(auth?.authenticated)
  const userId = auth?.authenticated ? auth.user?.id : undefined
  const ownPuzzleFromEntry = Boolean(entry.creatorUserId && userId && entry.creatorUserId === userId)
  const seedCount = Math.max(0, Math.floor(entry.baseLikes || 0))
  const upvoteState = byPuzzleId[entry.puzzleId] || { likeCount: 0, likedByMe: false, ownPuzzle: false }
  const ownPuzzle = ownPuzzleFromEntry || Boolean(upvoteState.ownPuzzle)
  const count = seedCount + Math.max(0, Math.floor(upvoteState.likeCount))
  const liked = Boolean(upvoteState.likedByMe)
  let titleAttr = `Upvote ${entry.title}`
  if (!signedIn) {
    titleAttr = 'Sign in with Hack Club OpenID to like puzzles'
  } else if (ownPuzzle) {
    titleAttr = 'You cannot like your own puzzle'
  } else if (liked) {
    titleAttr = 'You already liked this puzzle'
  } else {
    titleAttr = `Like ${entry.title}`
  }
  return buildCardInner(entry, index, {
    count,
    liked,
    ownPuzzle,
    disabled: !signedIn || ownPuzzle || liked,
    titleAttr,
    puzzleId: entry.puzzleId,
    seedCount,
  })
}

function buildGalleryCards(auth: AuthMeResponse | null, byPuzzleId: Record<string, UpvoteState>): string {
  return USER_PUZZLES.map((entry, index) => buildUserPuzzleCard(entry, index, auth, byPuzzleId)).join('')
}

function buildArcadePage(auth: AuthMeResponse | null, byPuzzleId: Record<string, UpvoteState>): HTMLElement {
  return htmlToElement(`
<section class="c-arcade-gallery-page">
  <div class="c-arcade-gallery-decor c-arcade-gallery-decor-1">
    ${puzzleSVG({ fill: ARCADE_PASTEL_COLORS[0], stroke: 'transparent', top: 'flat', right: 'tab', bottom: 'tab', left: 'flat', cls: '' })}
  </div>
  <div class="c-arcade-gallery-decor c-arcade-gallery-decor-2">
    ${puzzleSVG({ fill: ARCADE_PASTEL_COLORS[1], stroke: 'transparent', top: 'hole', right: 'flat', bottom: 'hole', left: 'tab', cls: '' })}
  </div>
  <div class="c-arcade-gallery-decor c-arcade-gallery-decor-3">
    ${puzzleSVG({ fill: ARCADE_PASTEL_COLORS[2], stroke: 'transparent', top: 'tab', right: 'flat', bottom: 'flat', left: 'hole', cls: '' })}
  </div>
  <div class="c-arcade-gallery-decor c-arcade-gallery-decor-4">
    ${puzzleSVG({ fill: ARCADE_PASTEL_COLORS[2], stroke: 'transparent', top: 'flat', right: 'tab', bottom: 'hole', left: 'tab', cls: '' })}
  </div>
  <div class="c-arcade-gallery-inner">
    <header class="c-arcade-gallery-head">
      <div class="c-arcade-gallery-title-wrap">
        <h1 class="c-arcade-gallery-title c-page-title">Arcade Gallery</h1>
      </div>
      <p class="c-arcade-upvote-status" aria-live="polite"></p>
      <a href="/" class="c-arcade-back-link">Back to Home</a>
    </header>
    <div class="c-arcade-gallery-grid">
      ${buildGalleryCards(auth, byPuzzleId)}
    </div>
  </div>
</section>
`)
}

type UpvoteOkResponse = { success?: boolean; likeCount?: number; newUpvote?: boolean }
type UpvoteStatusResponse = {
  success?: boolean
  byPuzzleId?: Record<string, { likeCount?: number; likedByMe?: boolean; ownPuzzle?: boolean }>
}
type VerifySolutionResponse = {
  success?: boolean
  verified?: boolean
  newCredit?: boolean
  amount?: number
  pieces?: number
}
type SolutionStatusResponse = {
  success?: boolean
  solvedByPuzzleId?: Record<string, boolean>
}

function setHeaderPiecePill(balance: number): void {
  const pill = document.querySelector<HTMLElement>('[data-ui-hook="piece-pill"], .c-site-piece-pill')
  if (pill) pill.textContent = `🧩 ${balance}`
}

function setupLikes(root: HTMLElement): void {
  const upvoteStatus = root.querySelector<HTMLElement>('.c-arcade-upvote-status')
  const buttons = root.querySelectorAll<HTMLButtonElement>('.c-like-btn[data-upvote-api="1"]')
  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.disabled) return
      const puzzleId = String(button.dataset.puzzleId || '').trim()
      if (!puzzleId) return

      if (upvoteStatus) {
        upvoteStatus.textContent = ''
        upvoteStatus.classList.remove('is-error')
      }
      button.disabled = true
      try {
        const payload = await fetchJson<ApiErrorResponse & UpvoteOkResponse>('/arcade/upvote', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzleId }),
        })
        const seedCount = Number(button.dataset.seedCount ?? '0')
        const dbLikeCount = Number(payload.likeCount ?? '0')
        const likeCount = seedCount + Math.max(0, dbLikeCount)
        const countEl = button.querySelector<HTMLElement>('.c-like-count')
        const iconWrap = button.querySelector<HTMLElement>('.c-like-icon')
        button.dataset.baseCount = String(likeCount)
        button.dataset.liked = 'true'
        button.setAttribute('aria-pressed', 'true')
        button.classList.add('is-liked')
        if (countEl) countEl.textContent = String(likeCount)
        if (iconWrap) iconWrap.innerHTML = icon(15, true)
        button.setAttribute('aria-label', 'You already liked this puzzle')
        button.title = 'You already liked this puzzle'
      } catch (error) {
        if (upvoteStatus) {
          setStatusMessage(upvoteStatus, error instanceof Error ? error.message : 'Upvote failed', 'error')
        }
        button.disabled = false
      }
    })
  })
}

function setupSolutionVerification(root: HTMLElement): void {
  const forms = root.querySelectorAll<HTMLFormElement>('.c-arcade-solution-form')
  const markSolved = (
    form: HTMLFormElement,
    input: HTMLInputElement,
    button: HTMLButtonElement,
    detail = 'Verified',
    solvedText = 'solved!'
  ): void => {
    setSolutionSubmitVisual(button, 'success', detail)
    form.classList.add('is-solved')
    input.value = solvedText
    input.disabled = true
    input.readOnly = false
    button.disabled = true
  }

  forms.forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('.c-arcade-solution-input')
    const button = form.querySelector<HTMLButtonElement>('.c-arcade-solution-submit')
    if (!input || !button) return
    const ownPuzzle = form.getAttribute('data-own-puzzle') === '1'
    if (ownPuzzle) {
      markSolved(form, input, button, 'This is your puzzle!', 'This is your puzzle!')
      return
    }

    input.addEventListener('input', () => {
      if (form.classList.contains('is-solved')) return
      if (button.classList.contains('c-arcade-solution-submit--error')) {
        setSolutionSubmitVisual(button, 'default')
      }
    })

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (form.classList.contains('is-solved')) return
      const fromForm = new FormData(form).get('puzzleId')
      const puzzleId = String(fromForm || form.getAttribute('data-puzzle-id') || form.dataset.puzzleId || '')
        .trim()
        .toLowerCase()
      const entered = input.value.trim()
      if (!puzzleId) return
      if (!entered) {
        setSolutionSubmitVisual(button, 'error', 'Enter solve password')
        return
      }

      input.disabled = true
      button.disabled = true
      setSolutionSubmitVisual(button, 'default')
      try {
        const payload = await fetchJson<ApiErrorResponse & VerifySolutionResponse>('/arcade/verify-solution', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzleId, password: entered }),
        })
        const newCredit = Boolean(payload.newCredit)
        const amount = Number(payload.amount || 0)
        const successDetail = newCredit ? `Verified. +${amount} pieces.` : 'Verified. Already credited.'
        markSolved(form, input, button, successDetail)
        const nextPieces = Number(payload.pieces)
        if (Number.isFinite(nextPieces)) {
          setHeaderPiecePill(nextPieces)
        }
        const piecesValue = root.querySelector<HTMLElement>('.c-arcade-pieces-value')
        if (piecesValue && Number.isFinite(nextPieces)) {
          piecesValue.textContent = `🧩 ${nextPieces}`
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Verification failed'
        setSolutionSubmitVisual(button, 'error', msg)
        input.disabled = false
        button.disabled = false
      }
    })
  })

  const items = Array.from(forms)
    .map((form) => {
      const input = form.querySelector<HTMLInputElement>('.c-arcade-solution-input')
      const button = form.querySelector<HTMLButtonElement>('.c-arcade-solution-submit')
      const fromDataset = String(form.getAttribute('data-puzzle-id') || form.dataset.puzzleId || '')
        .trim()
        .toLowerCase()
      if (!input || !button || !fromDataset) return null
      return { form, input, button, puzzleId: fromDataset }
    })
    .filter((item): item is { form: HTMLFormElement; input: HTMLInputElement; button: HTMLButtonElement; puzzleId: string } => Boolean(item))

  const puzzleIds = Array.from(new Set(items.map((item) => item.puzzleId)))
  if (!puzzleIds.length) return

  void (async () => {
    try {
      const payload = await fetchJson<ApiErrorResponse & SolutionStatusResponse>('/arcade/solution-status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleIds }),
      })
      const solvedByPuzzleId = payload.solvedByPuzzleId || {}
      items.forEach(({ form, input, button, puzzleId }) => {
        if (solvedByPuzzleId[puzzleId]) {
          markSolved(form, input, button, 'Verified. Already solved.')
        }
      })
    } catch {
      // Ignore status hydrate errors and keep interactive fallback.
    }
  })()
}

function setStatusMessage(statusEl: HTMLElement, message: string, type: 'error' | 'success' | 'pending'): void {
  statusEl.textContent = message
  statusEl.classList.remove('is-error', 'is-success')
  if (type === 'error') statusEl.classList.add('is-error')
  if (type === 'success') statusEl.classList.add('is-success')
}

function setupPieceTestControls(root: HTMLElement, auth: AuthMeResponse | null): void {
  if (!auth?.authenticated || !auth.user) return

  const buttons = root.querySelectorAll<HTMLButtonElement>('.c-piece-test-btn')
  const status = root.querySelector<HTMLElement>('.c-arcade-piece-test-status')
  const piecesValue = root.querySelector<HTMLElement>('.c-arcade-pieces-value')
  if (!buttons.length || !status || !piecesValue) return

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const delta = Number(button.dataset.delta || '0')
      if (!Number.isFinite(delta) || delta === 0) return

      buttons.forEach((item) => {
        item.disabled = true
      })
      setStatusMessage(status, 'Updating pieces...', 'pending')

      try {
        const payload = await fetchJson<ApiErrorResponse>('/pieces/test-adjust', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: delta }),
        })

        const nextPieces = Number(payload.pieces || 0)
        setHeaderPiecePill(nextPieces)
        piecesValue.textContent = `🧩 ${nextPieces}`
        setStatusMessage(status, `Pieces updated. New balance: ${nextPieces}.`, 'success')
      } catch (error) {
        setStatusMessage(status, error instanceof Error ? error.message : 'Failed to update pieces', 'error')
      } finally {
        buttons.forEach((item) => {
          item.disabled = false
        })
      }
    })
  })
}

function mountArcade(root: HTMLElement, auth: AuthMeResponse | null, byPuzzleId: Record<string, UpvoteState>): void {
  root.innerHTML = ''
  root.appendChild(buildArcadePage(auth, byPuzzleId))
  setupLikes(root)
  setupPieceTestControls(root, auth)
  setupSolutionVerification(root)
}

async function fetchArcadeUpvoteState(): Promise<Record<string, UpvoteState>> {
  const puzzleIds = USER_PUZZLES.map((entry) => entry.puzzleId)
  const fallback: Record<string, UpvoteState> = {}
  puzzleIds.forEach((puzzleId) => {
    fallback[puzzleId] = { likeCount: 0, likedByMe: false, ownPuzzle: false }
  })
  try {
    const data = await fetchJson<ApiErrorResponse & UpvoteStatusResponse>('/arcade/upvote-status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleIds }),
    })
    const byPuzzleId = data.byPuzzleId || {}
    puzzleIds.forEach((puzzleId) => {
      const state = byPuzzleId[puzzleId]
      fallback[puzzleId] = {
        likeCount: Math.max(0, Number(state?.likeCount || 0)),
        likedByMe: Boolean(state?.likedByMe),
        ownPuzzle: Boolean(state?.ownPuzzle),
      }
    })
    return fallback
  } catch {
    return fallback
  }
}

async function fetchAuthState(): Promise<AuthMeResponse | null> {
  try {
    return await fetchJson<AuthMeResponse>('/auth/me', { credentials: 'include' })
  } catch {
    return null
  }
}

export function initArcade(root: HTMLElement): void {
  mountArcade(root, null, {})
  const hydrate = async (): Promise<void> => {
    const [auth, upvotes] = await Promise.all([fetchAuthState(), fetchArcadeUpvoteState()])
    mountArcade(root, auth, upvotes)
  }
  void hydrate()
}