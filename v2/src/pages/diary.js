import { icon } from '../lib/icons.js'
import {
  $, $$, esc, toast, formatDate, openModal, closeModal, wireModal,
  loadingBlock, emptyBlock, errorBlock, confirmDialog, delegate,
} from '../lib/ui.js'
import { generate } from '../lib/gemini.js'
import {
  db, collection, doc, addDoc, getDoc, setDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, PATHS, DIARY_OWNERS,
} from '../lib/firebase.js'

const MOOD_PILLS = ['😊 Mutlu', '🥰 Aşık', '🤩 Enerjik', '😌 Huzurlu', '😮‍💨 Yorgun', '🥺 Üzgün', '😤 Kızgın']

async function aiComment(title, body, mood) {
  try {
    return await generate({
      prompt: `Sen sevecen, tatlı, içten ve motive edici bir günlük dostusun. Kullanıcı günlüğüne şunu yazdı:
Başlık: "${title}"
İçerik: "${body}"
Hisse/Mod: "${mood}"

Lütfen bu yazılanlara karşılık çok kısa (en fazla 1 veya 2 cümle, 25 kelimeyi geçmeyecek şekilde), samimi, tatlı ve içten bir cevap yaz. Cevabına uygun şirin bir emoji de ekle.`,
      temperature: 0.8,
      maxTokens: 120,
    })
  } catch (err) {
    console.warn('[günlük yorumu]', err.message)
    return null
  }
}

/**
 * @param {'yasemin'|'kagan'} who
 */
