import { fetchJson } from './lib/api'
import type { EdgeType } from './puzzle-path'
import { htmlToElement } from './lib/dom'
import { puzzleSVG } from './ui/puzzle-svg'
import { PASTEL_COLORS } from './lib/palette'
import type { ApiErrorResponse, AuthMeResponse, AuthUser } from './types/auth'
import type { ArcadeApiPuzzle, ExampleCard } from './types/arcade'
type Notch = { top: EdgeType; right: EdgeType; bottom: EdgeType; left: EdgeType }

const ARCADE_PASTEL_COLORS = PASTEL_COLORS
const HERO_THUMB = new URL('./assets/vite.svg', import.meta.url).href

const EXAMPLES: ExampleCard[] = [
  { title: 'Game of Gods', author: 'by Ken Zhao', genre: 'LLM Logic Puzzle', thumbnail: new URL('./assets/arcade_thumbnails/angel.jpg', import.meta.url).href, likes: 24, gameUrl: 'https://game-of-gods.vercel.app/' },
  { title: 'Hidden Vault', author: 'by @ctf_master', genre: 'CTF-style challenge', thumbnail: HERO_THUMB, likes: 31 },
  { title: 'Ghost Protocol', author: 'by @arg_enthusiast', genre: 'ARG-inspired site', thumbnail: HERO_THUMB, likes: 19 },
  { title: 'Neural Maze', author: 'by @ai_puzzler', genre: 'AI puzzle', thumbnail: HERO_THUMB, likes: 42 },
  { title: 'Escape Box', author: 'by @escape_art', genre: 'Web Escape Room', thumbnail: HERO_THUMB, likes: 15 },
  { title: 'Pixel Hunt', author: 'by @retro_gamer', genre: 'Find the invisible pixel', thumbnail: HERO_THUMB, likes: 67 },
  { title: 'Decryptor', author: 'by @crypto_kid', genre: 'Cipher challenge', thumbnail: HERO_THUMB, likes: 88 },
  { title: 'Phantom Signal', author: 'by @spooky_dev', genre: 'Audio ARG', thumbnail: HERO_THUMB, likes: 54 },
]

const HEART_ICON_PATH =
	'<path d="m12 20-1.1-1C6 14.7 3 12 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.4.8 4.5 2.1C14.1 3.8 15.8 3 17.5 3 20.6 3 23 5.4 23 8.5c0 3.5-3 6.2-7.9 10.5z"/>'

