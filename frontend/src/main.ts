import './style.css'
import { initJigsaw } from './jigsaw'
import { initArcade } from './arcade'
import { initDocs } from './docs'
import { initShop } from './shop'
import { buildSiteHeader } from './header'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = ''
const header = buildSiteHeader()
const pageRoot = document.createElement('div')
pageRoot.className = 'j-site-page-root'

app.appendChild(header)
app.appendChild(pageRoot)

if (window.location.pathname === '/arcade') {
	initArcade(pageRoot)
} else if (window.location.pathname === '/shop') {
	initShop(pageRoot)
} else if (window.location.pathname.startsWith('/docs')) {
	initDocs(pageRoot)
} else {
	initJigsaw(pageRoot)
}
