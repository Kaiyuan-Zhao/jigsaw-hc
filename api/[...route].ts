import { createApp } from '../backend/src/app.js'

const app = createApp()

export default function handler(req: any, res: any) {
	req.url = (req.url || '').replace(/^\/api/, '') || '/'
	return app(req, res)
}