# Jigsaw Puzzle Reward SDK

Puzzle makers can integrate coin rewards with a few lines. The SDK uses an auth popup handshake so it works on third-party hosts without relying on third-party cookies.

## Copy-Paste Integration

```html
<script src="https://api.yourdomain.com/games/sdk.js" defer></script>
<button
	data-jigsaw-win
	data-puzzle-id="my-puzzle-v1"
	data-redirect-url="https://app.yourdomain.com/arcade"
	data-status-target="#reward-status"
>
	win
</button>
<p id="reward-status" aria-live="polite"></p>
```

## Attributes

- `data-jigsaw-win`: marks a button as a reward trigger.
- `data-puzzle-id` (required): stable unique ID for your puzzle/version.
- `data-redirect-url` (optional): where to send user after successful claim. Defaults to `<FRONTEND_URL>/arcade`.
- `data-status-target` (optional): CSS selector for status text element.

## Programmatic Mode

```html
<script src="https://api.yourdomain.com/games/sdk.js" defer></script>
<script>
	async function onPuzzleSolved() {
		await window.JigsawGames.claim({
			puzzleId: 'my-puzzle-v1',
			redirectUrl: 'https://app.yourdomain.com/arcade'
		})
	}
</script>
```

## Common Errors

- `Popup blocked. Please allow popups and try again.`: browser blocked the auth popup.
- `Auth popup timed out`: popup did not finish login/handshake in time.
- `Puzzle reward already claimed`: this user already claimed this puzzle ID.
- `Origin not allowed` or `Origin mismatch`: host domain is not allowlisted.
- `Invalid or expired token` or `Token already used`: token could not be redeemed.

## Backend Config

Add puzzle host domains to backend CORS allowlist:

```env
GAME_ALLOWED_ORIGINS=https://my-puzzle.example,https://another-puzzle.example
CLAIM_TOKEN_SECRET=replace_me_with_random_secret
CLAIM_TOKEN_TTL_SECONDS=180
```