export function createDiaryPage(who) {
  const meta = DIARY_OWNERS[who]
  const owner = meta.key
  const storageKey = `diary_password_${owner}`

  function render() {
    return `
    <!-- ══ KİLİT ══ -->
    <section id="diary-lock" class="card overflow-hidden pt-7">
      <div class="marquee" aria-hidden="true"></div>
      <div class="p-8 md:p-12 flex flex-col items-center text-center gap-5">
        <span id="lock-icon" class="grid place-items-center w-20 h-20 rounded-full border transition"
              style="border-color:var(--border-strong);color:var(--primary)">${icon('lock', 'ico-lg')}</span>
        <div>
          <p class="now-showing mb-2">Özel gösterim</p>
          <h2 class="text-[1.5rem] md:text-[2rem]">${esc(meta.label)}</h2>
          <p class="text-muted text-[.92rem] mt-2 max-w-[42ch]">Bu salon kilitli. Devam etmek için şifreni gir.</p>
        </div>
        <form id="unlock-form" class="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
          <label class="sr-only" for="diary-pass">Şifre</label>
          <input id="diary-pass" class="input text-center" type="password"
                 autocomplete="current-password" placeholder="••••••" />
          <button class="btn btn-primary shrink-0" type="submit">${icon('unlock')}Kilidi aç</button>
        </form>
        <p id="lock-error" class="field-error opacity-0" role="alert">Yanlış şifre!</p>
        <button class="btn btn-quiet btn-sm" id="lock-change-pass">${icon('key', 'ico-sm')}Şifreyi değiştir</button>
      </div>
    </section>

    <!-- ══ İÇERİK ══ -->
    <section id="diary-main" class="hidden flex-col gap-5">
      <div class="card p-6 md:p-8 overflow-hidden pt-7 relative">
        <div class="marquee" aria-hidden="true"></div>
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <p class="now-showing mb-2">${esc(meta.label)}</p>
            <h2 class="text-[1.4rem] md:text-[1.9rem]">Bugün ne oldu?</h2>
            <p id="diary-date" class="text-muted text-[.86rem] mt-1"></p>
          </div>
          <div class="ml-auto flex gap-2">
            <button class="btn btn-quiet btn-sm" id="change-pass">${icon('key', 'ico-sm')}Şifre</button>
            <button class="btn btn-primary" id="open-write">${icon('plus')}Yeni giriş</button>
          </div>
        </div>
      </div>
      <div id="entries" class="flex flex-col gap-4"></div>
    </section>

    <!-- ══ YAZMA MODALI ══ -->
    <div class="modal-overlay" id="write-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Yeni günlük girişi">
        <div class="modal-header">
          <span style="color:var(--primary)">${icon('book')}</span>
          <h3 class="modal-title">Yeni giriş</h3>
          <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label" for="entry-title">Başlık</label>
            <input id="entry-title" class="input" placeholder="Bugünün başlığı" maxlength="120" />
          </div>
          <div class="field">
            <label class="field-label" for="entry-body">İçerik</label>
            <textarea id="entry-body" class="textarea" placeholder="Aklından geçenleri yaz…"></textarea>
          </div>
          <div class="field">
            <span class="field-label">Bugünkü his</span>
            <div class="flex flex-wrap gap-2" id="mood-pills">
              ${MOOD_PILLS.map(
                (m, i) => `<button type="button" class="chip" data-mood="${esc(m)}" ${i === 0 ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${esc(m)}</button>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-quiet" data-close>Vazgeç</button>
          <button class="btn btn-primary" id="save-entry">${icon('check')}Kaydet</button>
        </div>
      </div>
    </div>

    <!-- ══ ŞİFRE MODALI ══ -->
    <div class="modal-overlay" id="pass-modal">
      <div class="modal" style="max-width:440px" role="dialog" aria-modal="true" aria-label="Şifre değiştir">
        <div class="modal-header">
          <span style="color:var(--primary)">${icon('key')}</span>
          <h3 class="modal-title">Şifreyi değiştir</h3>
          <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label" for="new-pass">Yeni şifre</label>
            <input id="new-pass" class="input" type="password" autocomplete="new-password" />
          </div>
          <p id="pass-status" class="text-[.85rem]"></p>
          <p class="label leading-relaxed">
            Not: Bu kilit meraklı gözler içindir, gerçek bir güvenlik katmanı değildir.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-quiet" data-close>Vazgeç</button>
          <button class="btn btn-primary" id="save-pass">${icon('check')}Kaydet</button>
        </div>
      </div>
    </div>`
  }

  function mount(root) {
    let password = localStorage.getItem(storageKey) || meta.fallbackPass

    // Firestore'daki şifreyi arka planda tazele
    getDoc(doc(db, ...PATHS.diaryPassword(owner)))
      .then((snap) => {
        if (snap.exists() && snap.data().value) {
          password = snap.data().value
          localStorage.setItem(storageKey, password)
        }
      })
      .catch(() => {})

    const lock = $('#diary-lock', root)
    const main = $('#diary-main', root)
    const lockIcon = $('#lock-icon', root)
    const lockError = $('#lock-error', root)
    const passInput = $('#diary-pass', root)
    const entries = $('#entries', root)
    const writeModal = $('#write-modal', root)
    const passModal = $('#pass-modal', root)

    wireModal(writeModal)
    wireModal(passModal)

    $('#diary-date', root).textContent = new Date().toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    /* ── kilit ── */
    $('#unlock-form', root).addEventListener('submit', (e) => {
      e.preventDefault()
      if (passInput.value.trim() !== password) {
        lockError.style.opacity = '1'
        lockIcon.style.borderColor = 'var(--danger)'
        lockIcon.style.color = 'var(--danger)'
        passInput.value = ''
        passInput.focus()
        return
      }
      lockError.style.opacity = '0'
      lockIcon.style.borderColor = 'var(--ok)'
      lockIcon.style.color = 'var(--ok)'
      lockIcon.innerHTML = icon('unlock', 'ico-lg')
      setTimeout(() => {
        lock.classList.add('hidden')
        main.classList.remove('hidden')
        main.classList.add('flex')
        loadEntries()
      }, 380)
    })

    /* ── şifre değiştir ── */
    const openPass = () => {
      $('#new-pass', root).value = ''
      $('#pass-status', root).textContent = ''
      openModal(passModal)
    }
    $('#change-pass', root).addEventListener('click', openPass)
    $('#lock-change-pass', root).addEventListener('click', openPass)

    $('#save-pass', root).addEventListener('click', async () => {
      const input = $('#new-pass', root)
      const status = $('#pass-status', root)
      const next = input.value.trim()
      if (!next) { status.style.color = 'var(--danger)'; status.textContent = 'Lütfen yeni şifreyi gir.'; return }

      const btn = $('#save-pass', root)
      btn.disabled = true
      password = next
      localStorage.setItem(storageKey, next)

      try {
        await Promise.all([
          setDoc(doc(db, ...PATHS.diaryPassword(owner)), { value: next }),
          setDoc(doc(db, PATHS.settings, `diaryPassword_${owner}`), { value: next }),
        ])
        status.style.color = 'var(--ok)'
        status.textContent = 'Şifre güncellendi ✓'
      } catch {
        status.style.color = 'var(--warn)'
        status.textContent = 'Şifre yerelde güncellendi (buluta yazılamadı).'
      }
      setTimeout(() => { closeModal(passModal); btn.disabled = false }, 1100)
    })

    /* ── yazma ── */
    let mood = MOOD_PILLS[0]
    $('#open-write', root).addEventListener('click', () => openModal(writeModal))

    $$('#mood-pills [data-mood]', root).forEach((pill) =>
      pill.addEventListener('click', () => {
        $$('#mood-pills [data-mood]', root).forEach((p) => p.setAttribute('aria-pressed', String(p === pill)))
        mood = pill.dataset.mood
      })
    )

    $('#save-entry', root).addEventListener('click', async () => {
      const titleEl = $('#entry-title', root)
      const bodyEl = $('#entry-body', root)
      const title = titleEl.value.trim()
      const body = bodyEl.value.trim()

      if (!title || !body) { toast('Başlık ve içerik boş olamaz.', '✍️'); return }

      const btn = $('#save-entry', root)
      btn.disabled = true
      btn.innerHTML = `${icon('sparkle')}Yorum yazılıyor…`

      const reply = await aiComment(title, body, mood)

      try {
        await addDoc(collection(db, ...PATHS.diaryEntries(owner)), {
          title, body, mood,
          aiResponse: reply || '',
          createdAt: serverTimestamp(),
        })
        titleEl.value = ''
        bodyEl.value = ''
        btn.innerHTML = `${icon('check')}Kaydedildi`
        toast('Günlüğüne yazıldı.', '📖')
        setTimeout(() => {
          closeModal(writeModal)
          btn.disabled = false
          btn.innerHTML = `${icon('check')}Kaydet`
        }, 800)
        loadEntries()
      } catch (err) {
        console.error(err)
        toast('Kaydedilemedi: ' + (err.message || ''), '⚠️')
        btn.disabled = false
        btn.innerHTML = `${icon('check')}Kaydet`
      }
    })

    /* ── liste ── */
    async function loadEntries() {
      entries.innerHTML = loadingBlock('Sayfalar çevriliyor…')
      try {
        const snap = await getDocs(query(collection(db, ...PATHS.diaryEntries(owner)), orderBy('createdAt', 'desc')))
        if (snap.empty) {
          entries.innerHTML = emptyBlock({
            iconName: 'book',
            title: 'Sayfalar henüz boş',
            subtitle: 'İlk girişini yazarak bu defteri açabilirsin.',
            actionHtml: `<button class="btn btn-primary mt-2" data-open-write>${icon('plus')}İlk anını yaz</button>`,
          })
          return
        }
        entries.innerHTML = snap.docs.map((d) => entryCard(d.id, d.data())).join('')
      } catch (err) {
        entries.innerHTML = errorBlock(err.message || 'Günlükler yüklenemedi.')
      }
    }

    function entryCard(id, d) {
      return `
      <article class="card p-6" data-entry="${esc(id)}">
        <header class="flex flex-wrap items-center gap-3 mb-4">
          <span class="badge">${esc(d.mood || '😊 Mutlu')}</span>
          <span class="label">${icon('clock', 'ico-sm')} ${esc(formatDate(d.createdAt))}</span>
          <button class="btn btn-icon btn-danger btn-sm ml-auto" data-del="${esc(id)}" aria-label="Girişi sil">
            ${icon('trash', 'ico-sm')}
          </button>
        </header>
        <h3 class="text-[1.15rem] mb-2.5">${esc(d.title || '')}</h3>
        <p class="prose-diary">${esc(d.body || '')}</p>
        ${
          d.aiResponse
            ? `<div class="card-inset p-4 mt-5 border-l-2" style="border-left-color:var(--primary)">
                 <p class="label mb-1.5">${icon('sparkle', 'ico-sm')} Canım günlük'ten</p>
                 <p class="text-[.92rem]">${esc(d.aiResponse)}</p>
               </div>`
            : `<div class="mt-5" data-aibox="${esc(id)}">
                 <button class="btn btn-quiet btn-sm" data-ai="${esc(id)}">
                   ${icon('sparkle', 'ico-sm')}Canım günlük'ten yorum al
                 </button>
               </div>`
        }
      </article>`
    }

    delegate(entries, '[data-open-write]', 'click', () => openModal(writeModal))

    delegate(entries, '[data-del]', 'click', async (e, btn) => {
      const id = btn.dataset.del
      const ok = await confirmDialog({
        title: 'Bu giriş silinsin mi?',
        message: 'Günlük girişi kalıcı olarak silinecek.',
        confirmText: 'Sil',
      })
      if (!ok) return
      const card = entries.querySelector(`[data-entry="${CSS.escape(id)}"]`)
      if (card) card.style.opacity = '.4'
      try {
        await deleteDoc(doc(db, ...PATHS.diaryEntries(owner), id))
        card?.remove()
        if (!entries.children.length) loadEntries()
      } catch {
        if (card) card.style.opacity = '1'
        toast('Silinemedi.', '⚠️')
      }
    })

    delegate(entries, '[data-ai]', 'click', async (e, btn) => {
      const id = btn.dataset.ai
      const card = entries.querySelector(`[data-entry="${CSS.escape(id)}"]`)
      const title = card?.querySelector('h3')?.textContent || ''
      const body = card?.querySelector('.prose-diary')?.textContent || ''
      const moodText = card?.querySelector('.badge')?.textContent?.trim() || ''

      btn.disabled = true
      btn.innerHTML = `${icon('sparkle', 'ico-sm')}Düşünülüyor…`

      const reply = await aiComment(title, body, moodText)
      const box = entries.querySelector(`[data-aibox="${CSS.escape(id)}"]`)

      if (reply && box) {
        try { await updateDoc(doc(db, ...PATHS.diaryEntries(owner), id), { aiResponse: reply }) } catch {}
        box.outerHTML = `
          <div class="card-inset p-4 mt-5 border-l-2" style="border-left-color:var(--primary)">
            <p class="label mb-1.5">${icon('sparkle', 'ico-sm')} Canım günlük'ten</p>
            <p class="text-[.92rem]">${esc(reply)}</p>
          </div>`
      } else {
        btn.disabled = false
        btn.innerHTML = `${icon('warning', 'ico-sm')}Yanıt alınamadı, tekrar dene`
      }
    })

    setTimeout(() => passInput?.focus(), 60)
    return () => {}
  }

  return { render, mount }
}
