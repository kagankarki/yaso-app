import { icon } from '../lib/icons.js'
import {
  $, $$, esc, safeUrl, toast, heartBurst, resizeImage, openModal, closeModal, wireModal,
  loadingBlock, emptyBlock, confirmDialog, delegate,
} from '../lib/ui.js'
import { generate } from '../lib/gemini.js'
import {
  db, collection, doc, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, PATHS,
} from '../lib/firebase.js'

const WEATHER = {
  ankara: { city: 'Ankara', degree: '22°', condition: 'Parçalı bulutlu', advice: '"Bugün Ankara\'da tatlı bir bahar havası var! İnce bir ceket, pamuklu bir bluz ve kot pantolon kombinlemek harika bir tercih olur mimarım ✨"' },
  istanbul: { city: 'İstanbul', degree: '19°', condition: 'Yağmurlu', advice: '"Aşkım İstanbul\'da yağmur ve hafif rüzgar var! Şık bir trençkot, botlar ve şemsiyeni yanına almayı sakın unutma ☔"' },
  izmir: { city: 'İzmir', degree: '27°', condition: 'Güneşli ve sıcak', advice: '"İzmir cıvıl cıvıl güneşli! İnce askılı bir bluz, şık bir etek veya keten pantolon harika yakışır sevgilim ☀️"' },
  eskisehir: { city: 'Eskişehir', degree: '15°', condition: 'Rüzgarlı ve serin', advice: '"Eskişehir bugün serin ve rüzgarlı! Şık bir hırka, ceket veya triko üst giymeni tavsiye ederim biriciğim 🍃"' },
}

const CATEGORIES = [
  ['all', 'Tümü'], ['top', 'Üst giyim'], ['bottom', 'Alt giyim'], ['shoes', 'Ayakkabı'], ['accessory', 'Aksesuar'],
]
const CAT_LABEL = { top: 'Üst giyim', bottom: 'Alt giyim', shoes: 'Ayakkabı', accessory: 'Aksesuar' }
const SEASONS = ['Bahar', 'Yaz', 'Sonbahar', 'Kış']
const STYLES = ['Şık', 'Casual', 'Spor', 'Klasik']
const SLOTS = [['top', 'Üst'], ['bottom', 'Alt'], ['shoes', 'Ayakkabı']]

