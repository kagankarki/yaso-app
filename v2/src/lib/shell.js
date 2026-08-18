/* ═══════════════════════════════════════════════════════════════
   ORTAK KABUK
   Daily / Love / Business üçü de bu dosyayı kullanır. Eskiden aynı
   navigasyon + tema + bildirim + mod geçişi kodu üç ayrı dosyada
   kopyalanmıştı; artık tek yerde.
   ═══════════════════════════════════════════════════════════════ */

import { icon } from './icons.js'
import { $, $$, esc, longDate, formatDate, openModal, closeModal, wireModal } from './ui.js'
import { createRouter } from './router.js'
import { db, collection, query, orderBy, onSnapshot, PATHS } from './firebase.js'

const THEME_KEY = 'yaso_theme'

export const MODES = {
  daily: { id: 'daily', label: 'Daily', href: 'index.html', iconName: 'grid' },
  love: { id: 'love', label: 'Love', href: 'love.html', iconName: 'heart' },
  business: { id: 'business', label: 'Business', href: 'business.html', iconName: 'briefcase' },
}

/* ─────────────────────────── ŞABLON ─────────────────────────── */

function navItemsHtml(nav, activeId) {
  return nav
    .map(
      (item) => `
      <a class="navlink" href="#/${esc(item.id)}" data-nav="${esc(item.id)}"
         ${item.id === activeId ? 'aria-current="page"' : ''}>
        ${icon(item.iconName)}<span>${esc(item.label)}</span>
      </a>`
    )
    .join('')
}

function shellHtml({ mode, nav, user }) {
  const others = Object.values(MODES).filter((m) => m.id !== mode.id)
  return `
  <div class="relative z-[1] flex min-h-screen">

    <!-- ══ KENAR ÇUBUĞU ══ -->
    <aside class="hidden md:flex w-64 shrink-0 flex-col gap-1 p-4 bg-surface border-r border-line">
      <a href="index.html" class="flex items-center gap-3 px-2 py-3 mb-2 no-underline text-ink">
        <span class="grid place-items-center w-10 h-10 rounded-chip bg-primary text-on-primary">
          ${icon('ticket')}
        </span>
        <span class="leading-tight">
          <span class="block text-[1.1rem] display">SmartYasemin</span>
          <span class="label" style="font-size:.58rem">${esc(mode.label)}</span>
        </span>
      </a>

      <p class="label px-3 pt-1 pb-1.5">Program</p>
      <nav id="sidebar-nav" class="flex flex-col gap-1">${navItemsHtml(nav, nav[0].id)}</nav>

      <div class="mt-auto flex flex-col gap-3 pt-4">
        <div class="card-flat flex items-center gap-3 p-3">
          <span class="grid place-items-center w-9 h-9 rounded-full bg-primary text-on-primary font-bold">
            ${esc(user.initial)}
          </span>
          <span class="min-w-0 leading-tight">
            <span class="block font-semibold text-[.9rem] truncate">${esc(user.name)}</span>
            <span class="block text-[.74rem] text-muted">${esc(user.role)}</span>
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          ${others
            .map(
              (m) => `<a class="chip justify-center no-underline" href="${m.href}">
                ${icon(m.iconName, 'ico-sm')}${esc(m.label)}</a>`
            )
            .join('')}
        </div>
      </div>
    </aside>

    <!-- ══ ANA ALAN ══ -->
    <div class="flex-1 min-w-0 flex flex-col">

      <header class="sticky top-0 z-40 flex items-center gap-3 px-4 md:px-7 py-3.5 border-b border-line"
              style="background:color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(14px)">
        <div class="min-w-0 flex-1">
          <h1 id="page-title" class="text-[1.15rem] sm:text-[1.35rem] md:text-[1.7rem] truncate">${esc(nav[0].label)}</h1>
          <p class="text-[.74rem] sm:text-[.78rem] text-muted mt-0.5 truncate">${esc(longDate())}</p>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <label class="hidden lg:flex items-center gap-2 h-11 px-4 rounded-full bg-surface border border-line text-muted">
            ${icon('search')}
            <input id="global-search" type="search" placeholder="Programda ara…"
                   class="bg-transparent border-0 outline-none text-[.88rem] w-40 text-ink placeholder:text-faint" />
          </label>

          <span id="battery-badge" class="chip hidden" title="Cihaz şarj durumu"></span>

          <button id="notif-btn" class="chip btn-icon relative" aria-label="Bildirimler">
            ${icon('bell')}
            <span id="notif-count"
                  class="absolute -top-1 -right-1 grid place-items-center w-5 h-5 rounded-full bg-primary text-on-primary text-[.62rem] font-bold">0</span>
          </button>

          <button id="theme-btn" class="chip btn-icon hidden sm:inline-flex" aria-label="Temayı değiştir">${icon('sun')}</button>

          <a href="#/ayarlar" class="chip btn-icon no-underline" aria-label="Ayarlar">${icon('settings')}</a>
        </div>
      </header>

      <main id="outlet" class="flex-1 p-4 md:p-7 pb-28 md:pb-10 flex flex-col gap-5"></main>

      <nav id="mobnav" class="mobnav md:hidden"></nav>
    </div>
  </div>

  <!-- ══ BİLDİRİMLER ══ -->
  <div class="modal-overlay" id="notif-modal">
    <div class="modal" style="max-width:460px" role="dialog" aria-modal="true" aria-label="Bildirimler">
      <div class="modal-header">
        <span style="color:var(--primary)">${icon('bell')}</span>
        <h3 class="modal-title">Bildirimler</h3>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>
      <div class="modal-body" id="notif-list"></div>
    </div>
  </div>

  <!-- ══ YASOAI ══ -->
  <button id="ai-fab" class="fixed right-5 bottom-24 md:bottom-6 z-50 grid place-items-center w-14 h-14 rounded-full bg-primary text-on-primary shadow-card border border-line"
          aria-label="YasoAI'yı aç">${icon('sparkle', 'ico-lg')}</button>
  `
}

