import 'dotenv/config'
import { PORT } from './config.js'
import { createApp } from './app.js'
import { getPieceStorageBackend } from './piece-store.js'

const app = createApp()

app.listen(PORT, () => {
	console.log(`[pieces] using storage backend: ${getPieceStorageBackend()}`)
	console.log(`Jigsaw backend listening on http://localhost:${PORT}`)
})
