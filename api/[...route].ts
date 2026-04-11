let appPromise: Promise<(req: any, res: any) => unknown> | null = null

async function getApp() {
	if (!appPromise) {
		appPromise = import('../backend/src/app')
			.then((mod) => mod.createApp())
			.catch(async () => {
				const fallback = await import('../backend/src/app.js')
				return fallback.createApp()
			})
	}
	return appPromise
}

export default function handler(req: any, res: any) {
	return getApp().then((app) => {
		const rawUrl = String(req.url || '/')
		let normalizedUrl = rawUrl
		if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
			const parsed = new URL(rawUrl)
			normalizedUrl = `${parsed.pathname}${parsed.search}`
		}
		req.url = normalizedUrl.replace(/^\/api(?=\/|$)/, '') || '/'
		return app(req, res)
	})
}