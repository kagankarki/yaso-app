import { icon } from '../lib/icons.js'
import { $, $$, esc, safeUrl, toast, heartBurst, openModal, closeModal, wireModal, tl, formatDate } from '../lib/ui.js'
import {
  db, collection, doc, addDoc, getDoc, setDoc, getDocs, query, orderBy, limit,
  onSnapshot, serverTimestamp, PATHS,
} from '../lib/firebase.js'

export const LOVE_START = new Date('2026-05-31T00:00:00')

const MOODS = [
  { id: 'asik', emoji: '😍', label: 'Aşık' },
  { id: 'mutlu', emoji: '😊', label: 'Mutlu' },
  { id: 'enerjik', emoji: '🤩', label: 'Enerjik' },
  { id: 'yorgun', emoji: '😮‍💨', label: 'Yorgun' },
  { id: 'uzgun', emoji: '🥺', label: 'Üzgün' },
  { id: 'bikmis', emoji: '🙄', label: 'Kağandan bıkmış' },
  { id: 'beraber', emoji: '♾️', label: 'Sonsuza kadar' },
]

const UZGUN_TEXT = `Yaaa Yasemin niye Üzgün'ü seçiyosun. Harbiden biliyodum bak seçeceğini, tek seferlik şu an bu bildirimi koydum. Ya valla üzülmene gerek yok, ben sana kıyamam ha. Cidden üzülme şu modunu topla canımın içi. Bak beraberiz, iyiyiz, seni çoook seviyorum.`

