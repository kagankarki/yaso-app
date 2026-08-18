import { icon } from '../lib/icons.js'
import {
  $, esc, safeUrl, tl, toast, truncate, loadingBlock, emptyBlock,
  confirmDialog, delegate,
} from '../lib/ui.js'
import {
  db, collection, doc, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, PATHS,
} from '../lib/firebase.js'

const SCRAPER = (import.meta.env.VITE_SCRAPER_URL || 'http://localhost:3001').replace(/\/$/, '')

export function render() {
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-8">
      <p class="now-showing mb-3">Fragman panosu</p>
      <h2 class="text-[1.5rem] md:text-[2.1rem] mb-3">Alışveriş takipçim</h2>
      <p class="text-muted text-[.94rem] mb-5 max-w-[56ch]">
        Ürün linkini yapıştır; fiyatını kaydedelim, düştüğünde burada görürsün.
      </p>
      <form id="wish-form" class="flex flex-col sm:flex-row gap-2.5 max-w-3xl">
        <label class="sr-only" for="wish-url">Ürün linki</label>
        <input id="wish-url" class="input" type="url" inputmode="url"
               placeholder="https://… ürün linkini yapıştır" required />
        <button class="btn btn-primary shrink-0" type="submit" id="wish-add">${icon('plus')}Takibe al</button>
      </form>
      <p class="label mt-3">Not: Fiyat okuma için <code>npm run server</code> ile bot sunucusu açık olmalı.</p>
    </div>
  </section>

  <section class="grid grid-cols-2 sm:grid-cols-4 gap-4" id="wish-stats"></section>

  <section id="wish-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"></section>`
}

function storeBadge(store = '') {
  const s = store.toLowerCase()
  let color = 'var(--primary)'
  if (s.includes('trendyol')) color = '#F27A1A'
  else if (s.includes('amazon')) color = '#FF9900'
  else if (s.includes('hepsiburada')) color = '#FF6000'
  return `<span class="badge absolute top-3 left-3" style="background:rgba(0,0,0,.72);color:${color};border-color:${color}">${esc(store || 'Mağaza')}</span>`
}

function card(id, d) {
  const discounted = d.currentPrice && d.initialPrice && d.currentPrice < d.initialPrice
  const drop = discounted ? Math.round((1 - d.currentPrice / d.initialPrice) * 100) : 0
  const img = safeUrl(d.image)
  const url = safeUrl(d.url)
  return `
  <article class="card overflow-hidden flex flex-col" data-card="${esc(id)}">
    <div class="relative aspect-[4/3] bg-surface-2">
      ${img
        ? `<img src="${img}" alt="${esc(d.title || 'Ürün')}" class="w-full h-full object-cover" loading="lazy">`
        : `<div class="w-full h-full grid place-items-center text-faint">${icon('image', 'ico-lg')}</div>`}
      ${storeBadge(d.store)}
      ${discounted ? `<span class="badge badge-ok absolute top-3 right-3">%${drop} düştü</span>` : ''}
    </div>
    <div class="p-5 flex flex-col gap-3 flex-1">
      <h3 class="text-[1rem] leading-snug" title="${esc(d.title || '')}">${esc(truncate(d.title || 'Ürün', 54))}</h3>
      <div class="grid grid-cols-2 gap-2 ticket-stub" style="border-top:1px dashed var(--border);padding-top:12px;margin-top:0">
        <div>
          <span class="label block">İlk kayıt</span>
          <span class="numeric block text-[1rem] mt-1 text-muted">
            ${d.initialPrice ? esc(tl(d.initialPrice)) : esc(d.rawPriceText || '—')}
          </span>
        </div>
        <div>
          <span class="label block">Güncel</span>
          <span class="numeric block text-[1.15rem] mt-1" style="color:${discounted ? 'var(--ok)' : 'var(--text)'}">
            ${d.currentPrice ? esc(tl(d.currentPrice)) : esc(d.rawPriceText || '—')}
          </span>
        </div>
      </div>
      <div class="flex gap-2 mt-auto">
        ${url ? `<a href="${url}" target="_blank" rel="noopener" class="btn btn-quiet btn-sm flex-1 no-underline">${icon('external', 'ico-sm')}Ürüne git</a>` : ''}
        <button class="btn btn-danger btn-sm btn-icon" data-remove="${esc(id)}" aria-label="Takipten çıkar">${icon('trash', 'ico-sm')}</button>
      </div>
    </div>
  </article>`
}

export function mount(root) {
  const grid = $('#wish-grid', root)
  const stats = $('#wish-stats', root)
  const form = $('#wish-form', root)
  const urlInput = $('#wish-url', root)
  const addBtn = $('#wish-add', root)

  grid.innerHTML = loadingBlock('Liste getiriliyor…')

  const ref = collection(db, ...PATHS.wishlistItems)

  const unsub = onSnapshot(
    query(ref, orderBy('createdAt', 'desc')),
    (snap) => {
      const items = snap.docs
      const discounted = items.filter((d) => {
        const v = d.data()
        return v.currentPrice && v.initialPrice && v.currentPrice < v.initialPrice
      })
      const total = items.reduce((sum, d) => sum + (d.data().currentPrice || 0), 0)
      const saved = discounted.reduce((sum, d) => {
        const v = d.data()
        return sum + (v.initialPrice - v.currentPrice)
      }, 0)

      stats.innerHTML = [
        ['Takipte', items.length, 'var(--text)'],
        ['İndirimde', discounted.length, 'var(--ok)'],
        ['Sepet toplamı', total ? tl(total) : '—', 'var(--text)'],
        ['Kazanç', saved ? tl(saved) : '—', 'var(--ok)'],
      ]
        .map(
          ([label, value, color]) => `
          <div class="ticket px-3 py-4">
            <strong class="numeric block text-[1.3rem] leading-none" style="color:${color}">${esc(String(value))}</strong>
            <span class="label block mt-1.5" style="font-size:.58rem">${esc(label)}</span>
          </div>`
        )
        .join('')

      grid.innerHTML = items.length
        ? items.map((d) => card(d.id, d.data())).join('')
        : emptyBlock({
            iconName: 'cart',
            title: 'Takip listen boş',
            subtitle: 'Yukarıya bir ürün linki yapıştırarak fiyat takibine başlayabilirsin.',
          })
    },
    (err) => { grid.innerHTML = emptyBlock({ iconName: 'warning', title: 'Liste okunamadı', subtitle: err.message }) }
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const url = urlInput.value.trim()
    if (!url) return

    const original = addBtn.innerHTML
    addBtn.disabled = true
    addBtn.innerHTML = `${icon('hourglass')}Analiz ediliyor…`

    try {
      const res = await fetch(`${SCRAPER}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Bot sunucusuna ulaşılamadı.')
      const d = await res.json()

      await addDoc(ref, {
        url: d.url,
        title: d.title,
        image: d.image,
        store: d.store,
        currentPrice: d.currentPrice,
        initialPrice: d.currentPrice,
        rawPriceText: d.rawPriceText,
        createdAt: serverTimestamp(),
      })

      urlInput.value = ''
      toast(`"${truncate(d.title, 34)}" takibe alındı.`, '🛒')
    } catch (err) {
      toast(`${err.message} Bot sunucusu için: npm run server`, '⚠️', 8000)
    } finally {
      addBtn.disabled = false
      addBtn.innerHTML = original
    }
  })

  delegate(grid, '[data-remove]', 'click', async (e, btn) => {
    const id = btn.dataset.remove
    const ok = await confirmDialog({
      title: 'Takipten çıkarılsın mı?',
      message: 'Bu ürün alışveriş takip listenden silinecek.',
      confirmText: 'Sil',
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, ...PATHS.wishlistItems, id))
      toast('Ürün listeden çıkarıldı.', '🗑️')
    } catch {
      toast('Silinemedi.', '⚠️')
    }
  })

  return () => unsub()
}
