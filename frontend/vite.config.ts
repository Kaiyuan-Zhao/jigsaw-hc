import { defineConfig } from 'vite'

const apiProxy = {
	'/api': {
		target: 'http://localhost:8787',
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/api/, '') || '/',
	},
} as const

export default defineConfig({
	server: {
		proxy: { ...apiProxy },
	},
	preview: {
		proxy: { ...apiProxy },
	},
})