export function render() {
  return `
  <!-- ══ AÇILIŞ: MARKİ ══ -->
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-10 relative">
      <p class="now-showing mb-3">Bu akşamki gösterim</p>
      <h2 class="text-[1.7rem] md:text-[2.6rem] leading-[1.05] mb-3 text-balance">
        Kağan, Yasemin'i çok seviyor.
      </h2>
      <p class="text-muted text-[.98rem] leading-relaxed mb-6 max-w-[52ch]">
        Günün harika geçsin biriciğim — ne olursa olsun seni çok seviyorum.
      </p>
      <div class="flex flex-wrap gap-2.5">
        <a href="love.html#/kosemiz" class="btn btn-primary no-underline">${icon('mail')}Sürpriz notu aç</a>
        <a href="love.html" class="btn btn-ghost no-underline">${icon('heart')}Bizim köşemiz</a>
      </div>
      <p class="now-showing absolute right-6 bottom-5 hidden md:block">★ ★ ★ ★ ★ · gösterimde</p>
    </div>
  </section>

  <!-- ══ MOD ══ -->
  <section class="card p-5 md:p-7">
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div>
        <h3 class="text-[1.2rem]">Bugün nasıl hissediyorsun?</h3>
        <p id="mood-status" class="text-[.85rem] text-muted mt-1">Yükleniyor…</p>
      </div>
      <div class="ml-auto flex gap-2" id="person-tabs">
        <button class="chip" data-person="yasemin" aria-pressed="true">Yasemin</button>
        <button class="chip" data-person="kagan" aria-pressed="false">Kağan</button>
      </div>
    </div>
    <div class="grid grid-cols-4 sm:grid-cols-7 gap-2.5" id="mood-grid">
      ${MOODS.map(
        (m) => `
        <button class="card-flat flex flex-col items-center justify-center gap-2 min-h-[92px] p-3 transition hover:-translate-y-1"
                data-mood="${m.id}" aria-pressed="false">
          <span class="text-[1.75rem] leading-none">${m.emoji}</span>
          <span class="text-[.74rem] font-semibold text-center leading-tight">${esc(m.label)}</span>
        </button>`
      ).join('')}
    </div>
  </section>

  <!-- ══ KUTUCUKLAR ══ -->
  <section class="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

    <article class="card p-6 md:col-span-2">
      <header class="flex items-center gap-2.5 mb-5">
        <span style="color:var(--primary)">${icon('heart')}</span>
        <h3 class="text-[1.1rem]">Birlikteyiz</h3>
        <span class="label ml-auto">31 Mayıs 2026'dan beri</span>
      </header>
      <div class="grid grid-cols-5 gap-3 md:gap-4" id="love-counter">
        ${['years', 'days', 'hours', 'minutes', 'seconds']
          .map(
            (k, i) => `
          <div class="ticket px-1 py-4">
            <strong class="numeric block text-[1.35rem] md:text-[2rem] leading-none" style="color:var(--primary)"
                    data-cnt="${k}">0</strong>
            <span class="label block mt-1.5" style="font-size:.56rem">${['Yıl', 'Gün', 'Saat', 'Dakika', 'Saniye'][i]}</span>
          </div>`
          )
          .join('')}
      </div>
    </article>

    <article class="card p-6 flex flex-col">
      <header class="flex items-center gap-2.5 mb-5">
        <span style="color:var(--accent)">${icon('cart')}</span>
        <h3 class="text-[1.1rem]">Alışveriş takibi</h3>
      </header>
      <div id="wishlist-summary" class="flex-1 flex flex-col">
        <div class="skeleton h-16 w-full"></div>
      </div>
      <a href="#/alisveris" class="btn btn-quiet btn-sm mt-4 no-underline">${icon('chevronRight', 'ico-sm')}Listeyi aç</a>
    </article>

    <article class="card p-6">
      <header class="flex items-center gap-2.5 mb-5">
        <span style="color:var(--primary)">${icon('book')}</span>
        <h3 class="text-[1.1rem]">Günlük</h3>
        <span class="badge ml-auto">${icon('lock', 'ico-sm')}Kilitli</span>
      </header>
      <p id="diary-summary" class="text-[.9rem] text-muted mb-5">Yükleniyor…</p>
      <div class="grid grid-cols-2 gap-2">
        <a href="#/gunluk-yasemin" class="btn btn-quiet btn-sm no-underline">Yasemin</a>
        <a href="#/gunluk-kagan" class="btn btn-quiet btn-sm no-underline">Kağan</a>
      </div>
    </article>

    <article class="card p-6">
      <header class="flex items-center gap-2.5 mb-5">
        <span style="color:var(--accent)">${icon('film')}</span>
        <h3 class="text-[1.1rem]">Film önerileri</h3>
      </header>
      <div class="flex gap-2.5 mb-4" id="film-teaser">
        ${'<div class="flex-1 aspect-[2/3] skeleton"></div>'.repeat(3)}
      </div>
      <p class="text-[.88rem] text-muted">Hikâye anlat, yapay zekâ filmi bulsun.</p>
      <a href="#/filmler" class="btn btn-quiet btn-sm mt-4 no-underline">${icon('play', 'ico-sm')}Vizyona git</a>
    </article>

    <article class="card p-6">
      <header class="flex items-center gap-2.5 mb-5">
        <span style="color:var(--primary)">${icon('shirt')}</span>
        <h3 class="text-[1.1rem]">Günün kombini</h3>
      </header>
      <div class="flex items-baseline gap-3">
        <strong class="numeric text-[2.1rem] leading-none">22°</strong>
        <span class="text-[.88rem] text-muted">Ankara · Parçalı bulutlu</span>
      </div>
      <p class="text-[.88rem] text-muted mt-3.5 leading-relaxed">
        "İnce bir ceket ve pamuklu bluz bugün için harika olur mimarım."
      </p>
      <a href="#/gardirop" class="btn btn-quiet btn-sm mt-4 no-underline">${icon('chevronRight', 'ico-sm')}Gardıroba git</a>
    </article>
  </section>

  <!-- ══ ÜZGÜN MODALI ══ -->
  <div class="modal-overlay" id="uzgun-modal">
    <div class="modal" style="max-width:520px" role="dialog" aria-modal="true">
      <div class="modal-header">
        <span class="text-2xl">🥺</span>
        <h3 class="modal-title">Dur bakalım</h3>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>
      <div class="modal-body">
        <p class="text-[1rem] leading-relaxed">${esc(UZGUN_TEXT)}</p>
        <p class="label card-inset p-3">Not: Site benim değil mi abi, istediğimi yazabiliyorum tak diye. Çok mutluyum.</p>
      </div>
      <div class="modal-footer"><button class="btn btn-primary" data-close>Tamam aşkım</button></div>
    </div>
  </div>`
}

