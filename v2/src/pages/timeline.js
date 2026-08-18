import { icon } from '../lib/icons.js'
import {
  $, esc, safeUrl, toast, heartBurst, resizeImage, openModal, closeModal, wireModal,
  loadingBlock, emptyBlock, confirmDialog, delegate,
} from '../lib/ui.js'
import {
  db, collection, doc, addDoc, deleteDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, PATHS,
} from '../lib/firebase.js'

const STARTER = {
  id: 'starter_31_mayis',
  title: 'Bizim Hikayemiz Başladı ❤️',
  category: 'Aşk',
  emoji: '🥰',
  date: '31 Mayıs 2026',
  desc: 'Kağan ve Yasemin ilk adımı attı... Birlikte sonsuz mutluluğa, sevgiye ve heyecan dolu bir ömre giden harika hikayemiz resmi olarak başladı!',
  photo: '',
  likes: 12,
}

const CATEGORIES = ['Aşk', 'Özel Gün', 'Gezi', 'Mimari', 'Sürpriz']

export function render() {
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-8 flex flex-wrap items-end gap-5">
      <div>
        <p class="now-showing mb-3">Arşiv makarası</p>
        <h2 class="text-[1.5rem] md:text-[2.1rem] mb-2">Zaman tüneli</h2>
        <p class="text-muted text-[.94rem] max-w-[50ch]">Birlikte biriktirdiğimiz her sahne, tarih sırasıyla.</p>
      </div>
      <button class="btn btn-primary ml-auto" id="add-ms">${icon('plus')}Anı ekle</button>
    </div>
  </section>

  <section id="timeline" class="relative flex flex-col gap-5 md:pl-8"></section>

  <div class="modal-overlay" id="ms-modal">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Anı ekle">
      <div class="modal-header">
        <span style="color:var(--primary)">${icon('star')}</span>
        <h3 class="modal-title">Yeni anı</h3>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>
      <div class="modal-body">
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="field sm:col-span-2">
            <label class="field-label" for="ms-title">Başlık *</label>
            <input id="ms-title" class="input" placeholder="İlk buluşmamız" maxlength="120" />
          </div>
          <div class="field">
            <label class="field-label" for="ms-date">Tarih *</label>
            <input id="ms-date" class="input" type="date" />
          </div>
          <div class="field">
            <label class="field-label" for="ms-cat">Kategori</label>
            <select id="ms-cat" class="select">
              ${CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="ms-emoji">Emoji</label>
            <input id="ms-emoji" class="input" placeholder="🥰" maxlength="4" />
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="ms-desc">Anlat</label>
          <textarea id="ms-desc" class="textarea" style="min-height:110px" placeholder="O gün neler oldu?"></textarea>
        </div>
        <div class="field">
          <span class="field-label">Fotoğraf</span>
          <div class="flex flex-wrap gap-2">
            <input type="file" id="ms-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-quiet btn-sm" id="ms-file-btn">${icon('camera', 'ico-sm')}Cihazdan seç</button>
            <input id="ms-url" class="input flex-1 min-w-[200px]" placeholder="…veya görsel adresi" />
          </div>
          <img id="ms-preview" alt="Önizleme" class="hidden w-full max-h-48 object-cover rounded-tile mt-2 border border-line" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-quiet" data-close>Vazgeç</button>
        <button class="btn btn-primary" id="save-ms">${icon('check')}Zaman tüneline ekle</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="lightbox">
    <div class="relative w-full max-w-4xl">
      <button class="btn btn-icon btn-quiet absolute -top-14 right-0" data-close aria-label="Kapat">${icon('close')}</button>
      <img id="lightbox-img" alt="Anı fotoğrafı" class="w-full max-h-[80vh] object-contain rounded-card" />
    </div>
  </div>`
}

export function mount(root) {
  const list = $('#timeline', root)
  const modal = $('#ms-modal', root)
  const lightbox = $('#lightbox', root)
  wireModal(modal)
  wireModal(lightbox)

  let photo = null
  let items = [STARTER]

  list.innerHTML = loadingBlock('Makara sarılıyor…')

  const unsub = onSnapshot(
    query(collection(db, PATHS.love), orderBy('createdAt', 'desc')),
    (snap) => {
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items = fetched.length ? fetched : [STARTER]
      paint()
    },
    (err) => {
      console.warn('[zaman tüneli]', err)
      paint()
    }
  )

  function paint() {
    if (!items.length) {
      list.innerHTML = emptyBlock({ iconName: 'star', title: 'Henüz anı yok', subtitle: 'İlk sahneyi sen ekle.' })
      return
    }
    list.innerHTML = items
      .map((item) => {
        const img = safeUrl(item.photo)
        const isStarter = item.id === STARTER.id
        return `
        <article class="card p-6 relative" data-ms="${esc(item.id)}">
          <span class="hidden md:block absolute -left-8 top-8 w-3 h-3 rounded-full"
                style="background:var(--primary);box-shadow:0 0 0 4px var(--primary-soft)" aria-hidden="true"></span>
          <header class="flex flex-wrap items-center gap-2.5 mb-3">
            <span class="label">${esc(item.date || '')}</span>
            <span class="badge">${esc(item.category || 'Aşk')}</span>
            ${isStarter ? '' : `<button class="btn btn-icon btn-danger btn-sm ml-auto" data-del="${esc(item.id)}" aria-label="Anıyı sil">${icon('trash', 'ico-sm')}</button>`}
          </header>
          <h3 class="text-[1.2rem] mb-2.5 flex items-center gap-2">
            <span aria-hidden="true">${esc(item.emoji || '💖')}</span>${esc(item.title || '')}
          </h3>
          <p class="prose-diary">${esc(item.desc || '')}</p>
          ${img ? `<img src="${img}" alt="${esc(item.title || 'Anı')} fotoğrafı" loading="lazy"
                        class="w-full max-h-64 object-cover rounded-tile mt-4 cursor-zoom-in border border-line"
                        data-zoom="${img}">` : ''}
          <footer class="flex items-center justify-between gap-3 mt-5 pt-4" style="border-top:1px dashed var(--border)">
            <button class="chip" data-like="${esc(item.id)}" data-likes="${Number(item.likes) || 0}">
              ${icon('heart', 'ico-sm')}<span>${Number(item.likes) || 0} beğeni</span>
            </button>
            <span class="label">Kağan &amp; Yasemin hatıra albümü</span>
          </footer>
        </article>`
      })
      .join('')
  }

  /* ── etkileşim ── */
  delegate(list, '[data-zoom]', 'click', (e, img) => {
    $('#lightbox-img', root).src = img.dataset.zoom
    openModal(lightbox)
  })

  delegate(list, '[data-like]', 'click', async (e, btn) => {
    const id = btn.dataset.like
    const next = Number(btn.dataset.likes || 0) + 1
    btn.dataset.likes = String(next)
    btn.querySelector('span').textContent = `${next} beğeni`
    heartBurst(10)
    if (id === STARTER.id) { STARTER.likes = next; return }
    try { await updateDoc(doc(db, PATHS.love, id), { likes: next }) } catch {}
  })

  delegate(list, '[data-del]', 'click', async (e, btn) => {
    const ok = await confirmDialog({
      title: 'Anı silinsin mi?',
      message: 'Bu anı zaman tünelinden kalıcı olarak kaldırılacak.',
      confirmText: 'Sil',
    })
    if (!ok) return
    try {
      await deleteDoc(doc(db, PATHS.love, btn.dataset.del))
      toast('Anı silindi.', '🗑️')
    } catch { toast('Silinemedi.', '⚠️') }
  })

  /* ── ekleme ── */
  $('#add-ms', root).addEventListener('click', () => openModal(modal))
  $('#ms-file-btn', root).addEventListener('click', () => $('#ms-file', root).click())

  $('#ms-file', root).addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      photo = await resizeImage(file, 1100)
      const img = $('#ms-preview', root)
      img.src = photo
      img.classList.remove('hidden')
    } catch { toast('Görsel işlenemedi.', '⚠️') }
  })

  $('#save-ms', root).addEventListener('click', async () => {
    const title = $('#ms-title', root).value.trim()
    const dateVal = $('#ms-date', root).value
    if (!title || !dateVal) { toast('Başlık ve tarih zorunlu.', '⚠️'); return }

    const btn = $('#save-ms', root)
    btn.disabled = true
    try {
      await addDoc(collection(db, PATHS.love), {
        title,
        category: $('#ms-cat', root).value,
        emoji: $('#ms-emoji', root).value.trim() || '🥰',
        date: new Date(dateVal).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        desc: $('#ms-desc', root).value.trim(),
        photo: photo || $('#ms-url', root).value.trim() || '',
        likes: 1,
        createdAt: serverTimestamp(),
      })
      ;['ms-title', 'ms-date', 'ms-desc', 'ms-url', 'ms-emoji'].forEach((id) => { $(`#${id}`, root).value = '' })
      photo = null
      $('#ms-preview', root).classList.add('hidden')
      $('#ms-file', root).value = ''
      closeModal(modal)
      heartBurst(18)
      toast('Anı zaman tüneline eklendi.', '⭐')
    } catch (err) {
      toast('Eklenemedi: ' + (err.message || ''), '⚠️')
    } finally {
      btn.disabled = false
    }
  })

  return () => unsub()
}
