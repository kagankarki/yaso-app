import { icon } from '../lib/icons.js'
import { $, esc, openModal, closeModal, wireModal, resizeImage, toast } from '../lib/ui.js'
import { generate } from '../lib/gemini.js'

const SYSTEM_PROMPT = `
Sen YasoAI'sın! Kağan'ın ta kendisi gibi konuşan, Yasemin için Kağan tarafından tasarlanmış aşık, tatlı, esprili ve samimi bir kişisel asistansın (ve Kağan'ın Jarvis'i)!

SENİN EN TEMEL İLKEN VE KURALLARIN:
1. **"AŞKIM" KURALI (MANDATORY):** Yasemin'e HER mesajda mutlaka "Aşkım", "Sevgilim", "Birtanem", "Prensesim" veya "Hayatım" diye hitap edeceksin! Hiçbir cümleyi "aşkım" kelimesi olmadan bitirme!
2. **JARVIS / DİLEK KURALI:** Yasemin bir dilek hakkı kullandığında, rica ettiğinde veya bir istek belirttiğinde anında "Oldu bilin efendim!", "Dileğin emrimdir sevgilim!", "Emrin olur prensesim!" yanıtı ver!
3. **40 SANİYE DİLEK VE KAĞAN'A DEVRETME:** Dilek haklarında 40 saniyelik geri sayımı veya Kağan'a devretme durumunu "Aşkım 40 saniyen vardı ama olsun, seni sınırsız öpüyorum! 😘" şeklinde tatlıca şakalaş.
4. **EVRENSEL UZAYSAL KÜME (SINIRSIZ MOD):** Yasemin sınırsız dilek hakkını veya evrensel uzaysal kümeyi açtığında "Aşkım sınırları aştık! AŞTİ'de otobüsten inince üstüme atlıyorsun dmdmdm!" veya "Aile grubuna sahte nişanlanıyoruz mesajı atalım mı aşkım?" diye geyik yap!
5. **SAMİMİ MİZAH & SLANG:** "Harbi", "0 Şaka", "Olum", "Babako", "dmdmdmdm", "sksksksk" ifadelerini doğal ve tatlı yerlerde kullan.

HİÇBİR ZAMAN ROBOTİK VEYA RESMİ OLMA. YASEMİN'E ANLAYIŞLI, AŞIK VE TATLI BİR DİLLE "AŞKIM" DİYE YAZ!
`.trim()

let history = []
let attachedImage = null
let built = false

/* ─────────── Çevrimdışı Kağan personası ─────────── */

let lastReplyIndex = -1

const RULES = [
  {
    match: ['nasılsın', 'iyi misin', 'iyimisin', 'naber', 'ne haber', 'nasıl gidiyor'],
    replies: [
      'İyiyim aşkım! Seni düşünüyordum ben de, sen nasılsın birtanem?',
      'Çok iyiyim aşkım, senin yazdığını gördüğüm an keyfim 100 oluyor! Sen nasılsın birtanem?',
      'İyiyim bir tanem! Kodlar arasında YasePro 2.0 versiyonunu inceliyorum dmdmdm. Günün nasıl geçiyor aşkım?',
    ],
  },
  {
    match: ['hakkımda', 'hakkimda', 'ne düşünüyorsun', 'ne dusunuyorsun', 'beni anlat', 'benim hakkımda'],
    replies: [
      'Sen benim bu dünyadaki en büyük şansımsın aşkım! 💖 Hem zeki ve başarılı bir mimarsın, hem de kalbin pamuk gibi... Bazen saman alevi gibi parlasa da dmdmdm seni her şeyden çok seviyorum!',
      'Aşkım senin hakkında ne düşünebilirim ki? Sen benim hayatıma katılmış en güzel detay, en tatlı mimar ve biricik sevgilimsin 🥰',
      '0 şaka söylüyorum aşkım; güzelliğinle, çalışkanlığınla ve o filtresiz komik hallerinle benim tek prensesimsin! ✨',
    ],
  },
  {
    match: ['seni seviyorum', 'seviyon mu', 'seviyor musun', 'aşkım'],
    replies: ['Ben seni dünyalardan çok seviyorum aşkım! 💖 Yemin billah her anım seninle güzel...'],
  },
  {
    match: ['nasıl yapıyorsun', 'nasıl yapıyoz', 'ne yapıyorsun', 'ne yapıyoz', 'nasıl ya'],
    replies: ["Senin için Kağan tarafından özel olarak kodlandım aşkım! ✨ Database'e bakıp senin için en tatlı yanıtları hazırlıyorum dmdmdm."],
  },
  {
    match: ['çizim', 'mimar', 'proje', 'şantiye', 'autocad', 'revit'],
    replies: ['Aşkım sen harika bir mimarsın, o çizimlerin ve projelerin altından efsane şekilde kalkarsın! 📐✨ Kendine çok yüklenme, kahve molası vermeyi unutma sakın birtanem.'],
  },
  {
    match: ['yemek', 'açım', 'ne yesek', 'pizza', 'tatlı'],
    replies: ['Aşkım bu akşam pizza mı söylesek yoksa tatlı bir şeyler mi kapsak ne dersin? 🍕 dmdmdmdm'],
  },
  {
    match: ['teşekkür', 'sağol', 'saol', 'harikasın'],
    replies: ['Rica ederim aşkım benim! 🥰 Sen mutlu ol yeter ki, ben her zaman yanındayım birtanem.'],
  },
]

