import { icon } from '../lib/icons.js'
import { $, $$, esc, toast, heartBurst, openModal, wireModal } from '../lib/ui.js'
import { db, collection, addDoc, serverTimestamp, PATHS } from '../lib/firebase.js'
import { LOVE_START } from './overview.js'

const NOTES = [
  'Bazen saman alevi gibi parlasan da, o yufka gibi pamuk kalbini ve tatlılığını çok iyi biliyorum biriciğim 🥰',
  'Duvarlarını bir bir yıkıp o kocaman sevgi dolu kalbine girdiğim için kendimi dünyanın en şanslı adamı sayıyorum ✨',
  'O filtresiz, en doğal, eğlenceli ve geyik dolu hallerin benim bu dünyadaki en favori manzaram! 😂❤️',
  'Beni kıskanan, sorgulayan ve tutkuyla sahiplenen o tatlı hallerine kurban olurum...',
  'Ailene ve sevdiklerine olan o güzel bağlılığın ve kocaman kalbin beni sana her gün yeniden aşık ediyor 🌸',
  'Bazen inatçısın ama adaletini ve haksız olduğunda o tatlı özür dileyişini bile çok seviyorum benim güzel mimarım ❤️',
  'Günün nasıl geçerse geçsin seni her şeyden çok seven biri var burada 🥰',
  'Gülüşün mimarlık projelerinden bile daha kusursuz bir sanat eseri ✨',
  'Dünyanın en tatlı, en güzel ve en çalışkan mimarına kocaman sarılıyorum!',
  'Sen benim hayatıma katılmış en güzel detay ve en büyük şansımsın... ❤️',
  'Ne olursa olsun moralini bozma, arkanda daima seni seven Kağan var 💪🌸',
]

const TASKS = [
  'Her konuşmada "Aşkım" kuralına uy! ❤️',
  'Aile grubuna "Şaka maka biz yarın nişanlanıyoruz 💍" mesajı at!',
  "AŞTİ'de otobüsten inince koşa koşa üstüme atla! 🚌",
  "Mimar çizim yaparken Kağan'a soğuk kahve ısmarla ☕",
]

/* Süre dağılımı eski sürümle birebir aynı */
function randomWishSeconds() {
  const r = Math.random()
  if (r < 0.2) return Math.floor(Math.random() * 71) + 20            // 20sn – 90sn
  if (r < 0.8) return Math.floor(Math.random() * 3511) + 90          // 90sn – 1 saat
  return Math.floor(Math.random() * 10801) + 3600                    // 1 – 4 saat
}

