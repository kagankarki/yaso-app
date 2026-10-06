// Özen haftası (döngü) hesabı. Ayar Firestore'da settings/cycle:
// { startDay, length, share }. Varsayılan: her ayın 15'inden başlayan 7 gün.
// Love tarafına (Kağan) yalnızca "özen haftası" bilgisi gider; detay gitmez.
import { db, doc, getDoc, setDoc } from '../firebase-config.js';

export const CYCLE_DEFAULTS = { startDay: 15, length: 7, share: true };
const DAY_MS = 86400000;

export async function loadCycleSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'cycle'));
    return { ...CYCLE_DEFAULTS, ...(snap.exists() ? snap.data() : {}) };
  } catch (err) {
    console.warn('Döngü ayarı okunamadı:', err);
    return { ...CYCLE_DEFAULTS };
  }
}

export function saveCycleSettings(cfg) {
  return setDoc(doc(db, 'settings', 'cycle'), {
    startDay: cfg.startDay, length: cfg.length, share: cfg.share
  }, { merge: true });
}

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Verilen ay için özen haftasının başlangıç ve bitişi. */
export function weekForMonth(cfg, year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const start = new Date(year, month, Math.min(cfg.startDay, lastDay));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + cfg.length - 1);
  return { start, end };
}

/**
 * @returns {{inWeek:boolean, dayIndex:number, start:Date, end:Date, daysUntil:number}}
 *   inWeek ise start/end içinde bulunulan hafta, değilse sıradaki hafta.
 */
export function cycleStatus(cfg, now = new Date()) {
  const today = startOfDay(now);
  for (let i = -1; i <= 1; i++) {
    const { start, end } = weekForMonth(cfg, today.getFullYear(), today.getMonth() + i);
    if (today >= start && today <= end) {
      return { inWeek: true, dayIndex: Math.round((today - start) / DAY_MS) + 1, start, end, daysUntil: 0 };
    }
    if (start > today) {
      return { inWeek: false, dayIndex: 0, start, end, daysUntil: Math.round((start - today) / DAY_MS) };
    }
  }
  const { start, end } = weekForMonth(cfg, today.getFullYear(), today.getMonth() + 2);
  return { inWeek: false, dayIndex: 0, start, end, daysUntil: Math.round((start - today) / DAY_MS) };
}
