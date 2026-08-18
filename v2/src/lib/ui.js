import { icon } from './icons.js'

/* ════════════════════ GÜVENLİK ════════════════════ */

/** Firestore'dan / kullanıcıdan gelen her metin innerHTML'e girmeden buradan geçer. */
export function esc(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Sadece http/https adreslerine izin verir (javascript: engellenir). */
export function safeUrl(value) {
  const raw = String(value || '').trim()
  if (/^https?:\/\//i.test(raw)) return esc(raw)
  if (/^data:image\//i.test(raw)) return esc(raw)
  return ''
}

/* ════════════════════ DOM YARDIMCILARI ════════════════════ */

export const $ = (sel, root = document) => root.querySelector(sel)
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel))

export function on(root, selector, event, handler) {
  $$(selector, root).forEach((el) => el.addEventListener(event, handler))
}

/** Olay delegasyonu — dinamik listelerde her yeniden çizimde yeniden bağlamayı önler. */
export function delegate(root, selector, event, handler) {
  root.addEventListener(event, (e) => {
    const target = e.target.closest(selector)
    if (target && root.contains(target)) handler(e, target)
  })
}

/* ════════════════════ TOAST ════════════════════ */

function toastStack() {
  let stack = document.getElementById('toast-stack')
  if (!stack) {
    stack = document.createElement('div')
    stack.id = 'toast-stack'
    stack.className = 'toast-stack'
    stack.setAttribute('role', 'status')
    stack.setAttribute('aria-live', 'polite')
    document.body.appendChild(stack)
  }
  return stack
}

export function toast(message, emoji = '🎬', duration = 4200) {
  const stack = toastStack()
  const el = document.createElement('div')
  el.className = 'toast'
  el.innerHTML = `<span class="toast-emoji">${esc(emoji)}</span><span>${esc(message)}</span>`
  stack.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s'
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    setTimeout(() => el.remove(), 320)
  }, duration)
  return el
}

/* ════════════════════ ONAY DIYALOĞU ════════════════════ */
/* Yerleşik confirm() yerine tema uyumlu modal. Promise<boolean> döner. */

export function confirmDialog({ title, message, confirmText = 'Evet, sil', danger = true }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay is-open'
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px" role="dialog" aria-modal="true">
        <div class="modal-header">
          <span style="color:var(--${danger ? 'danger' : 'primary'})">${icon(danger ? 'warning' : 'info')}</span>
          <h3 class="modal-title">${esc(title)}</h3>
        </div>
        <div class="modal-body"><p style="color:var(--muted);font-size:.94rem">${esc(message)}</p></div>
        <div class="modal-footer">
          <button class="btn btn-quiet" data-act="cancel">Vazgeç</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(confirmText)}</button>
        </div>
      </div>`
    document.body.appendChild(overlay)

    const done = (val) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(val) }
    const onKey = (e) => { if (e.key === 'Escape') done(false) }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return done(false)
      const btn = e.target.closest('[data-act]')
      if (!btn) return
      done(btn.dataset.act === 'ok')
    })
    document.addEventListener('keydown', onKey)
    overlay.querySelector('[data-act="ok"]').focus()
  })
}

/* ════════════════════ MODAL YÖNETİMİ ════════════════════ */

let lastFocused = null

export function openModal(el) {
  if (!el) return
  lastFocused = document.activeElement
  el.classList.add('is-open')
  document.body.style.overflow = 'hidden'
  const focusable = el.querySelector('input, textarea, select, button')
  if (focusable) setTimeout(() => focusable.focus(), 40)
}

export function closeModal(el) {
  if (!el) return
  el.classList.remove('is-open')
  document.body.style.overflow = ''
  if (lastFocused && lastFocused.focus) lastFocused.focus()
}

/** Overlay'e tıklama, [data-close] butonu ve Escape ile kapanmayı bağlar. */
export function wireModal(el) {
  if (!el || el.dataset.wired === '1') return
  el.dataset.wired = '1'
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) closeModal(el)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('is-open')) closeModal(el)
  })
}

/* ════════════════════ DURUM BLOKLARI ════════════════════ */

export function loadingBlock(text = 'Makara dönüyor…') {
  return `<div class="empty-state"><div class="reel"></div><p class="label">${esc(text)}</p></div>`
}

export function emptyBlock({ iconName = 'film', title, subtitle, actionHtml = '' }) {
  return `
    <div class="empty-state">
      <span style="color:var(--primary);opacity:.7">${icon(iconName, 'ico-lg')}</span>
      <h3 style="font-size:1.05rem;color:var(--text)">${esc(title)}</h3>
      ${subtitle ? `<p style="font-size:.9rem;max-width:44ch">${esc(subtitle)}</p>` : ''}
      ${actionHtml}
    </div>`
}

export function errorBlock(message) {
  return `
    <div class="empty-state" style="border-color:rgba(229,72,77,.4)">
      <span style="color:var(--danger)">${icon('warning', 'ico-lg')}</span>
      <h3 style="font-size:1.05rem;color:var(--text)">Bir aksaklık oldu</h3>
      <p style="font-size:.88rem;max-width:46ch">${esc(message)}</p>
    </div>`
}

/* ════════════════════ KALP PATLAMASI ════════════════════ */

export function heartBurst(count = 18) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const hearts = ['❤️', '💖', '💕', '🌸', '✨', '🥰', '💋']
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'heart-burst'
    el.textContent = hearts[Math.floor(Math.random() * hearts.length)]
    el.style.left = `${Math.random() * 80 + 10}vw`
    el.style.top = `${Math.random() * 35 + 45}vh`
    el.style.animationDelay = `${Math.random() * 0.35}s`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 2300)
  }
}

/* ════════════════════ GÖRSEL SIKIŞTIRMA ════════════════════ */

/** Dosyayı canvas ile küçültüp data URL döner. Firestore 1MB limiti için şart. */
export function resizeImage(file, maxDimension = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (event) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
}

/* ════════════════════ BİÇİMLENDİRME ════════════════════ */

export const tl = (amount) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount)

export function formatDate(value, withTime = true) {
  if (!value) return 'Az önce'
  try {
    const d = value?.toDate ? value.toDate() : new Date(value)
    const opts = { day: 'numeric', month: 'long', year: 'numeric' }
    if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit' }
    return d.toLocaleDateString('tr-TR', opts)
  } catch {
    return 'Az önce'
  }
}

export function longDate(date = new Date()) {
  return date.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function truncate(text, max) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s
}
