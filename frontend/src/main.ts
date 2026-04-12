import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import '@fontsource/inter/latin-900.css'
import './styles/tokens.css'
import './styles/primitives.css'
import './styles/components.css'
import './styles/utilities.css'
import './style.css'
import { initJigsaw } from './jigsaw'
import { initArcade } from './arcade'
import { initShop } from './shop'
import { buildSiteHeader } from './header'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = ''
const header = buildSiteHeader()
const pageRoot = document.createElement('div')
pageRoot.className = 'c-site-page-root'

app.appendChild(header)
app.appendChild(pageRoot)

if (window.location.pathname === '/arcade') {
	initArcade(pageRoot)
} else if (window.location.pathname === '/shop') {
	initShop(pageRoot)
} else {
	initJigsaw(pageRoot)
}
