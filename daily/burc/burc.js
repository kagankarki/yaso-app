// Günlük Burç — Aslan Kadını yorumu + Balık Erkeği & Aslan Kadını ilişkisi.
//
// Kaynak: freehoroscopeapi.com (ücretsiz, anahtarsız). Servis CORS başlığı
// göndermediği için /api/burc/<dönem>/<burç> yoluyla aynı origin'den
// geçiyoruz (geliştirmede vite.config.js proxy'si, canlıda vercel.json).
// Metinler İngilizce geliyor; Google Translate'in ücretsiz uç noktasıyla
// Türkçeye çevriliyor (o olmazsa MyMemory, o da olmazsa orijinal metin).
//
// Günün sonucu Firestore'da DailyHoroscope/<YYYY-MM-DD> belgesinde saklanır:
// API'ye ve çeviriye günde bir kez gidilir, ikimiz de aynı yorumu görürüz.
// Tarih değişince yeni belge açılır; sayfa her gün kendiliğinden yenilenir.
import { db, doc, getDoc, setDoc } from '../../firebase-config.js';
import { generateGeminiText } from '../../gemini.js';
import { esc } from '../../utils.js';

const PERIOD_LABELS = { daily: 'Bugün', weekly: 'Bu Hafta', monthly: 'Bu Ay' };
const LOCAL_KEY = 'yaso_burc_';

const SCORES = [
  { key: 'ask', label: 'Aşk', icon: '❤️' },
  { key: 'tutku', label: 'Tutku', icon: '🔥' },
  { key: 'iletisim', label: 'İletişim', icon: '💬' },
  { key: 'uyum', label: 'Uyum', icon: '🤝' }
];

// Balık erkeği & Aslan kadını için genel kabul gören uyum seviyeleri;
// günlük skorlar bunların etrafında tarihe bağlı olarak oynar.
const BASE_SCORES = { ask: 80, tutku: 74, iletisim: 63, uyum: 68 };

// ─────────────── Yerel (Gemini'siz) günlük ilişki yorumu havuzları ───────────────
const THEMES = [
  'Romantik Sürpriz', 'Derin Sohbet', 'Birlikte Macera', 'Sakin Bir Akşam',
  'Kahkaha Günü', 'Küçük Jestler', 'Ortak Hayaller', 'Şefkat Zamanı',
  'Tutkulu Anlar', 'Sahne Senin'
];

const OPENINGS = {
  high: [
    "Bugün yıldızlar ikinizden yana: Balık'ın şefkatli sezgisi, Aslan'ın sıcak ve cömert kalbiyle aynı ritimde atıyor.",
    "Güneş'in kızı Aslan ile Neptün'ün oğlu Balık bugün adeta bir film sahnesinde; duygular yüksek, enerji tatlı.",
    "Ateşle suyun buhar olup göğe yükseldiği günlerden biri; bugün aranızdaki çekim her zamankinden güçlü."
  ],
  mid: [
    "Bugün dengeli bir gün: Aslan sahneyi isterken Balık kulisten alkışlıyor ve ikiniz de bundan memnunsunuz.",
    "Enerjiler yumuşak ve sakin; büyük sürprizlerden çok küçük ve samimi anlar bugün daha değerli.",
    "Aslan'ın ışığı ile Balık'ın hayal gücü bugün iyi bir uyum yakalıyor; birbirinizi dinlemeye zaman ayırın yeter."
  ],
  low: [
    "Bugün ateşle su biraz cızırdayabilir; Aslan ilgi beklerken Balık kendi iç dünyasına çekilmek isteyebilir.",
    "Ufak tefek yanlış anlaşılmalara açık bir gün; sözleriniz yumuşak, sarılmalarınız uzun olsun.",
    "Aslan'ın gururu ile Balık'ın hassasiyeti bugün çarpışabilir ama günün sonunda sevgi her zaman kazanır."
  ]
};

