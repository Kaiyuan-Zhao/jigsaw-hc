import { createApp } from '../backend/src/app.js'

const app = createApp()

export default function handler(req: any, res: any) {
	const rawUrl = String(req.url || '/')
	let normalizedUrl = rawUrl

	if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
		const parsed = new URL(rawUrl)
		normalizedUrl = `${parsed.pathname}${parsed.search}`
	}

	req.url = normalizedUrl.replace(/^\/api(?=\/|$)/, '') || '/'
	return app(req, res)
}