import './style.css'
import { initJigsaw } from './jigsaw'
import { initArcade } from './arcade'
import { initDocs } from './docs'
import { buildSiteHeader } from './header'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = ''
const header = buildSiteHeader()
const pageRoot = document.createElement('div')
pageRoot.className = 'j-site-page-root'

app.appendChild(header)
app.appendChild(pageRoot)

const path = window.location.pathname.replace(/\/$/, '') || '/'

if (path.startsWith('/docs')) {
	document.documentElement.classList.add('j-docs-page')
	initDocs(pageRoot)
} else if (path === '/arcade') {
	initArcade(pageRoot)
} else {
	initJigsaw(pageRoot)
}