const DYNAMICS = [
  "Balık erkeği bugün hayranlığını açıkça gösterirse Aslan kadınının kalbi anında yumuşar.",
  "Aslan kadını küçük bir plan yapıp liderliği alırsa Balık erkeği bunu en romantik sürpriz gibi yaşar.",
  "Balık'ın sessiz jestleri ile Aslan'ın coşkulu sevgisi birbirini tamamlıyor; farklılıklarınız aslında süper gücünüz.",
  "Aslan iltifatı sever, Balık da içten iltifat etmeyi; bugün bu takası bol bol yapın.",
  "Balık erkeğinin sezgileri bugün çok kuvvetli; Aslan kadınının söylemediklerini bile hissedebilir.",
  "Aslan kadınının özgüveni bugün Balık erkeğine ilham veriyor, hayallerine cesaret katıyor.",
  "Birlikte yaratıcı bir şey yapmak (yemek, müzik, çizim) bugün ikinizi de çok besler.",
  "Aslan'ın sadakati ile Balık'ın şefkati bugün aranızdaki güveni büyütüyor."
];

const TIPS = [
  "Akşam telefonları bir kenara bırakıp sadece ikiniz için yarım saat ayırın.",
  "Aslan'a bugün içten bir iltifat edin; Balık'a da gününü sorup gerçekten dinleyin.",
  "Küçük bir not, sesli mesaj ya da sürpriz bir tatlı bugün büyük etki yaratır.",
  "Planı Aslan yapsın, atmosferi Balık kursun: mum, müzik ve iyi bir film.",
  "Bir anlaşmazlık olursa önce sarılın, sonra konuşun.",
  "Birlikte gelecek hayallerinizi konuşmak için harika bir gün.",
  "Aslan'ın parlamasına alan açın, Balık'ın sessizliğine saygı gösterin.",
  "Bugün birbirinize \"iyi ki varsın\" demeyi unutmayın."
];

// Şanslı renk kartında gösterilen renkler (veri, tema rengi değil).
const LUCKY_COLORS = [
  { name: 'Altın Sarısı', hex: '#E8B33A' },
  { name: 'Mercan', hex: '#FF7F50' },
  { name: 'Bordo', hex: '#8E1B3A' },
  { name: 'Turuncu', hex: '#FF9500' },
  { name: 'Şampanya', hex: '#E9D7A8' },
  { name: 'Lavanta', hex: '#B79CED' },
  { name: 'Gül Kurusu', hex: '#C98B8B' },
  { name: 'Zümrüt', hex: '#2E9E6B' },
  { name: 'Gece Mavisi', hex: '#1F3A68' },
  { name: 'Kraliyet Moru', hex: '#6A3FA0' }
];

// ─────────────── Yardımcılar ───────────────

// Yerel tarihe göre gün anahtarı (UTC değil): gece yarısı Türkiye saatiyle döner.
function todayKey() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Aynı gün için hep aynı sayıları üreten tohumlu rastgele (FNV-1a + mulberry32).
function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = (h + 0x6D2B79F5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const overallScore = rel => Math.round(SCORES.reduce((sum, s) => sum + rel[s.key], 0) / SCORES.length);

function formatReadingDate(date, period) {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  if (period === 'monthly') {
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  }
  const day = new Date(y, (m || 1) - 1, d || 1);
  if (period === 'weekly') {
    return `${day.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} haftası`;
  }
  return day.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

// ─────────────── Günlük önbellek (localStorage + Firestore) ───────────────

function readLocal(dateKey) {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY + dateKey)) || {};
  } catch {
    return {};
  }
}

function writeLocal(dateKey, data) {
  try {
    // Sadece bugünü tut; eski günler birikmesin.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_KEY) && k !== LOCAL_KEY + dateKey) localStorage.removeItem(k);
    }
    localStorage.setItem(LOCAL_KEY + dateKey, JSON.stringify(data));
  } catch {
    // Gizli sekme / dolu depolama: önbelleksiz devam.
  }
}