export function mount(root) {
  const cleanups = []

  /* ── Aşk sayacı ── */
  const cnt = {}
  $$('[data-cnt]', root).forEach((el) => { cnt[el.dataset.cnt] = el })
  const tick = () => {
    const diff = Date.now() - LOVE_START.getTime()
    if (diff < 0) return
    const s = Math.floor(diff / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    cnt.years.textContent = Math.floor(d / 365)
    cnt.days.textContent = d % 365
    cnt.hours.textContent = String(h % 24).padStart(2, '0')
    cnt.minutes.textContent = String(m % 60).padStart(2, '0')
    cnt.seconds.textContent = String(s % 60).padStart(2, '0')
  }
  tick()
  const timer = setInterval(tick, 1000)
  cleanups.push(() => clearInterval(timer))

  /* ── Mod takibi ── */
  const uzgunModal = $('#uzgun-modal', root)
  wireModal(uzgunModal)

  const statusEl = $('#mood-status', root)
  const moodBtns = $$('#mood-grid [data-mood]', root)
  const personTabs = $$('#person-tabs [data-person]', root)
  let person = 'yasemin'

  const collectionFor = (p) => (p === 'kagan' ? PATHS.moodKagan : PATHS.moodYasemin)
  const nameFor = (p) => (p === 'kagan' ? 'Kağan' : 'Yasemin')

  async function loadMood(p) {
    moodBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'))
    statusEl.textContent = 'Yükleniyor…'
    try {
      const q = query(collection(db, collectionFor(p)), orderBy('timestamp', 'desc'), limit(1))
      const snap = await getDocs(q)
      if (snap.empty) {
        statusEl.textContent = `${nameFor(p)} için henüz mod seçilmedi.`
        return
      }
      const data = snap.docs[0].data()
      moodBtns.forEach((b) => {
        if (b.dataset.mood === data.mood) {
          b.setAttribute('aria-pressed', 'true')
          b.style.borderColor = 'var(--primary)'
          b.style.background = 'var(--primary-soft)'
        } else {
          b.style.borderColor = ''
          b.style.background = ''
        }
      })
      statusEl.innerHTML = `Son kayıt: <b style="color:var(--text)">${esc(data.moodText || '')}</b> · ${esc(formatDate(data.timestamp))}`
    } catch (err) {
      console.warn('[mod]', err)
      statusEl.textContent = 'Mod yüklenemedi.'
    }
  }

  personTabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      personTabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)))
      person = tab.dataset.person
      loadMood(person)
    })
  )

  moodBtns.forEach((btn) =>
    btn.addEventListener('click', async () => {
      const moodId = btn.dataset.mood
      const mood = MOODS.find((m) => m.id === moodId)
      moodBtns.forEach((b) => {
        const active = b === btn
        b.setAttribute('aria-pressed', String(active))
        b.style.borderColor = active ? 'var(--primary)' : ''
        b.style.background = active ? 'var(--primary-soft)' : ''
      })
      statusEl.textContent = 'Kaydediliyor…'

      try {
        // "Üzgün" için tek seferlik özel mesaj (yalnızca Yasemin)
        if (person === 'yasemin' && moodId === 'uzgun') {
          const ref = doc(db, PATHS.settings, 'uzgunPopup')
          const snap = await getDoc(ref)
          if (!snap.exists() || snap.data().shown === 0) {
            openModal(uzgunModal)
            await setDoc(ref, { shown: 1 })
          }
        }

        await addDoc(collection(db, collectionFor(person)), {
          user: person,
          mood: moodId,
          moodText: mood.label,
          timestamp: serverTimestamp(),
        })

        statusEl.innerHTML = `<span style="color:var(--ok)">Kaydedildi:</span> <b style="color:var(--text)">${esc(mood.label)}</b>`
        if (moodId === 'asik' || moodId === 'beraber') heartBurst(14)
      } catch (err) {
        console.error('[mod kayıt]', err)
        statusEl.textContent = 'Kaydedilemedi, tekrar dene.'
        toast('Mod kaydedilemedi.', '⚠️')
      }
    })
  )

  loadMood(person)

  /* ── Alışveriş özeti (canlı) ── */
  const summary = $('#wishlist-summary', root)
  const unsub = onSnapshot(
    query(collection(db, ...PATHS.wishlistItems), orderBy('createdAt', 'desc')),
    (snap) => {
      const items = snap.docs.map((d) => d.data())
      const discounted = items.filter((i) => i.currentPrice && i.initialPrice && i.currentPrice < i.initialPrice)
      const latest = items[0]
      summary.innerHTML = `
        <div class="flex gap-7 mb-4">
          <div><strong class="numeric block text-[2rem] leading-none">${items.length}</strong>
               <span class="label block mt-1">Takipte</span></div>
          <div><strong class="numeric block text-[2rem] leading-none" style="color:var(--ok)">${discounted.length}</strong>
               <span class="label block mt-1">İndirimde</span></div>
        </div>
        ${
          latest
            ? `<div class="card-inset flex items-center gap-3 p-3 mt-auto">
                 <span class="w-10 h-10 shrink-0 rounded-chip bg-surface-2"></span>
                 <span class="min-w-0">
                   <span class="block text-[.84rem] font-semibold truncate">${esc(latest.title || 'Ürün')}</span>
                   <span class="block text-[.76rem]" style="color:var(--ok)">${latest.currentPrice ? esc(tl(latest.currentPrice)) : ''}</span>
                 </span>
               </div>`
            : `<p class="text-[.86rem] text-muted mt-auto">Henüz takip edilen ürün yok.</p>`
        }`
    },
    () => { summary.innerHTML = `<p class="text-[.86rem] text-muted">Liste okunamadı.</p>` }
  )
  cleanups.push(unsub)

  /* ── Günlük özeti ── */
  ;(async () => {
    const el = $('#diary-summary', root)
    try {
      const snap = await getDocs(query(collection(db, ...PATHS.diaryEntries('Diary')), orderBy('createdAt', 'desc'), limit(1)))
      const total = (await getDocs(collection(db, ...PATHS.diaryEntries('Diary')))).size
      if (snap.empty) { el.textContent = 'Henüz giriş yok. İlk sayfayı yazmaya ne dersin?'; return }
      const last = snap.docs[0].data()
      el.innerHTML = `Toplam <b style="color:var(--text)">${total}</b> giriş. Son giriş: <i>"${esc(String(last.title || '').slice(0, 42))}"</i>`
    } catch {
      el.textContent = 'Günlük özeti okunamadı.'
    }
  })()

  /* ── Film teaser ── */
  ;(async () => {
    const el = $('#film-teaser', root)
    try {
      const snap = await getDocs(query(collection(db, ...PATHS.watchedMovies), orderBy('savedAt', 'desc'), limit(3)))
      if (snap.empty) { el.innerHTML = `<p class="text-[.86rem] text-muted">Kaydedilmiş film yok.</p>`; return }
      el.innerHTML = snap.docs
        .map((d) => {
          const m = d.data()
          const poster = safeUrl(m.posterUrl)
          return `<span class="flex-1 aspect-[2/3] rounded-chip overflow-hidden bg-surface-2 block film-strip relative">
            ${poster
              ? `<img src="${poster}" alt="${esc(m.title || '')}" class="w-full h-full object-cover" loading="lazy">`
              : `<span class="w-full h-full grid place-items-center text-faint">${icon('film')}</span>`}
          </span>`
        })
        .join('')
    } catch {
      el.innerHTML = `<p class="text-[.86rem] text-muted">Afişler yüklenemedi.</p>`
    }
  })()

  return () => cleanups.forEach((fn) => { try { fn() } catch {} })
}
