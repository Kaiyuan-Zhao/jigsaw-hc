export function htmlToElement<T extends HTMLElement = HTMLElement>(html: string): T {
	const container = document.createElement('div')
	container.innerHTML = html.trim()
	return container.firstElementChild as T
}