function createDayStore(dateKey) {
  const local = readLocal(dateKey);
  const remoteRef = doc(db, 'DailyHoroscope', dateKey);
  let remotePromise = null;

  function loadRemote() {
    if (!remotePromise) {
      remotePromise = getDoc(remoteRef)
        .then(snap => (snap.exists() ? snap.data() : {}))
        .catch(err => {
          console.warn('Burç önbelleği okunamadı:', err);
          return {};
        });
    }
    return remotePromise;
  }

  return {
    pending: new Map(),
    async get(field) {
      if (local[field]) return local[field];
      const remote = await loadRemote();
      if (remote[field]) {
        local[field] = remote[field];
        writeLocal(dateKey, local);
        return remote[field];
      }
      return null;
    },
    save(field, value) {
      local[field] = value;
      writeLocal(dateKey, local);
      setDoc(remoteRef, { [field]: value, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(err => console.warn('Burç önbelleği yazılamadı:', err));
    }
  };
}

// ─────────────── Veri: burç yorumu + çeviri ───────────────

async function fetchHoroscope(sign, period) {
  const res = await fetch(`/api/burc/${period}/${sign}`);
  if (!res.ok) throw new Error(`Burç servisi ${res.status} döndü`);
  const json = await res.json();
  const text = json?.data?.horoscope;
  if (!text) throw new Error('Burç servisi boş yanıt verdi');
  return { en: text.trim(), date: json.data.date || null };
}

// MyMemory istek başına ~500 karakter kabul ediyor; cümle sınırından böl.
function splitForTranslation(text, max) {
  const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if (current && (current + s).length > max) {
      chunks.push(current.trim());
      current = '';
    }
    current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Çeviri bazen burç adlarını İngilizce bırakıyor ("Leo'lar", "Pisces'in").
// Ekleriyle birlikte Türkçe karşılıklarına çeviriyoruz.
const SIGN_FIXES = [
  [/\bLeo'?lar(ın|a|ı|da|dan)?\b/g, (_, ek = '') => `Aslanlar${ek}`],
  [/\bLeo'?nun\b/g, "Aslan'ın"],
  [/\bLeo'?ya\b/g, "Aslan'a"],
  [/\bLeo'?yu\b/g, "Aslan'ı"],
  [/\bLeo'?da\b/g, "Aslan'da"],
  [/\bLeo\b/g, 'Aslan'],
  [/\bPisces'?l[ae]r(ın|a|ı|da|dan)?\b/g, (_, ek = '') => `Balıklar${ek}`],
  [/\bPisces'?(in|ın)\b/g, "Balık'ın"],
  [/\bPisces'?[ae]\b/g, "Balık'a"],
  [/\bPisces'?[iı]\b/g, "Balık'ı"],
  [/\bPisces\b/g, 'Balık']
];

function fixSignNames(text) {
  return SIGN_FIXES.reduce((out, [re, to]) => out.replace(re, to), text);
}

async function translateToTurkish(text) {
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q='
      + encodeURIComponent(text);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const tr = (data?.[0] || []).map(seg => seg?.[0] || '').join('').trim();
      if (tr) return fixSignNames(tr);
    }
  } catch (err) {
    console.warn('Çeviri (Google) başarısız:', err);
  }

  try {
    const parts = [];
    for (const chunk of splitForTranslation(text, 450)) {
      const res = await fetch('https://api.mymemory.translated.net/get?langpair=en|tr&q=' + encodeURIComponent(chunk));
      const data = await res.json();
      const tr = data?.responseData?.translatedText;
      if (!res.ok || Number(data?.responseStatus) !== 200 || !tr) throw new Error('MyMemory yanıtı geçersiz');
      parts.push(tr);
    }
    return fixSignNames(parts.join(' '));
  } catch (err) {
    console.warn('Çeviri (MyMemory) başarısız:', err);
  }

  return null;
}

function getReading(store, dateKey, sign, period) {
  const field = `${sign}_${period}`;
  // Aynı yorum iki yerden aynı anda istenirse (Aslan sekmesi + ilişki) tek istek at.
  if (store.pending.has(field)) return store.pending.get(field);

  const task = (async () => {
    const cached = await store.get(field);
    if (cached?.en) return { ...cached, tr: cached.tr && fixSignNames(cached.tr) };

    const { en, date } = await fetchHoroscope(sign, period);
    const tr = await translateToTurkish(en);
    const reading = { en, tr, date };

    // Servis kendi gününe (UTC) göre dönüyor; gece yarısından hemen sonra hâlâ
    // dünün yorumunu verebilir. Bugüne ait değilse ya da çeviri olmadıysa
    // önbelleğe yazma, sonraki açılışta tekrar denensin.
    const isCurrent = period !== 'daily' || date === dateKey;
    if (isCurrent && tr) store.save(field, reading);
    return reading;
  })();

  store.pending.set(field, task);
  task.finally(() => store.pending.delete(field));
  return task;
}

// ─────────────── Veri: Balık & Aslan günlük ilişki yorumu ───────────────

function localRelation(dateKey) {
  const rand = seededRandom(`pisces-leo-${dateKey}`);
  const rel = { source: 'local' };
  for (const { key } of SCORES) {
    rel[key] = clamp(Math.round(BASE_SCORES[key] + (rand() * 2 - 1) * 14), 42, 98);
  }
  const overall = overallScore(rel);
  const band = overall >= 76 ? 'high' : overall >= 66 ? 'mid' : 'low';
  rel.tema = pick(rand, THEMES);
  rel.yorum = `${pick(rand, OPENINGS[band])} ${pick(rand, DYNAMICS)}`;
  rel.ipucu = pick(rand, TIPS);
  return rel;
}

// Anahtar geçersizken her sekme geçişinde Gemini'yi yeniden denemeyelim.
let aiUnavailable = false;

async function aiRelation(dateLabel, leoText, piscesText) {
  const prompt = `Sen sıcak, esprili ve romantik bir astrologsun. Tarih: ${dateLabel}.
Sevgili olan bir Balık erkeği ile bir Aslan kadını için bugünün ilişki yorumunu yaz.

Balık burcunun bugünkü genel yorumu: "${piscesText}"
Aslan burcunun bugünkü genel yorumu: "${leoText}"

Bu iki yorumu ve Balık erkeği - Aslan kadını dinamiğini birleştir. Türkçe, samimi ve tatlı yaz; olumsuz şeyleri yumuşak anlat.
Yalnızca şu JSON'u döndür:
{"tema": "2-4 kelimelik günün teması", "yorum": "3-4 cümlelik ilişki yorumu", "ipucu": "tek cümlelik pratik öneri", "ask": 0-100 arası tam sayı, "tutku": 0-100, "iletisim": 0-100, "uyum": 0-100}`;

  const text = await generateGeminiText({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 2048, responseMimeType: 'application/json' }
  });

  const obj = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  const rel = {
    source: 'ai',
    tema: String(obj.tema || '').trim(),
    yorum: String(obj.yorum || '').trim(),
    ipucu: String(obj.ipucu || '').trim()
  };
  for (const { key } of SCORES) {
    const n = Number(obj[key]);
    if (!Number.isFinite(n)) throw new Error(`Gemini yanıtında "${key}" eksik`);
    rel[key] = clamp(Math.round(n), 0, 100);
  }
  if (!rel.yorum || !rel.tema) throw new Error('Gemini yanıtı eksik');
  return rel;
}

async function getRelation(store, dateKey, dateLabel, leo, pisces) {
  const cached = await store.get('relation');
  if (cached) return cached;

  const bothCurrent = leo?.tr && pisces?.tr && leo.date === dateKey && pisces.date === dateKey;
  if (bothCurrent && !aiUnavailable) {
    try {
      const rel = await aiRelation(dateLabel, leo.tr, pisces.tr);
      store.save('relation', rel);
      return rel;
    } catch (err) {
      aiUnavailable = true;
      console.warn('İlişki yorumu Gemini ile alınamadı, yerel yoruma geçildi:', err.message);
    }
  }
  // Yerel yorum tarihe bağlı olduğu için gün boyu aynı kalır; önbelleğe
  // yazmıyoruz ki anahtar düzelince Gemini yorumu aynı gün gelebilsin.
  return localRelation(dateKey);
}

// ─────────────── Görünüm parçaları ───────────────

function skeletonCard(lines = 4) {
  return `
    <div class="card burc-reading" aria-busy="true">
      <div class="skeleton" style="height:12px;width:96px"></div>
      ${Array.from({ length: lines }, (_, i) =>
        `<div class="skeleton" style="height:14px;width:${i === lines - 1 ? 62 : 100}%"></div>`).join('')}
    </div>`;
}

function errorState(message, retry) {
  return `
    <div class="empty-state">
      <ion-icon name="cloud-offline-outline" class="text-4xl"></ion-icon>
      <p class="text-sm">${message} İnternet bağlantını kontrol edip tekrar dene.</p>
      <button type="button" class="btn btn-ghost btn-sm" data-burc-retry="${retry}">
        <ion-icon name="refresh-outline"></ion-icon> Tekrar Dene
      </button>
    </div>`;
}

function readingCard(reading, period) {
  const dateText = formatReadingDate(reading.date, period);
  return `
    <article class="card burc-reading">
      <div class="burc-reading-head">
        <span class="now-showing">${PERIOD_LABELS[period]}</span>
        ${dateText ? `<span class="label">${esc(dateText)}</span>` : ''}
      </div>
      <p class="burc-reading-text">${esc(reading.tr || reading.en)}</p>
      ${reading.tr
        ? `<details class="burc-original"><summary>Orijinal metin (EN)</summary><p>${esc(reading.en)}</p></details>`
        : '<p class="text-sm text-muted">Çeviri şu an yapılamadı, orijinal metin gösteriliyor.</p>'}
    </article>`;
}

function luckyTiles(dateKey) {
  const rand = seededRandom(`leo-lucky-${dateKey}`);
  const color = pick(rand, LUCKY_COLORS);
  const number = 1 + Math.floor(rand() * 33);
  const hour = 9 + Math.floor(rand() * 13);
  const hh = h => String(h).padStart(2, '0');
  return `
    <div class="card-inset burc-lucky">
      <span class="burc-swatch" style="background:${color.hex}"></span>
      <span class="label">Şanslı Renk</span>
      <strong>${color.name}</strong>
    </div>
    <div class="card-inset burc-lucky">
      <span class="burc-lucky-big numeric">${number}</span>
      <span class="label">Şanslı Sayı</span>
      <strong>Bugünün sayısı</strong>
    </div>
    <div class="card-inset burc-lucky">
      <ion-icon name="time-outline" class="burc-lucky-icon"></ion-icon>
      <span class="label">Şanslı Saat</span>
      <strong class="numeric">${hh(hour)}:00 – ${hh(hour + 1)}:00</strong>
    </div>`;
}

function duoCard(sign, reading) {
  const meta = sign === 'leo'
    ? { glyph: '\u264C\uFE0E', title: 'Aslan Kadını bugün', cls: 'is-leo' }
    : { glyph: '\u2653\uFE0E', title: 'Balık Erkeği bugün', cls: 'is-pisces' };

  const body = reading
    ? `<p class="burc-duo-text">${esc(reading.tr || reading.en)}</p>`
    : '<p class="burc-duo-text text-muted">Yorum şu an alınamadı.</p>';

  const action = !reading ? '' : sign === 'leo'
    ? `<button type="button" class="burc-link-btn" data-burc-goto="leo">Aslan sekmesinde aç <ion-icon name="arrow-forward-outline"></ion-icon></button>`
    : `<button type="button" class="burc-link-btn" data-burc-expand>Devamını oku</button>`;

  return `
    <article class="card-flat burc-duo ${meta.cls}">
      <div class="burc-duo-head">
        <span class="burc-glyph burc-glyph-sm">${meta.glyph}</span>
        <strong>${meta.title}</strong>
      </div>
      ${body}
      ${action}
    </article>`;
}

function relationCard(rel) {
  return `
    <article class="card burc-relation">
      <div class="burc-reading-head">
        <span class="now-showing">Günün İlişki Yorumu</span>
        ${rel.source === 'ai' ? '<span class="badge"><ion-icon name="sparkles"></ion-icon> Gemini 3.6</span>' : ''}
      </div>
      <h3 class="burc-theme">✨ ${esc(rel.tema)}</h3>
      <div class="burc-meters">
        ${SCORES.map(({ key, label, icon }) => `
          <div class="burc-meter">
            <span class="burc-meter-label">${icon} ${label}</span>
            <div class="burc-meter-track"><div class="burc-meter-fill" data-value="${rel[key]}"></div></div>
            <span class="burc-meter-val numeric">%${rel[key]}</span>
          </div>`).join('')}
      </div>
      <p class="burc-reading-text">${esc(rel.yorum)}</p>
      <div class="burc-tip">
        <ion-icon name="bulb-outline"></ion-icon>
        <div>
          <strong>Günün İpucu</strong>
          <p>${esc(rel.ipucu)}</p>
        </div>
      </div>
    </article>`;
}

// ─────────────── Sayfa ───────────────

export function initializeBurcLogic() {
  const page = document.getElementById('burc-page');
  if (!page) return;

  const dateKey = todayKey();
  const dateLabel = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const store = createDayStore(dateKey);

  const heroDate = page.querySelector('#burc-hero-date');
  if (heroDate) heroDate.textContent = dateLabel;

  const views = {
    leo: page.querySelector('#burc-view-leo'),
    iliski: page.querySelector('#burc-view-iliski')
  };
  const tabs = page.querySelectorAll('.burc-tab-btn');
  const periodChips = page.querySelectorAll('[data-burc-period]');
  const readingEl = page.querySelector('#burc-leo-reading');
  const relationEl = page.querySelector('#burc-relation');
  const duoEl = page.querySelector('#burc-duo');
  const ring = page.querySelector('#burc-ring');
  const ringNum = page.querySelector('#burc-ring-num');

  page.querySelector('#burc-lucky').innerHTML = luckyTiles(dateKey);

  // ── Aslan Kadını: dönem seçimi ──
  let activePeriod = 'daily';
  let leoLoadId = 0;

  async function loadLeo(period) {
    activePeriod = period;
    periodChips.forEach(c => c.classList.toggle('is-active', c.dataset.burcPeriod === period));
    const loadId = ++leoLoadId;
    readingEl.innerHTML = skeletonCard(5);
    try {
      const reading = await getReading(store, dateKey, 'leo', period);
      if (loadId !== leoLoadId) return;
      readingEl.innerHTML = readingCard(reading, period);
    } catch (err) {
      if (loadId !== leoLoadId) return;
      console.error('Aslan burç yorumu alınamadı:', err);
      readingEl.innerHTML = errorState('Burç yorumu şu an alınamadı.', 'leo');
    }
  }

  periodChips.forEach(chip => chip.addEventListener('click', () => loadLeo(chip.dataset.burcPeriod)));

  // ── Balık & Aslan: ilişki ──
  let relationRequested = false;

  async function loadRelation() {
    relationRequested = true;
    relationEl.innerHTML = skeletonCard(6);
    duoEl.innerHTML = skeletonCard(4) + skeletonCard(4);

    const [leoRes, piscesRes] = await Promise.allSettled([
      getReading(store, dateKey, 'leo', 'daily'),
      getReading(store, dateKey, 'pisces', 'daily')
    ]);
    const leo = leoRes.status === 'fulfilled' ? leoRes.value : null;
    const pisces = piscesRes.status === 'fulfilled' ? piscesRes.value : null;
    if (!leo || !pisces) console.warn('Burç yorumlarından biri alınamadı:', leoRes.reason || piscesRes.reason);

    duoEl.innerHTML = duoCard('pisces', pisces) + duoCard('leo', leo);

    const rel = await getRelation(store, dateKey, dateLabel, leo, pisces);
    const overall = overallScore(rel);
    ring.style.setProperty('--p', overall);
    ringNum.textContent = `%${overall}`;
    relationEl.innerHTML = relationCard(rel);

    // Çubuklar sıfırdan dolarak gelsin: önce 0 genişlik çizilsin, sonra değer.
    void relationEl.offsetWidth;
    relationEl.querySelectorAll('.burc-meter-fill').forEach(fill => {
      fill.style.width = `${fill.dataset.value}%`;
    });
  }

  // ── Sekmeler ──
  function showTab(which) {
    tabs.forEach(tab => {
      const on = tab.dataset.burcTab === which;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
    });
    views.leo.style.display = which === 'leo' ? '' : 'none';
    views.iliski.style.display = which === 'iliski' ? '' : 'none';
    if (which === 'iliski' && !relationRequested) loadRelation();
  }

  tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.burcTab)));

  // Kartlar içindeki bağlantı / tekrar dene / devamını oku butonları
  page.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-burc-goto]');
    if (goto) {
      showTab(goto.dataset.burcGoto);
      page.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const retry = e.target.closest('[data-burc-retry]');
    if (retry) {
      if (retry.dataset.burcRetry === 'leo') loadLeo(activePeriod);
      return;
    }

    const expand = e.target.closest('[data-burc-expand]');
    if (expand) {
      const card = expand.closest('.burc-duo');
      const open = card.classList.toggle('is-open');
      expand.textContent = open ? 'Daha az göster' : 'Devamını oku';
    }
  });

  loadLeo('daily');
}
