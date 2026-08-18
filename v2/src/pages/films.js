import { icon } from '../lib/icons.js'
import {
  $, $$, esc, safeUrl, toast, truncate, openModal, closeModal, wireModal,
  loadingBlock, emptyBlock, errorBlock, confirmDialog, delegate,
} from '../lib/ui.js'
import { generate } from '../lib/gemini.js'
import {
  db, collection, doc, addDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, PATHS,
} from '../lib/firebase.js'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY || 'fe3936da79d2f983d2d8238bf61bb29b'
const TMDB = 'https://api.themoviedb.org/3'
const POSTER = 'https://image.tmdb.org/t/p/w500'

const GENRES = {
  28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi', 80: 'Suç', 99: 'Belgesel',
  18: 'Dram', 10751: 'Aile', 14: 'Fantastik', 36: 'Tarih', 27: 'Korku', 10402: 'Müzik',
  9648: 'Gizem', 10749: 'Romantik', 878: 'Bilim Kurgu', 10770: 'TV Filmi', 53: 'Gerilim',
  10752: 'Savaş', 37: 'Vahşi Batı',
}

const FILTERS = {
  genre: [
    ['all', 'Fark etmez'], ['878', 'Bilim Kurgu'], ['28', 'Aksiyon'], ['18', 'Dram'],
    ['35', 'Komedi'], ['27', 'Korku'], ['10749', 'Romantik'], ['53', 'Gerilim'], ['14', 'Fantastik'],
  ],
  rating: [
    ['0', 'Fark etmez'], ['6', '6.0 ve üzeri'], ['7', '7.0 ve üzeri'],
    ['8', '8.0 ve üzeri (süper)'], ['8.5', '8.5 ve üzeri (başyapıt)'],
  ],
  year: [
    ['all', 'Fark etmez'], ['2020', "2020'ler"], ['2010', "2010'lar"],
    ['2000', "2000'ler"], ['1990', "90'lar klasikleri"],
  ],
  sort: [
    ['popularity.desc', 'En popüler'], ['vote_average.desc', 'En yüksek puanlı'],
    ['primary_release_date.desc', 'En yeniler'],
  ],
}

const selectHtml = (id, label, options) => `
  <div class="field">
    <label class="field-label" for="${id}">${esc(label)}</label>
    <select class="select" id="${id}">
      ${options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}
    </select>
  </div>`

