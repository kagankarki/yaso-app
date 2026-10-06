// Özel günlerin tek kaynağı: doğum günleri, yıl dönümleri, aylık dönümler,
// "100. günümüz" gibi kilometre taşları, Zaman Tüneli anılarının yıl
// dönümleri, planlanan buluşmalar ve elle eklenen günler.
// Hem Özel Günler sayfası hem Love açılışındaki hatırlatmalar bunu kullanır.
import { db, collection, getDocs } from '../firebase-config.js';
import { loadCycleSettings, cycleStatus } from './cycle.js';

// Bizim hikayemizin başladığı gün (love.js'deki sayaçla aynı).
export const RELATIONSHIP_START = new Date(2026, 4, 31);

export const BIRTHDAYS = [
  { key: 'yasemin', name: 'Yasemin', possessive: "Yasemin'in", month: 8, day: 5, emoji: '🌸', sign: 'Aslan ♌' },
  { key: 'kagan', name: 'Kağan', possessive: "Kağan'ın", month: 3, day: 5, emoji: '👑', sign: 'Balık ♓' }
];

const HOLIDAYS = [
  { key: 'sevgililer', title: 'Sevgililer Günü', month: 2, day: 14, emoji: '💘' }
];

const DAY_MILESTONES = [100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000];
const WINDOW_DAYS = 400;
const DAY_MS = 86400000;

const TR_MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz',
  'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

export const KIND_LABELS = {
  birthday: 'Doğum Günü',
  anniversary: 'Yıl Dönümü',
  monthiversary: 'Aylık Dönüm',
  milestone: 'Kilometre Taşı',
  date: 'Buluşma',
  memory: 'Anı',
  custom: 'Özel Gün',
  care: 'Özen',
  holiday: 'Kutlama'
};

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Bugünden hedef güne kaç takvim günü var (0 = bugün). */
export function daysUntil(at, now = new Date()) {
  return Math.round((startOfDay(at) - startOfDay(now)) / DAY_MS);
}

export function daysLeftText(at, now = new Date()) {
  const d = daysUntil(at, now);
  if (d <= 0) return 'Bugün! 🎉';
  if (d === 1) return 'Yarın';
  return `${d} gün kaldı`;
}

