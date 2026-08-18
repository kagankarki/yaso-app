/* ═══════════════════════════════════════════════════════════════
   HASH TABANLI ROUTER
   Eski sürümde sayfalar fetch('/x.html') ile çekiliyordu; derin
   bağlantı yoktu ve 404 riski vardı. Artık her sayfa bir JS modülü:
   deep-link çalışır, geri tuşu doğru davranır, hepsi tek bundle'da.
   ═══════════════════════════════════════════════════════════════ */

import { loadingBlock, errorBlock } from './ui.js'

export function createRouter({ routes, outlet, defaultRoute, onNavigate }) {
  let currentCleanup = null

  function parse() {
    const raw = location.hash.replace(/^#\/?/, '').split('?')[0]
    return raw || defaultRoute
  }

  async function render() {
    const id = parse()
    const route = routes[id] || routes[defaultRoute]

    if (typeof currentCleanup === 'function') {
      try { currentCleanup() } catch (e) { console.warn('cleanup:', e) }
      currentCleanup = null
    }

    outlet.innerHTML = loadingBlock('Makara takılıyor…')
    if (onNavigate) onNavigate(route, id)

    try {
      const mod = await route.load()
      outlet.innerHTML = mod.render ? mod.render() : ''
      outlet.scrollTop = 0
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
      if (mod.mount) currentCleanup = await mod.mount(outlet)
    } catch (err) {
      console.error('[router]', err)
      outlet.innerHTML = errorBlock(err?.message || 'Sayfa yüklenemedi.')
    }
  }

  function go(id) {
    if (parse() === id) return render()
    location.hash = `#/${id}`
  }

  window.addEventListener('hashchange', render)
  return { render, go, current: parse }
}
