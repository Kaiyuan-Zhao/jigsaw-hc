import 'dotenv/config'
import { PORT } from './config.js'
import { createApp, startBackgroundCleanup } from './app.js'
import { getPieceDbPath } from './piece-store.js'

const app = createApp()
startBackgroundCleanup()

app.listen(PORT, () => {
	console.log(`[pieces] using sqlite db at ${getPieceDbPath()}`)
	console.log(`Jigsaw backend listening on http://localhost:${PORT}`)
})