function icon(size = 20, filled = false): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${HEART_ICON_PATH}</svg>`
}

function puzzleEl(fill: string, notch: Notch): string {
  return puzzleSVG({ fill, ...notch })
}

function buildPiecePanel(user: AuthUser): string {
  return `
    <section class="c-arcade-pieces-panel">
      <div class="c-arcade-pieces-head">
        <h2 class="c-arcade-pieces-title">Arcade Pieces</h2>
        <p class="c-arcade-pieces-user">${user.name || user.email || 'Signed in'}</p>
      </div>
      <div class="c-arcade-pieces-value">🧩 ${user.pieces || 0}</div>
      <div class="c-arcade-piece-test-controls">
        <button class="c-piece-test-btn" type="button" data-delta="1000">+1 piece</button>
        <button class="c-piece-test-btn" type="button" data-delta="-10">-1 piece</button>
      </div>
      <p class="c-arcade-piece-test-status" aria-live="polite"></p>
    </section>
  `
}

function buildCreatorPuzzlePanel(): string {
  return `
    <section class="c-arcade-creator-panel">
      <h2 class="c-arcade-creator-title">List your puzzle in the arcade</h2>
      <p class="c-arcade-creator-hint">Use the same <code class="c-arcade-code">puzzleId</code> as in your game’s reward button. Upvotes count only from signed-in Hack Club accounts; each unique upvote adds 2 pieces to your balance.</p>
      <form class="c-creator-arcade-form">
        <label class="c-arcade-form-label" for="arcade-self-puzzle-id">Puzzle ID</label>
        <input id="arcade-self-puzzle-id" name="puzzleId" class="c-arcade-form-input" type="text" required autocomplete="off" />
        <label class="c-arcade-form-label" for="arcade-self-title">Title</label>
        <input id="arcade-self-title" name="title" class="c-arcade-form-input" type="text" required />
        <label class="c-arcade-form-label" for="arcade-self-genre">Genre (optional)</label>
        <input id="arcade-self-genre" name="genre" class="c-arcade-form-input" type="text" />
        <label class="c-arcade-form-label" for="arcade-self-thumb">Thumbnail URL (optional)</label>
        <input id="arcade-self-thumb" name="thumbnail" class="c-arcade-form-input" type="url" />
        <label class="c-arcade-form-label" for="arcade-self-game-url">Game URL (optional)</label>
        <input id="arcade-self-game-url" name="gameUrl" class="c-arcade-form-input" type="url" />
        <button class="c-arcade-form-submit" type="submit">Save to arcade</button>
        <p class="c-creator-arcade-status" aria-live="polite"></p>
      </form>
    </section>
  `
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

function buildCardInner(
	entry: { title: string; genre: string; author: string; thumbnail: string; gameUrl?: string | null },
	index: number,
  likeOpts:
    | {
        mode: 'demo'
        count: number
        demoTitle: string
      }
    | {
        mode: 'upvote'
        count: number
        liked: boolean
        disabled: boolean
        titleAttr: string
        puzzleId: string
      }
): string {
  const fill = ARCADE_PASTEL_COLORS[index % ARCADE_PASTEL_COLORS.length]
  const safeUrl = entry.gameUrl?.trim()
  const safeTitle = escapeHtml(entry.title)
  const thumbMarkup = safeUrl
    ? `<a class="c-arcade-thumb-link" href="${escapeAttr(safeUrl)}" target="_self" rel="noopener noreferrer"><img class="c-arcade-thumb" src="${escapeAttr(entry.thumbnail)}" alt="${escapeAttr(entry.title)} thumbnail" /></a>`
    : `<img class="c-arcade-thumb" src="${escapeAttr(entry.thumbnail)}" alt="${escapeAttr(entry.title)} thumbnail" />`

	let likeBlock: string
	if (likeOpts.mode === 'demo') {
		likeBlock = `<span class="c-like-demo-pill" role="text" title="${escapeAttr(likeOpts.demoTitle)}">
              <span class="c-like-icon">${icon(15, false)}</span>
              <span class="c-like-count">${likeOpts.count}</span>
            </span>`
	} else {
		const likedClass = likeOpts.liked ? ' is-liked' : ''
		const likedStr = likeOpts.liked ? 'true' : 'false'
		const pressedStr = likeOpts.liked ? 'true' : 'false'
		const disabledAttr = likeOpts.disabled ? ' disabled' : ''
		likeBlock = `<button class="c-like-btn${likedClass}" type="button" data-upvote-api="1" data-puzzle-id="${escapeAttr(likeOpts.puzzleId)}" data-liked="${likedStr}" data-base-count="${likeOpts.count}" aria-pressed="${pressedStr}" aria-label="${escapeAttr(likeOpts.titleAttr)}" title="${escapeAttr(likeOpts.titleAttr)}"${disabledAttr}>
              <span class="c-like-icon">${icon(15, likeOpts.liked)}</span>
              <span class="c-like-count">${likeOpts.count}</span>
            </button>`
	}

  return `
    <div class="c-arcade-stack" style="z-index:${50 - index}" data-card-index="${index}">
      <article class="c-arcade-piece c-arcade-piece-top">
        ${puzzleEl(fill, { top: 'flat', right: 'flat', bottom: 'tab', left: 'flat' })}
        <div class="c-arcade-piece-inner c-arcade-piece-inner-top">
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

function buildDemoCard(entry: ExampleCard, index: number): string {
  return buildCardInner(entry, index, {
    mode: 'demo',
    count: entry.likes,
    demoTitle: 'Demo placeholder — only registered puzzles accept upvotes, and you must be signed in.',
  })
}

function buildRegisteredCard(entry: ArcadeApiPuzzle, index: number, auth: AuthMeResponse | null): string {
  const userId = auth?.authenticated ? auth.user?.id : undefined
  const ownPuzzle = Boolean(userId && userId === entry.creatorUserId)
  const signedIn = Boolean(auth?.authenticated)
  const liked = entry.likedByMe
  let titleAttr = `Upvote ${entry.title}`
  if (!signedIn) {
    titleAttr = 'Sign in to upvote (each unique upvote gives the creator 2 puzzle pieces)'
  } else if (ownPuzzle) {
    titleAttr = 'You cannot upvote your own puzzle'
  } else if (liked) {
    titleAttr = 'You already upvoted this puzzle'
  } else {
    titleAttr = `Upvote ${entry.title} (creator earns 2 puzzle pieces)`
  }
  const disabled = !signedIn || ownPuzzle || liked
  return buildCardInner(
    {
      title: entry.title,
      genre: entry.genre,
      author: entry.authorLabel,
      thumbnail: entry.thumbnail,
      gameUrl: entry.gameUrl,
    },
    index,
    {
      mode: 'upvote',
      count: entry.likeCount,
      liked,
      disabled,
      titleAttr,
      puzzleId: entry.puzzleId,
    }
  )
}

function buildGalleryCards(apiPuzzles: ArcadeApiPuzzle[], auth: AuthMeResponse | null): string {
  const registered = apiPuzzles.map((p, i) => buildRegisteredCard(p, i, auth)).join('')
  const demos = EXAMPLES.map((e, j) => buildDemoCard(e, j + apiPuzzles.length)).join('')
  return registered + demos
}