export function render() {
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-8 flex flex-wrap items-end gap-5">
      <div class="min-w-0">
        <p class="now-showing mb-3">Kostüm departmanı</p>
        <h2 class="text-[1.5rem] md:text-[2.1rem] mb-2">Akıllı gardırop</h2>
        <p class="text-muted text-[.94rem] max-w-[52ch]">
          Kıyafetlerini ekle, hava durumuna göre yapay zekâ günün kombinini seçsin.
        </p>
      </div>
      <button class="btn btn-primary ml-auto" id="add-cloth">${icon('plus')}Kıyafet ekle</button>
    </div>
  </section>

  <section class="card p-6">
    <div class="flex flex-wrap items-center gap-4 mb-5">
      <h3 class="text-[1.1rem]">Hava durumu</h3>
      <label class="ml-auto flex items-center gap-2">
        <span class="label">Şehir</span>
        <select class="select w-auto" id="city">
          ${Object.entries(WEATHER).map(([k, v]) => `<option value="${k}">${esc(v.city)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="card-inset p-5 flex flex-wrap items-center gap-6">
      <div class="flex items-baseline gap-2">
        <strong class="numeric text-[2.4rem] leading-none" id="w-deg">22°</strong>
        <span class="text-muted text-[.9rem]" id="w-cond">Parçalı bulutlu</span>
      </div>
      <p class="text-[.92rem] text-muted flex-1 min-w-[260px] leading-relaxed" id="w-advice"></p>
    </div>
  </section>

  <section class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2" id="cat-filters">
        ${CATEGORIES.map(
          ([v, t], i) => `<button class="chip ${i === 0 ? 'is-active' : ''}" data-cat="${v}">${esc(t)}</button>`
        ).join('')}
      </div>
      <div id="cloth-grid" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>
    </div>

    <aside class="card p-6 lg:sticky lg:top-24">
      <header class="flex items-center gap-2.5 mb-5">
        <span style="color:var(--primary)">${icon('sparkle')}</span>
        <h3 class="text-[1.05rem]">Günün kombini</h3>
      </header>
      <div class="flex flex-col gap-3" id="outfit-slots">
        ${SLOTS.map(
          ([k, label]) => `
          <div class="card-inset p-3.5 min-h-[68px] flex items-center gap-3" data-slot="${k}"
               style="border-style:dashed">
            <span class="label">${esc(label)} seçilmedi</span>
          </div>`
        ).join('')}
      </div>
      <div class="flex flex-col gap-2 mt-5">
        <button class="btn btn-primary" id="ai-outfit">${icon('sparkle')}Yapay zekâ önersin</button>
        <button class="btn btn-quiet" id="save-outfit">${icon('bookmark')}Kombini kaydet</button>
      </div>
    </aside>
  </section>

  <div class="modal-overlay" id="cloth-modal">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Kıyafet ekle">
      <div class="modal-header">
        <span style="color:var(--primary)">${icon('shirt')}</span>
        <h3 class="modal-title">Gardıroba ekle</h3>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>
      <div class="modal-body">
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="field">
            <label class="field-label" for="c-name">Kıyafet adı *</label>
            <input id="c-name" class="input" placeholder="Keten blazer ceket" />
          </div>
          <div class="field">
            <label class="field-label" for="c-color">Renk *</label>
            <input id="c-color" class="input" placeholder="Bej" />
          </div>
          <div class="field">
            <label class="field-label" for="c-cat">Kategori</label>
            <select id="c-cat" class="select">
              ${Object.entries(CAT_LABEL).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="c-season">Mevsim</label>
            <select id="c-season" class="select">
              ${SEASONS.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
            </select>
          </div>
          <div class="field sm:col-span-2">
            <label class="field-label" for="c-style">Stil</label>
            <select id="c-style" class="select">
              ${STYLES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="c-desc">Açıklama * <span class="normal-case">(yapay zekâ kombinlerken kullanır)</span></label>
          <textarea id="c-desc" class="textarea" style="min-height:90px"
                    placeholder="Hafif, açık bej, ofise de gider akşama da…"></textarea>
        </div>
        <div class="field">
          <span class="field-label">Fotoğraf *</span>
          <div class="flex flex-wrap gap-2">
            <input type="file" id="c-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-quiet btn-sm" id="c-file-btn">${icon('camera', 'ico-sm')}Cihazdan seç</button>
            <input id="c-url" class="input flex-1 min-w-[200px]" placeholder="…veya görsel adresi yapıştır" />
          </div>
          <img id="c-preview" alt="Önizleme" class="hidden w-28 h-28 object-cover rounded-tile mt-2 border border-line" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-quiet" data-close>Vazgeç</button>
        <button class="btn btn-primary" id="save-cloth">${icon('check')}Gardıroba ekle</button>
      </div>
    </div>
  </div>`
}

export function mount(root) {
  let clothes = []
  let activeCat = 'all'
  let photo = null
  let city = 'ankara'
  const outfit = { top: null, bottom: null, shoes: null }

  const grid = $('#cloth-grid', root)
  const modal = $('#cloth-modal', root)
  wireModal(modal)

  /* ── hava ── */
  const paintWeather = () => {
    const w = WEATHER[city]
    $('#w-deg', root).textContent = w.degree
    $('#w-cond', root).textContent = w.condition
    $('#w-advice', root).textContent = w.advice
  }
  paintWeather()
  $('#city', root).addEventListener('change', (e) => { city = e.target.value; paintWeather() })

  /* ── filtreler ── */
  $$('#cat-filters [data-cat]', root).forEach((btn) =>
    btn.addEventListener('click', () => {
      $$('#cat-filters [data-cat]', root).forEach((b) => b.classList.toggle('is-active', b === btn))
      activeCat = btn.dataset.cat
      paintGrid()
    })
  )

  /* ── liste ── */
  grid.innerHTML = loadingBlock('Dolap açılıyor…')
  const unsub = onSnapshot(
    query(collection(db, PATHS.wardrobe), orderBy('createdAt', 'desc')),
    (snap) => { clothes = snap.docs.map((d) => ({ id: d.id, ...d.data() })); paintGrid() },
    () => { grid.innerHTML = emptyBlock({ iconName: 'warning', title: 'Gardırop okunamadı' }) }
  )

  function paintGrid() {
    const list = activeCat === 'all' ? clothes : clothes.filter((c) => c.category === activeCat)
    if (!list.length) {
      grid.innerHTML = `<div class="col-span-full">${emptyBlock({
        iconName: 'shirt',
        title: 'Burada henüz kıyafet yok',
        subtitle: '"Kıyafet ekle" ile dolabındaki parçaları tanıt, yapay zekâ sana kombin hazırlasın.',
      })}</div>`
      return
    }
    grid.innerHTML = list
      .map((item) => {
        const img = safeUrl(item.photo)
        return `
        <article class="card overflow-hidden flex flex-col" data-cloth="${esc(item.id)}">
          <div class="relative aspect-square bg-surface-2">
            ${img
              ? `<img src="${img}" alt="${esc(item.name || '')}" class="w-full h-full object-cover" loading="lazy">`
              : `<div class="w-full h-full grid place-items-center text-faint">${icon('shirt', 'ico-lg')}</div>`}
            <button class="btn btn-icon btn-sm absolute top-2 right-2" data-del="${esc(item.id)}"
                    style="background:rgba(0,0,0,.66);color:var(--danger)" aria-label="Kıyafeti sil">
              ${icon('trash', 'ico-sm')}
            </button>
          </div>
          <div class="p-3.5 flex flex-col gap-2 flex-1">
            <h4 class="text-[.92rem] leading-snug">${esc(item.name || '')}</h4>
            <div class="flex flex-wrap gap-1.5">
              <span class="badge" style="font-size:.62rem">${esc(CAT_LABEL[item.category] || 'Aksesuar')}</span>
              <span class="badge" style="font-size:.62rem;background:var(--accent-soft);color:var(--accent)">${esc(item.color || '—')}</span>
            </div>
            <button class="btn btn-quiet btn-sm mt-auto" data-pick="${esc(item.id)}">${icon('plus', 'ico-sm')}Kombine ekle</button>
          </div>
        </article>`
      })
      .join('')
  }

  /* ── kombin ── */
  function paintSlots() {
    SLOTS.forEach(([key, label]) => {
      const slot = root.querySelector(`[data-slot="${key}"]`)
      const item = outfit[key]
      if (!item) {
        slot.style.borderStyle = 'dashed'
        slot.style.borderColor = 'var(--border)'
        slot.innerHTML = `<span class="label">${esc(label)} seçilmedi</span>`
        return
      }
      const img = safeUrl(item.photo)
      slot.style.borderStyle = 'solid'
      slot.style.borderColor = 'var(--primary)'
      slot.innerHTML = `
        ${img ? `<img src="${img}" alt="" class="w-11 h-11 rounded-chip object-cover shrink-0">` : ''}
        <span class="min-w-0">
          <span class="label block" style="color:var(--primary)">${esc(label)}</span>
          <span class="block text-[.86rem] font-semibold truncate">${esc(item.name)} · ${esc(item.color || '')}</span>
        </span>`
    })
  }

  delegate(grid, '[data-pick]', 'click', (e, btn) => {
    e.stopPropagation()
    const item = clothes.find((c) => c.id === btn.dataset.pick)
    if (!item) return
    if (!item.category || item.category === 'accessory') {
      toast(`Aksesuar eklendi: ${item.name}`, '👜')
      return
    }
    outfit[item.category] = item
    paintSlots()
    toast(`${item.name} kombine eklendi.`, '✨')
  })

  delegate(grid, '[data-del]', 'click', async (e, btn) => {
    e.stopPropagation()
    const item = clothes.find((c) => c.id === btn.dataset.del)
    const ok = await confirmDialog({
      title: 'Kıyafet silinsin mi?',
      message: `"${item?.name || 'Bu parça'}" gardırobundan kaldırılacak.`,
      confirmText: 'Sil',
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, PATHS.wardrobe, btn.dataset.del))
      toast('Kıyafet silindi.', '🗑️')
    } catch { toast('Silinemedi.', '⚠️') }
  })

  $('#ai-outfit', root).addEventListener('click', async () => {
    if (!clothes.length) { toast('Önce gardırobuna en az bir kıyafet ekle.', '⚠️'); return }
    const btn = $('#ai-outfit', root)
    btn.disabled = true
    btn.innerHTML = `${icon('hourglass')}Gardırop inceleniyor…`

    const w = WEATHER[city]
    const summary = clothes
      .map((c) => `- ID: ${c.id} | Adı: ${c.name} | Kategori: ${c.category} | Renk: ${c.color || '-'} | Mevsim: ${c.season || ''} | Stil: ${c.style || ''} | Açıklama: ${c.description || ''}`)
      .join('\n')

    try {
      const reply = await generate({
        prompt: `Sen Yasemin'in özel AI Stil Danışmanı'sın.
Hava Durumu: ${w.city} (${w.degree}, ${w.condition}).

Yasemin'in gardırobundaki kıyafetler:
${summary}

Bu kıyafetler arasından bugünkü havaya en uygun 1 Üst Giyim + 1 Alt Giyim + 1 Ayakkabı kombinle!
Yasemin'e "aşkım/mimarım" hitabıyla neden bu kombini seçtiğini 2-3 cümleyle tatlıca açıkla.`,
        maxTokens: 320,
      })
      $('#w-advice', root).textContent = reply

      outfit.top = clothes.find((c) => c.category === 'top') || outfit.top
      outfit.bottom = clothes.find((c) => c.category === 'bottom') || outfit.bottom
      outfit.shoes = clothes.find((c) => c.category === 'shoes') || outfit.shoes
      paintSlots()
      heartBurst(12)
      toast('Günün kombini hazır.', '👗')
    } catch {
      toast('Yapay zekâya ulaşılamadı.', '⚠️')
    } finally {
      btn.disabled = false
      btn.innerHTML = `${icon('sparkle')}Yapay zekâ önersin`
    }
  })

  $('#save-outfit', root).addEventListener('click', () => {
    if (!outfit.top && !outfit.bottom) { toast('Kombine en az bir parça ekle.', '⚠️'); return }
    heartBurst(10)
    toast('Günün kombini kaydedildi.', '👗')
  })

  /* ── ekleme modalı ── */
  $('#add-cloth', root).addEventListener('click', () => openModal(modal))
  $('#c-file-btn', root).addEventListener('click', () => $('#c-file', root).click())

  $('#c-file', root).addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      photo = await resizeImage(file, 800)
      const img = $('#c-preview', root)
      img.src = photo
      img.classList.remove('hidden')
    } catch { toast('Görsel işlenemedi.', '⚠️') }
  })

  $('#save-cloth', root).addEventListener('click', async () => {
    const name = $('#c-name', root).value.trim()
    const color = $('#c-color', root).value.trim()
    const description = $('#c-desc', root).value.trim()
    const urlPhoto = $('#c-url', root).value.trim()

    if (!name) return toast('Kıyafet adını gir.', '⚠️')
    if (!color) return toast('Rengi gir.', '⚠️')
    if (!description) return toast('Yapay zekânın kombinleyebilmesi için açıklama şart.', '⚠️')
    const finalPhoto = photo || urlPhoto
    if (!finalPhoto) return toast('Bir fotoğraf seç veya adres yapıştır.', '⚠️')

    const btn = $('#save-cloth', root)
    btn.disabled = true
    try {
      await addDoc(collection(db, PATHS.wardrobe), {
        name, color, description,
        category: $('#c-cat', root).value,
        season: $('#c-season', root).value,
        style: $('#c-style', root).value,
        photo: finalPhoto,
        createdAt: serverTimestamp(),
      })
      toast(`"${name}" gardıroba eklendi.`, '👚')
      ;['c-name', 'c-color', 'c-desc', 'c-url'].forEach((id) => { $(`#${id}`, root).value = '' })
      photo = null
      $('#c-preview', root).classList.add('hidden')
      $('#c-file', root).value = ''
      closeModal(modal)
    } catch (err) {
      toast('Eklenemedi: ' + (err.message || ''), '⚠️')
    } finally {
      btn.disabled = false
    }
  })

  paintSlots()
  return () => unsub()
}