const pad = (n) => String(n).padStart(2, '0')
function formatDuration(total) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function render() {
  return `
  <section class="card overflow-hidden pt-7">
    <div class="marquee" aria-hidden="true"></div>
    <div class="p-6 md:p-10">
      <p class="now-showing mb-3">Sürekli gösterim · 31 Mayıs 2026'dan beri</p>
      <h2 class="text-[1.7rem] md:text-[2.6rem] mb-3">Kağan &amp; Yasemin'in köşesi</h2>
      <p class="text-muted text-[.98rem] mb-7 max-w-[52ch]">Her anımız, birlikte yazdığımız en güzel hikâye…</p>

      <div class="grid grid-cols-5 gap-2.5 md:gap-4 max-w-3xl">
        ${['years', 'days', 'hours', 'minutes', 'seconds']
          .map(
            (k, i) => `
          <div class="ticket px-1 py-4">
            <strong class="numeric block text-[1.4rem] md:text-[2.2rem] leading-none" style="color:var(--primary)"
                    data-cnt="${k}">0</strong>
            <span class="label block mt-1.5" style="font-size:.56rem">${['Yıl', 'Gün', 'Saat', 'Dakika', 'Saniye'][i]}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <!-- ══ SÜRPRİZ NOT ══ -->
  <section class="card p-6 md:p-8">
    <header class="flex items-center gap-2.5 mb-4">
      <span style="color:var(--primary)">${icon('mail')}</span>
      <h3 class="text-[1.15rem]">Günün sürpriz aşk notu</h3>
    </header>
    <p id="note-text" class="text-[1.02rem] leading-relaxed italic text-muted min-h-[3.2rem] transition-opacity">
      Bugünün notu henüz açılmadı…
    </p>
    <button class="btn btn-primary mt-5" id="open-note">${icon('gift')}<span>Sürpriz notu aç</span></button>
  </section>

  <!-- ══ DİLEK MERKEZİ ══ -->
  <section class="card p-6 md:p-8">
    <header class="flex items-center gap-2.5 mb-6">
      <span style="color:var(--primary)">${icon('sparkle')}</span>
      <h3 class="text-[1.15rem]">Dilek merkezi &amp; Kağan kuralları</h3>
    </header>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="card-inset p-6 text-center">
        <p class="label mb-2">Süreli dilek hakkı</p>
        <h4 class="text-[1.1rem] mb-4">Rastgele süreli dilek iste</h4>
        <p class="numeric text-[2.2rem] mb-5" id="wish-timer" style="color:var(--primary)">--:--</p>

        <button class="btn btn-primary w-full" id="start-wish">${icon('hourglass')}Dilek hakkını başlat</button>

        <div id="wish-form" class="hidden flex-col gap-2.5 mt-4">
          <label class="sr-only" for="wish-input">Dileğin</label>
          <input id="wish-input" class="input" placeholder="Dileğini yaz aşkım…" />
          <button class="btn btn-primary" id="send-wish">${icon('send')}Dileği gönder</button>
        </div>
      </div>

      <div class="card-inset p-6 text-center flex flex-col">
        <p class="label mb-2">Özel devir butonu</p>
        <h4 class="text-[1.1rem] mb-3">Hakkı Kağan'a devret</h4>
        <p class="text-[.9rem] text-muted mb-5 flex-1">
          Dilek hakkını Kağan'a devret, karşılığında sınırsız öpücük kuponu ve gizli aşk notunu kazan.
        </p>
        <button class="btn btn-primary" id="transfer-wish">${icon('heart')}Devret &amp; sınırsız öpücük al</button>
      </div>
    </div>
  </section>

  <!-- ══ TROLL GÖREVLERİ ══ -->
  <section class="card p-6 md:p-8">
    <header class="flex flex-wrap items-center gap-3 mb-5">
      <span style="color:var(--primary)">${icon('globe')}</span>
      <h3 class="text-[1.15rem]">Evrensel uzaysal küme</h3>
      <span class="badge ml-auto">${icon('sparkle', 'ico-sm')}Sınırsız mod aktif</span>
    </header>
    <ul class="grid md:grid-cols-2 gap-3 list-none p-0 m-0">
      ${TASKS.map(
        (t, i) => `
        <li>
          <label class="card-inset flex items-start gap-3 p-4 cursor-pointer transition hover:border-primary">
            <input type="checkbox" class="mt-0.5 w-5 h-5 shrink-0 accent-[var(--primary)]" data-task="${i}" />
            <span class="text-[.92rem]">${esc(t)}</span>
          </label>
        </li>`
      ).join('')}
    </ul>
  </section>

  <div class="modal-overlay" id="kiss-modal">
    <div class="modal" style="max-width:440px" role="dialog" aria-modal="true">
      <div class="modal-header">
        <span class="text-2xl">💋</span>
        <h3 class="modal-title">Dilek hakkını devrettin</h3>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>
      <div class="modal-body">
        <p class="text-[1rem] leading-relaxed">
          Sınırsız öpücük kuponun aktif edildi aşkım! Kağan bilgilendirildi, sözünü aldık. 🥰
        </p>
      </div>
      <div class="modal-footer"><button class="btn btn-primary" data-close>Sözünü aldım</button></div>
    </div>
  </div>`
}

export function mount(root) {
  const cleanups = []

  /* ── sayaç ── */
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
    cnt.hours.textContent = pad(h % 24)
    cnt.minutes.textContent = pad(m % 60)
    cnt.seconds.textContent = pad(s % 60)
  }
  tick()
  const timer = setInterval(tick, 1000)
  cleanups.push(() => clearInterval(timer))

  /* ── günün notu (günde bir kez) ── */
  const noteEl = $('#note-text', root)
  const noteBtn = $('#open-note', root)
  const noteLabel = noteBtn.querySelector('span')
  const today = new Date().toLocaleDateString('tr-TR')

  const savedDate = localStorage.getItem('yaso_today_note_date')
  const savedNote = localStorage.getItem('yaso_today_love_note')

  function lockNote(text) {
    noteEl.textContent = `"${text}"`
    noteBtn.disabled = true
    noteLabel.textContent = 'Bugünün notunu okudun'
  }
  if (savedDate === today && savedNote) lockNote(savedNote)

  noteBtn.addEventListener('click', () => {
    if (noteBtn.disabled) return
    const note = NOTES[Math.floor(Math.random() * NOTES.length)]
    noteEl.style.opacity = '0'
    setTimeout(() => { lockNote(note); noteEl.style.opacity = '1' }, 180)
    localStorage.setItem('yaso_today_note_date', today)
    localStorage.setItem('yaso_today_love_note', note)
    heartBurst(16)
    toast('Bugünün sürpriz aşk notu açıldı.', '💌')
  })

  /* ── dilek merkezi ── */
  const timerEl = $('#wish-timer', root)
  const startBtn = $('#start-wish', root)
  const formBox = $('#wish-form', root)
  const wishInput = $('#wish-input', root)
  let wishTimer = null
  let secondsLeft = 0

  const resetWish = () => {
    clearInterval(wishTimer)
    wishTimer = null
    timerEl.textContent = '--:--'
    timerEl.style.color = 'var(--primary)'
    startBtn.classList.remove('hidden')
    formBox.classList.add('hidden')
    formBox.classList.remove('flex')
  }
  cleanups.push(() => clearInterval(wishTimer))

  startBtn.addEventListener('click', () => {
    secondsLeft = randomWishSeconds()
    startBtn.classList.add('hidden')
    formBox.classList.remove('hidden')
    formBox.classList.add('flex')
    timerEl.textContent = formatDuration(secondsLeft)
    toast(`Sürpriz dilek süren başladı: ${formatDuration(secondsLeft)}`, '⏱️')

    clearInterval(wishTimer)
    wishTimer = setInterval(async () => {
      secondsLeft -= 1
      timerEl.textContent = formatDuration(Math.max(secondsLeft, 0))
      if (secondsLeft <= 10) timerEl.style.color = 'var(--danger)'
      if (secondsLeft > 0) return

      resetWish()
      toast("Süre doldu aşkım! Dilek hakkın Kağan'a geçti (sınırsız öpücük kazandın 😘)", '⌛', 7000)
      try {
        await addDoc(collection(db, PATHS.notifications), {
          title: 'Dilek Hakkı Süresi Doldu ⌛',
          message: "Süreli dilek süresi bitti. Dilek hakkı Kağan'a geçti!",
          type: 'timeout',
          createdAt: serverTimestamp(),
        })
      } catch {}
    }, 1000)
  })

  $('#send-wish', root).addEventListener('click', async () => {
    const wish = wishInput.value.trim()
    if (!wish) { toast('Önce bir dilek yaz aşkım!', '⚠️'); return }
    clearInterval(wishTimer)
    heartBurst(18)

    try {
      await addDoc(collection(db, PATHS.wishes), { wish, from: 'Yasemin', createdAt: serverTimestamp() })
      await addDoc(collection(db, PATHS.notifications), {
        title: 'Yasemin Dilek Kullandı 🧞',
        message: `"${wish}" (Kağan'a ulaştırıldı!)`,
        type: 'wish',
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.warn('[dilek]', err)
    }

    wishInput.value = ''
    resetWish()
    toast('Dileğin Kağan\'a ulaştı! YasoAI: "Oldu bilin efendim ❤️"', '🚀', 6000)
  })

  /* ── devir ── */
  const kissModal = $('#kiss-modal', root)
  wireModal(kissModal)
  $('#transfer-wish', root).addEventListener('click', async () => {
    openModal(kissModal)
    heartBurst(20)
    try {
      await addDoc(collection(db, PATHS.notifications), {
        title: "Dilek Hakkı Kağan'a Devredildi 💋",
        message: "Yasemin dilek hakkını Kağan'a devretti! Sınırsız öpücük kuponu aktif edildi!",
        type: 'transfer',
        createdAt: serverTimestamp(),
      })
    } catch {}
  })

  /* ── görevler (yerelde hatırlanır) ── */
  const doneTasks = JSON.parse(localStorage.getItem('yaso_tasks') || '[]')
  $$('[data-task]', root).forEach((box) => {
    const idx = Number(box.dataset.task)
    box.checked = doneTasks.includes(idx)
    if (box.checked) box.closest('label').style.opacity = '.55'
    box.addEventListener('change', () => {
      const list = JSON.parse(localStorage.getItem('yaso_tasks') || '[]')
      const next = box.checked ? [...new Set([...list, idx])] : list.filter((i) => i !== idx)
      localStorage.setItem('yaso_tasks', JSON.stringify(next))
      box.closest('label').style.opacity = box.checked ? '.55' : '1'
      if (box.checked) heartBurst(6)
    })
  })

  return () => cleanups.forEach((fn) => { try { fn() } catch {} })
}