function buildArcadePage(auth: AuthMeResponse | null, apiPuzzles: ArcadeApiPuzzle[]): HTMLElement {
  const user = auth?.authenticated ? auth.user : undefined
  const piecePanel = user ? buildPiecePanel(user) : ''
  const creatorFormPanel = user ? buildCreatorPuzzlePanel() : ''

  return htmlToElement(`
<section class="c-arcade-gallery-page">
  <div class="c-arcade-gallery-inner">
    <header class="c-arcade-gallery-head">
      <h1 class="c-arcade-gallery-title c-page-title">Arcade Gallery</h1>
      <p class="c-arcade-gallery-subtitle c-page-chip">Registered puzzles award their creator 2 puzzle pieces per unique upvote. Upvoting requires a signed-in Hack Club account.</p>
      <p class="c-arcade-upvote-status" aria-live="polite"></p>
      <a href="/" class="c-arcade-back-link">Back to Home</a>
    </header>
    ${piecePanel}
    ${creatorFormPanel}
    <div class="c-arcade-gallery-grid">
      ${buildGalleryCards(apiPuzzles, auth)}
    </div>
  </div>
</section>
`)
}

type UpvoteOkResponse = { success?: boolean; likeCount?: number; newUpvote?: boolean }

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
        const likeCount = Number(payload.likeCount ?? button.dataset.baseCount ?? '0')
        const countEl = button.querySelector<HTMLElement>('.c-like-count')
        const iconWrap = button.querySelector<HTMLElement>('.c-like-icon')
        button.dataset.baseCount = String(likeCount)
        button.dataset.liked = 'true'
        button.setAttribute('aria-pressed', 'true')
        button.classList.add('is-liked')
        if (countEl) countEl.textContent = String(likeCount)
        if (iconWrap) iconWrap.innerHTML = icon(15, true)
        button.setAttribute('aria-label', 'You already upvoted this puzzle')
        button.title = 'You already upvoted this puzzle'
      } catch (error) {
        if (upvoteStatus) {
          setStatusMessage(upvoteStatus, error instanceof Error ? error.message : 'Upvote failed', 'error')
        }
        button.disabled = false
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

async function refreshArcadeGallery(root: HTMLElement): Promise<void> {
  const [auth, puzzles] = await Promise.all([fetchAuthState(), fetchArcadePuzzles()])
  mountArcade(root, auth, puzzles)
}

function setupCreatorArcadeForm(root: HTMLElement, auth: AuthMeResponse | null): void {
  if (!auth?.authenticated) return

  const form = root.querySelector<HTMLFormElement>('.c-creator-arcade-form')
  const status = root.querySelector<HTMLElement>('.c-creator-arcade-status')
  if (!form || !status) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    const puzzleId = String(formData.get('puzzleId') || '').trim()
    const title = String(formData.get('title') || '').trim()
    const genre = String(formData.get('genre') || '').trim()
    const thumbnail = String(formData.get('thumbnail') || '').trim()
    const gameUrl = String(formData.get('gameUrl') || '').trim()

    if (!puzzleId || !title) {
      setStatusMessage(status, 'Puzzle ID and title are required.', 'error')
      return
    }

    const submitButton = form.querySelector<HTMLButtonElement>('.c-arcade-form-submit')
    if (submitButton) submitButton.disabled = true
    setStatusMessage(status, 'Saving…', 'pending')

    try {
      await fetchJson<ApiErrorResponse>('/arcade/puzzles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId,
          title,
          genre: genre || undefined,
          thumbnail: thumbnail || undefined,
          gameUrl: gameUrl || undefined,
        }),
      })

      setStatusMessage(status, `Your puzzle “${title}” is listed in the arcade.`, 'success')
      form.reset()
      await refreshArcadeGallery(root)
    } catch (error) {
      setStatusMessage(status, error instanceof Error ? error.message : 'Failed to save', 'error')
    } finally {
      if (submitButton) submitButton.disabled = false
    }
  })
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

function mountArcade(root: HTMLElement, auth: AuthMeResponse | null, apiPuzzles: ArcadeApiPuzzle[]): void {
  root.innerHTML = ''
  root.appendChild(buildArcadePage(auth, apiPuzzles))
  setupLikes(root)
  setupPieceTestControls(root, auth)
  setupCreatorArcadeForm(root, auth)
}

async function fetchArcadePuzzles(): Promise<ArcadeApiPuzzle[]> {
  try {
    const data = await fetchJson<{ puzzles?: ArcadeApiPuzzle[] }>('/arcade/puzzles', { credentials: 'include' })
    return Array.isArray(data.puzzles) ? data.puzzles : []
  } catch {
    return []
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
  mountArcade(root, null, [])
  const hydrate = async (): Promise<void> => {
    const [auth, puzzles] = await Promise.all([fetchAuthState(), fetchArcadePuzzles()])
    mountArcade(root, auth, puzzles)
  }
  void hydrate()
}