/* ─────────────────────────── KURULUM ─────────────────────────── */

export function mountShell({ mode, nav, user, routes, defaultRoute }) {
  document.documentElement.dataset.mode = mode.id
  document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || 'dark'

  const root = document.getElementById('app')
  root.innerHTML = shellHtml({ mode, nav, user })

  const outlet = $('#outlet')
  const titleEl = $('#page-title')

  /* — mobil alt navigasyon: en fazla 5 öğe (UX kuralı) — */
  const mobItems = nav.slice(0, 5)
  $('#mobnav').innerHTML = mobItems
    .map(
      (item) => `<button data-nav="${esc(item.id)}" ${item.id === nav[0].id ? 'aria-current="page"' : ''}>
        ${icon(item.iconName)}<span>${esc(item.short || item.label)}</span></button>`
    )
    .join('')

  /* — router — */
  const router = createRouter({
    routes,
    outlet,
    defaultRoute,
    onNavigate(route, id) {
      titleEl.textContent = route.title
      document.title = `${route.title} · SmartYasemin`
      $$('[data-nav]').forEach((el) => {
        if (el.dataset.nav === id) el.setAttribute('aria-current', 'page')
        else el.removeAttribute('aria-current')
      })
    },
  })

  $$('#mobnav [data-nav]').forEach((btn) =>
    btn.addEventListener('click', () => router.go(btn.dataset.nav))
  )

  /* — tema — */
  const themeBtn = $('#theme-btn')
  const paintTheme = () => {
    const dark = document.documentElement.dataset.theme !== 'light'
    themeBtn.innerHTML = icon(dark ? 'sun' : 'moon')
  }
  paintTheme()
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    localStorage.setItem(THEME_KEY, next)
    paintTheme()
  })

  /* — bildirimler (Firestore canlı) — */
  const notifModal = $('#notif-modal')
  wireModal(notifModal)
  $('#notif-btn').addEventListener('click', () => openModal(notifModal))
  watchNotifications()

  /* — pil rozeti — */
  initBatteryBadge()

  /* — YasoAI — */
  $('#ai-fab').addEventListener('click', async () => {
    const { openYasoAI } = await import('../features/yaso-ai.js')
    openYasoAI()
  })

  /* — sessiz konum kaydı (ayarlardan kapatılabilir) — */
  import('../features/tracker.js').then((m) => m.trackVisit()).catch(() => {})

  router.render()
  return router
}

/* ─────────────────────────── BİLDİRİMLER ─────────────────────────── */

function watchNotifications() {
  const list = $('#notif-list')
  const count = $('#notif-count')
  const q = query(collection(db, PATHS.notifications), orderBy('createdAt', 'desc'))

  onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.slice(0, 30)
      count.textContent = String(docs.length)
      count.style.display = docs.length ? 'grid' : 'none'

      if (!docs.length) {
        list.innerHTML = `<p class="text-muted text-[.9rem] text-center py-6">Şu an gösterimde bildirim yok.</p>`
        return
      }
      list.innerHTML = docs
        .map((d) => {
          const n = d.data()
          return `
          <div class="card-inset p-3.5 border-l-2" style="border-left-color:var(--primary)">
            <div class="flex items-center justify-between gap-3">
              <strong class="text-[.93rem]">${esc(n.title || 'Bildirim')}</strong>
              <span class="label" style="font-size:.6rem">${esc(formatDate(n.createdAt))}</span>
            </div>
            <p class="text-[.86rem] text-muted mt-1">${esc(n.message || '')}</p>
          </div>`
        })
        .join('')
    },
    (err) => {
      console.warn('[bildirim]', err)
      list.innerHTML = `<p class="text-muted text-[.9rem] text-center py-6">Bildirimlere ulaşılamadı.</p>`
    }
  )
}

/* ─────────────────────────── PİL ─────────────────────────── */

async function initBatteryBadge() {
  if (!('getBattery' in navigator)) return
  try {
    const battery = await navigator.getBattery()
    const badge = $('#battery-badge')
    const paint = () => {
      const level = Math.round(battery.level * 100)
      // `hidden` kalıyor: küçük ekranda başlık için yer açmak adına gizli,
      // sm ve üzerinde `sm:inline-flex` devralıyor.
      badge.classList.add('sm:inline-flex')
      badge.style.color = battery.charging ? 'var(--ok)' : level <= 20 ? 'var(--danger)' : 'var(--muted)'
      badge.innerHTML = `${icon(battery.charging ? 'bolt' : 'battery', 'ico-sm')}<b class="numeric text-[.75rem]">${level}</b>`
      badge.title = `Şarj: %${level}${battery.charging ? ' (şarj oluyor)' : ''}`
    }
    paint()
    battery.addEventListener('levelchange', paint)
    battery.addEventListener('chargingchange', paint)

    if (!battery.charging && Math.round(battery.level * 100) <= 20) {
      const { toast } = await import('./ui.js')
      toast('Şarjın azaldı, telefonu şarja takmayı unutma.', '🔌', 8000)
    }
  } catch {
    /* Battery API yoksa sessizce geç */
  }
}

export { closeModal }