/** YYYY-MM-DD (+ HH:MM) → yerel Date. */
export function parseLocalDate(dateStr, timeStr = '') {
  const [y, m, d] = String(dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hh = 0, mm = 0] = String(timeStr || '').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

/** Zaman Tüneli'ndeki "31 Mayıs 2026" biçimli tarihleri çözer. */
function parseTurkishDate(text) {
  const m = String(text || '').match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (!m) return null;
  const month = TR_MONTHS.indexOf(m[2].toLocaleLowerCase('tr'));
  if (month < 0) return null;
  return new Date(Number(m[3]), month, Number(m[1]));
}

/** Ay/gün için bugün ya da sonrasına düşen ilk tarih (29 Şubat'ı atlar). */
function nextYearly(month, day, now) {
  const today = startOfDay(now);
  for (let y = today.getFullYear(); y <= today.getFullYear() + 4; y++) {
    const c = new Date(y, month - 1, day);
    if (c.getMonth() !== month - 1) continue;
    if (c >= today) return c;
  }
  return null;
}

function lastDayOfMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

/**
 * Tüm kaynaklardan yaklaşan özel günleri üretir (en yakından uzağa).
 * @param {{dates?:Array, custom?:Array, memories?:Array}} data Firestore verileri
 */
export function buildSpecialDays({ dates = [], custom = [], memories = [], cycle = null } = {}, now = new Date()) {
  const today = startOfDay(now);
  const limit = new Date(today.getTime() + WINDOW_DAYS * DAY_MS);
  const events = [];
  const push = (e) => { if (e.at && e.at >= today && e.at <= limit) events.push(e); };

  // Doğum günleri
  for (const b of BIRTHDAYS) {
    push({
      id: `birthday-${b.key}`, kind: 'birthday', emoji: '🎂',
      title: `${b.possessive} Doğum Günü`, note: `${b.emoji} ${b.sign}`,
      at: nextYearly(b.month, b.day, now), allDay: true, yearly: true
    });
  }

  // Yıl dönümü
  const start = RELATIONSHIP_START;
  const anniv = nextYearly(start.getMonth() + 1, start.getDate(), now);
  if (anniv) {
    const n = anniv.getFullYear() - start.getFullYear();
    if (n >= 1) {
      push({
        id: `anniversary-${n}`, kind: 'anniversary', emoji: '💍',
        title: `${n}. Yıl Dönümümüz`, note: 'Sonsuza kadar beraber 💞',
        at: anniv, allDay: true, yearly: true
      });
    }
  }

  // Sıradaki aylık dönüm (31'i olmayan aylarda ayın son günü)
  for (let i = 0; i < 3; i++) {
    const y = today.getFullYear();
    const m = today.getMonth() + i;
    const at = new Date(y, m, Math.min(start.getDate(), lastDayOfMonth(y, m)));
    if (at < today) continue;
    const months = (at.getFullYear() - start.getFullYear()) * 12 + (at.getMonth() - start.getMonth());
    // Her 12. ay zaten yıl dönümü; o zaman bir sonraki aya bak.
    if (months < 1 || months % 12 === 0) continue;
    push({
      id: `month-${months}`, kind: 'monthiversary', emoji: '🌙',
      title: `${months}. Ayımız`, note: 'Aylık dönümümüz kutlu olsun',
      at, allDay: true
    });
    break;
  }

  // "100. günümüz" gibi kilometre taşları
  for (const n of DAY_MILESTONES) {
    push({
      id: `day-${n}`, kind: 'milestone', emoji: '✨',
      title: `${n}. Günümüz`, note: `Birlikte ${n} gün`,
      at: new Date(start.getFullYear(), start.getMonth(), start.getDate() + n), allDay: true
    });
  }

  // Kutlamalar
  for (const h of HOLIDAYS) {
    push({ id: `holiday-${h.key}`, kind: 'holiday', emoji: h.emoji, title: h.title, at: nextYearly(h.month, h.day, now), allDay: true, yearly: true });
  }

  // Özen haftası (yalnızca Yasemin paylaşımı açtıysa)
  if (cycle?.share) {
    const st = cycleStatus(cycle, now);
    push({
      id: 'care-week', kind: 'care', emoji: '🍫',
      title: st.inWeek ? "Yasemin'in özen haftası sürüyor" : "Yasemin'in özen haftası",
      note: 'Ekstra şefkat, sıcak su torbası ve çikolata zamanı 💗',
      at: st.inWeek ? startOfDay(now) : st.start, allDay: true
    });
  }

  // Planlanan buluşmalar
  for (const d of dates) {
    const at = parseLocalDate(d.date, d.time);
    if (!at || at < now) continue;
    push({
      id: `date-${d.id}`, kind: 'date', emoji: d.emoji || '💑',
      title: d.title || 'Buluşma', note: d.place || '',
      at, allDay: !d.time, place: d.place || ''
    });
  }

  // Zaman Tüneli anılarının yıl dönümleri
  for (const mem of memories) {
    const when = parseTurkishDate(mem.date);
    if (!when) continue;
    // İlişkinin başladığı gün zaten "Yıl Dönümümüz" olarak listede.
    if (when.getMonth() === start.getMonth() && when.getDate() === start.getDate()) continue;
    const at = nextYearly(when.getMonth() + 1, when.getDate(), now);
    if (!at) continue;
    const n = at.getFullYear() - when.getFullYear();
    if (n < 1) continue;
    push({
      id: `memory-${mem.id}-${n}`, kind: 'memory', emoji: mem.emoji || '📸',
      title: `"${mem.title}" ${n}. yıl dönümü`, note: `Zaman Tüneli · ${mem.date}`,
      at, allDay: true, yearly: true
    });
  }

  // Elle eklenen özel günler
  for (const c of custom) {
    const base = parseLocalDate(c.date);
    if (!base) continue;
    const at = c.yearly ? nextYearly(base.getMonth() + 1, base.getDate(), now) : base;
    push({
      id: `custom-${c.id}`, docId: c.id, kind: 'custom', emoji: c.emoji || '⭐',
      title: c.title || 'Özel Gün', note: c.yearly ? 'Her yıl' : '',
      at, allDay: true, yearly: !!c.yearly
    });
  }

  return events.sort((a, b) => a.at - b.at);
}

/** Hatırlatmalar için verileri tek seferde çeker (sayfa açık değilken). */
export async function loadSpecialDayData() {
  const read = async (name) => {
    try {
      const snap = await getDocs(collection(db, name));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn(`${name} okunamadı:`, err);
      return [];
    }
  };
  const [dates, custom, memories, cycle] = await Promise.all([
    read('Dates'), read('SpecialDays'), read('Love'), loadCycleSettings()
  ]);
  return { dates, custom, memories, cycle };
}

export function formatLongDate(at, withTime = false) {
  const opts = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
  const s = at.toLocaleDateString('tr-TR', opts);
  if (!withTime) return s;
  return `${s} · ${at.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}