export function render() {
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-8">
      <p class="now-showing mb-3">Bu haftanın programı</p>
      <h2 class="text-[1.5rem] md:text-[2.1rem] mb-3">Hikâyeni anlat, filmi bulalım</h2>
      <p class="text-muted text-[.94rem] mb-5 max-w-[54ch]">
        Hatırladığın bir sahneyi ya da konuyu yaz — yapay zekâ adını çıkarsın, afişi buraya gelsin.
      </p>
      <form id="ai-film-form" class="flex flex-col sm:flex-row gap-2.5 max-w-2xl">
        <input id="ai-film-input" class="input" placeholder="Örn: rüyaların içine girip sır çalan bir hırsız…" />
        <button class="btn btn-primary shrink-0" type="submit">${icon('sparkle')}Hikâyeden bul</button>
      </form>
    </div>
  </section>

  <section class="flex flex-wrap items-center gap-3">
    <div class="flex gap-2" role="tablist">
      <button class="chip is-active" data-tab="oneriler" role="tab" aria-selected="true">${icon('film', 'ico-sm')}Vizyon</button>
      <button class="chip" data-tab="izlediklerim" role="tab" aria-selected="false">${icon('bookmark', 'ico-sm')}Arşivim</button>
    </div>
    <button class="btn btn-quiet btn-sm ml-auto" id="open-filters">${icon('settings', 'ico-sm')}Kriterleri belirle</button>
  </section>

  <section id="film-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"></section>
  <section id="watched-grid" class="hidden grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"></section>

  <div class="modal-overlay" id="filter-modal">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Film kriterleri">
      <div class="modal-header">
        <span style="color:var(--primary)">${icon('ticket')}</span>
        <h3 class="modal-title">Seans kriterleri</h3>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>
      <div class="modal-body grid sm:grid-cols-2 gap-4">
        ${selectHtml('f-genre', 'Tür', FILTERS.genre)}
        ${selectHtml('f-rating', 'Puan', FILTERS.rating)}
        ${selectHtml('f-year', 'Dönem', FILTERS.year)}
        ${selectHtml('f-sort', 'Sıralama', FILTERS.sort)}
      </div>
      <div class="modal-footer">
        <button class="btn btn-quiet" data-close>Vazgeç</button>
        <button class="btn btn-primary" id="apply-filters">${icon('play')}Listeyi getir</button>
      </div>
    </div>
  </div>`
}

/* ─────────────────────────── KART ─────────────────────────── */

function movieCard(m, { saved = false } = {}) {
  const poster = safeUrl(m.posterUrl) || 'about:blank'
  const trailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.title} fragman`)}`
  return `
  <article class="card overflow-hidden flex flex-col" data-card="${esc(m.docId || m.id)}">
    <div class="film-strip relative aspect-[2/3] bg-surface-2">
      ${poster !== 'about:blank'
        ? `<img src="${poster}" alt="${esc(m.title)} afişi" class="w-full h-full object-cover" loading="lazy">`
        : `<div class="w-full h-full grid place-items-center text-faint">${icon('film', 'ico-lg')}</div>`}
      <span class="badge absolute top-3 right-3" style="background:rgba(0,0,0,.72)">
        ${icon('star', 'ico-sm')}${esc(m.rating)}
      </span>
    </div>
    <div class="p-5 flex flex-col gap-2 flex-1">
      <h3 class="text-[1.02rem] leading-snug" title="${esc(m.title)}">${esc(truncate(m.title, 42))}</h3>
      <p class="label">${esc(m.genreNames || 'Çeşitli')}</p>
      <p class="text-[.86rem] text-muted leading-relaxed flex-1">${esc(m.plot)}</p>
      <div class="flex gap-2 mt-2">
        <a href="${trailer}" target="_blank" rel="noopener" class="btn btn-quiet btn-sm flex-1 no-underline">
          ${icon('play', 'ico-sm')}Fragman
        </a>
        ${saved
          ? `<button class="btn btn-danger btn-sm btn-icon" data-remove="${esc(m.docId)}" aria-label="Arşivden çıkar">${icon('trash', 'ico-sm')}</button>`
          : `<button class="btn btn-primary btn-sm flex-1" data-save='${esc(JSON.stringify({
              id: m.id, title: m.title, posterUrl: m.posterUrl, rating: m.rating,
              genreNames: m.genreNames, plot: m.plot,
            }))}'>${icon('bookmark', 'ico-sm')}Arşivle</button>`}
      </div>
    </div>
  </article>`
}

const normalize = (m) => ({
  id: m.id,
  title: m.title || m.name || 'İsimsiz',
  posterUrl: m.poster_path ? `${POSTER}${m.poster_path}` : '',
  rating: (m.vote_average ?? 0).toFixed(1),
  genreNames: (m.genre_ids || []).map((g) => GENRES[g]).filter(Boolean).slice(0, 2).join(', '),
  plot: m.overview ? truncate(m.overview, 140) : 'Bu film için henüz Türkçe bir özet bulunmuyor.',
})

/* ─────────────────────────── MOUNT ─────────────────────────── */

export function mount(root) {
  const grid = $('#film-grid', root)
  const watched = $('#watched-grid', root)
  const filterModal = $('#filter-modal', root)
  wireModal(filterModal)

  $('#open-filters', root).addEventListener('click', () => openModal(filterModal))

  /* — sekmeler — */
  $$('[data-tab]', root).forEach((tab) =>
    tab.addEventListener('click', () => {
      const isOneriler = tab.dataset.tab === 'oneriler'
      $$('[data-tab]', root).forEach((t) => {
        t.classList.toggle('is-active', t === tab)
        t.setAttribute('aria-selected', String(t === tab))
      })
      grid.classList.toggle('hidden', !isOneriler)
      grid.classList.toggle('grid', isOneriler)
      watched.classList.toggle('hidden', isOneriler)
      watched.classList.toggle('grid', !isOneriler)
      if (!isOneriler) loadWatched()
    })
  )

  /* — kriterler — */
  $('#apply-filters', root).addEventListener('click', () => {
    closeModal(filterModal)
    discover({
      genre: $('#f-genre', root).value,
      minRating: parseFloat($('#f-rating', root).value),
      year: $('#f-year', root).value,
      sort: $('#f-sort', root).value,
    })
  })

  /* — yapay zekâ araması — */
  $('#ai-film-form', root).addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = $('#ai-film-input', root).value.trim()
    if (text.length < 3) { toast('Biraz daha detay yazar mısın?', '✍️'); return }
    await searchByStory(text)
  })

  /* — kaydet / sil (delegasyon) — */
  delegate(grid, '[data-save]', 'click', async (e, btn) => {
    let payload
    try { payload = JSON.parse(btn.dataset.save) } catch { return }
    btn.disabled = true
    btn.innerHTML = `${icon('hourglass', 'ico-sm')}Arşivleniyor…`
    try {
      await addDoc(collection(db, ...PATHS.watchedMovies), {
        movieId: payload.id,
        title: payload.title,
        posterUrl: payload.posterUrl,
        rating: payload.rating,
        genreNames: payload.genreNames,
        plot: payload.plot,
        savedAt: serverTimestamp(),
      })
      btn.innerHTML = `${icon('checkCircle', 'ico-sm')}Arşivde`
      btn.style.background = 'var(--ok)'
      btn.style.color = '#0B1F14'
      toast(`"${payload.title}" arşive eklendi.`, '🎟️')
    } catch (err) {
      console.error(err)
      btn.disabled = false
      btn.innerHTML = `${icon('warning', 'ico-sm')}Olmadı`
      toast('Arşive eklenemedi.', '⚠️')
    }
  })

  delegate(watched, '[data-remove]', 'click', async (e, btn) => {
    const id = btn.dataset.remove
    const ok = await confirmDialog({
      title: 'Arşivden çıkarılsın mı?',
      message: 'Bu film kayıtlı filmler listenden silinecek.',
      confirmText: 'Sil',
    })
    if (!ok) return
    const card = watched.querySelector(`[data-card="${CSS.escape(id)}"]`)
    if (card) card.style.opacity = '.45'
    try {
      await deleteDoc(doc(db, ...PATHS.watchedMovies, id))
      card?.remove()
      if (!watched.children.length) loadWatched()
    } catch {
      if (card) card.style.opacity = '1'
      toast('Silinemedi.', '⚠️')
    }
  })

  /* ── veri ── */

  async function discover({ genre = 'all', minRating = 0, year = 'all', sort = 'popularity.desc' } = {}) {
    grid.innerHTML = loadingBlock('TMDB arşivi taranıyor…')
    try {
      let url = `${TMDB}/discover/movie?api_key=${TMDB_KEY}&language=tr-TR&vote_count.gte=100&sort_by=${encodeURIComponent(sort)}`
      if (genre && genre !== 'all') url += `&with_genres=${encodeURIComponent(genre)}`
      if (minRating > 0) url += `&vote_average.gte=${minRating}`
      if (year && year !== 'all') {
        const start = parseInt(year, 10)
        url += `&primary_release_date.gte=${start}-01-01&primary_release_date.lte=${start + 9}-12-31`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('TMDB yanıt vermedi')
      const data = await res.json()
      const list = (data.results || []).slice(0, 9).map(normalize)
      grid.innerHTML = list.length
        ? list.map((m) => movieCard(m)).join('')
        : emptyBlock({ title: 'Bu kriterlere film yok', subtitle: 'Filtreleri biraz esneterek tekrar dene.' })
    } catch (err) {
      grid.innerHTML = errorBlock(err.message || 'Filmler yüklenemedi.')
    }
  }

  async function searchByStory(story) {
    grid.innerHTML = loadingBlock('Yapay zekâ hikâyeni çözüyor…')
    try {
      const names = await generate({
        prompt: `Sen bir sinema uzmanısın. Kullanıcı sana bir hikaye veya filmden bir sahne anlatacak. Sen sadece bu tarife uyan 1 veya en fazla 3 filmin adını aralarında virgül olacak şekilde yazacaksın. Sadece film isimleri yaz, başka hiçbir açıklama yapma. Orijinal veya Türkçe isimlerini yazabilirsin. Kullanıcının tarifi: "${story}"`,
        temperature: 0.4,
        maxTokens: 120,
      })

      const found = []
      for (const raw of names.split(',').map((n) => n.replace(/["\n\r*]/g, '').trim()).filter(Boolean).slice(0, 3)) {
        const res = await fetch(`${TMDB}/search/movie?api_key=${TMDB_KEY}&language=tr-TR&query=${encodeURIComponent(raw)}&page=1`)
        if (!res.ok) continue
        const data = await res.json()
        if (data.results?.length) found.push(data.results[0])
      }

      grid.innerHTML = found.length
        ? found.map((m) => movieCard(normalize(m))).join('')
        : emptyBlock({
            iconName: 'search',
            title: 'Eşleşen film bulamadık',
            subtitle: 'Biraz daha detay vererek tekrar dener misin?',
          })
    } catch (err) {
      grid.innerHTML = errorBlock(`Yapay zekâya ulaşılamadı. ${err.message || ''}`)
    }
  }

  async function loadWatched() {
    watched.innerHTML = loadingBlock('Arşiv açılıyor…')
    try {
      const snap = await getDocs(query(collection(db, ...PATHS.watchedMovies), orderBy('savedAt', 'desc')))
      if (snap.empty) {
        watched.innerHTML = emptyBlock({
          iconName: 'bookmark',
          title: 'Arşivin henüz boş',
          subtitle: 'Vizyon sekmesinden beğendiğin filmleri arşivleyebilirsin.',
        })
        return
      }
      watched.innerHTML = snap.docs
        .map((d) => movieCard({ ...d.data(), docId: d.id }, { saved: true }))
        .join('')
    } catch (err) {
      watched.innerHTML = errorBlock(err.message || 'Arşive ulaşılamadı.')
    }
  }

  discover()
  return () => {}
}