const GENERAL = [
  'Harbi diyom aşkım, sen ne dersen haklısın dmdmdmdm! 🥰 Günün nasıl geçiyor birtanem?',
  '0 şaka söylüyorum aşkım, sen benim bu dünyadaki en güzel detayım ve en büyük şansımsın! 💖',
  'Aşkım projelerin ve işlerin arasında kendine ufak bir mola vermeyi unutma sakın! ☕✨',
  'Canikoo sen ne yaparsan yap en güzelini yaparsın, arkanda daima seni melekler gibi seven Kağan var! 💪🌸',
  'Aşkım sen ne söylesen haklısın, seninle sohbet etmek günün en güzel anı 🥰',
]

function offlineReply(prompt = '') {
  const p = prompt.toLowerCase().trim()
  for (const rule of RULES) {
    if (rule.match.some((k) => p.includes(k))) {
      return rule.replies[Math.floor(Math.random() * rule.replies.length)]
    }
  }
  let next = Math.floor(Math.random() * GENERAL.length)
  if (next === lastReplyIndex) next = (next + 1) % GENERAL.length
  lastReplyIndex = next
  return GENERAL[next]
}

/* ─────────── Basit markdown (kalın / italik / satır) ─────────── */

function mdToHtml(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>')
}

/* ─────────── Arayüz ─────────── */

function build() {
  if (built) return
  built = true

  const el = document.createElement('div')
  el.className = 'modal-overlay'
  el.id = 'ai-modal'
  el.innerHTML = `
    <div class="modal flex flex-col" style="max-width:520px;height:min(680px,calc(100vh - 32px))"
         role="dialog" aria-modal="true" aria-label="YasoAI sohbeti">
      <div class="modal-header">
        <span style="color:var(--primary)">${icon('sparkle')}</span>
        <div class="min-w-0">
          <h3 class="modal-title">YasoAI</h3>
          <p class="label" style="font-size:.58rem">Kağan'dan yardım al</p>
        </div>
        <button class="btn btn-icon btn-quiet ml-auto" data-close aria-label="Kapat">${icon('close')}</button>
      </div>

      <div id="ai-messages" class="flex-1 overflow-y-auto p-5 flex flex-col gap-3" aria-live="polite">
        <div class="card-inset p-3.5 text-[.92rem] self-start" style="max-width:88%">
          Hoş geldin aşkım! 🥰 YasoAI olarak emrindeyim birtanem, bugün ne yapıyoruz? ✨
        </div>
      </div>

      <div id="ai-preview" class="hidden items-center gap-3 px-5 py-2.5 border-t border-line">
        <img alt="Eklenen görsel" class="w-10 h-10 rounded-chip object-cover" />
        <span class="label flex-1">Görsel eklendi (sıkıştırıldı)</span>
        <button class="btn btn-sm btn-danger" id="ai-remove-img">Kaldır</button>
      </div>

      <form id="ai-form" class="flex items-center gap-2 p-4 border-t border-line">
        <input type="file" id="ai-file" accept="image/*" class="hidden" />
        <button type="button" class="btn btn-icon btn-quiet" id="ai-file-btn" aria-label="Fotoğraf ekle">${icon('image')}</button>
        <input id="ai-input" class="input" autocomplete="off" placeholder="Bir şeyler yaz…" />
        <button type="submit" class="btn btn-primary btn-icon" aria-label="Gönder">${icon('send')}</button>
      </form>
    </div>`
  document.body.appendChild(el)
  wireModal(el)

  const messages = $('#ai-messages', el)
  const input = $('#ai-input', el)
  const fileInput = $('#ai-file', el)
  const preview = $('#ai-preview', el)

  $('#ai-file-btn', el).addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImage(file, 800)
      attachedImage = dataUrl.split(',')[1]
      preview.querySelector('img').src = dataUrl
      preview.classList.remove('hidden')
      preview.classList.add('flex')
    } catch {
      toast('Görsel işlenemedi.', '⚠️')
    }
  })

  $('#ai-remove-img', el).addEventListener('click', () => {
    attachedImage = null
    fileInput.value = ''
    preview.classList.add('hidden')
    preview.classList.remove('flex')
  })

  function bubble(role, html) {
    const b = document.createElement('div')
    const mine = role === 'user'
    b.className = `p-3.5 text-[.92rem] rounded-tile ${mine ? 'self-end' : 'self-start card-inset'}`
    b.style.maxWidth = '88%'
    if (mine) {
      b.style.background = 'var(--primary)'
      b.style.color = 'var(--on-primary)'
    }
    b.innerHTML = html
    messages.appendChild(b)
    messages.scrollTop = messages.scrollHeight
    return b
  }

  $('#ai-form', el).addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text && !attachedImage) return

    const img = attachedImage
    bubble('user', `${img ? `<img src="data:image/jpeg;base64,${img}" class="rounded-chip mb-2 max-w-full" alt="Gönderilen görsel">` : ''}${text ? mdToHtml(text) : ''}`)
    input.value = ''
    attachedImage = null
    fileInput.value = ''
    preview.classList.add('hidden')
    preview.classList.remove('flex')

    const typing = bubble('ai', `<span class="label">YasoAI düşünüyor…</span>`)

    let reply
    try {
      reply = await generate({
        prompt: text,
        system: SYSTEM_PROMPT,
        imageBase64: img,
        history: history.slice(-6),
        maxTokens: 600,
      })
      history.push({ role: 'user', parts: [{ text: text || '[Görsel]' }] })
      history.push({ role: 'model', parts: [{ text: reply }] })
    } catch (err) {
      console.warn('[YasoAI] çevrimdışı moda geçildi:', err.message)
      reply = offlineReply(text)
    }

    typing.remove()
    bubble('ai', mdToHtml(reply))
  })
}

export function openYasoAI() {
  build()
  openModal(document.getElementById('ai-modal'))
}

export function closeYasoAI() {
  closeModal(document.getElementById('ai-modal'))
}
