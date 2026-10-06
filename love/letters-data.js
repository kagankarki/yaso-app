// Zaman kapsülü mektupların ortak verisi. Genel Bakış'taki mod seçimi de
// bunu kullanır: "Üzgün" seçilince "Üzgün olduğunda aç" mektubu hatırlatılır.
import { db, collection, getDocs } from '../firebase-config.js';

export const FEELINGS = [
  { key: 'uzgun', emoji: '🥺', label: 'Üzgün olduğunda aç' },
  { key: 'ozledi', emoji: '🥹', label: 'Beni özlediğinde aç' },
  { key: 'kizgin', emoji: '😤', label: 'Bana kızdığında aç' },
  { key: 'uyku', emoji: '🌙', label: 'Uyuyamadığında aç' },
  { key: 'yorgun', emoji: '😮‍💨', label: 'Çok yorulduğunda aç' },
  { key: 'yetersiz', emoji: '🫂', label: 'Kendini yetersiz hissettiğinde aç' },
  { key: 'mutlu', emoji: '😊', label: 'Çok mutlu olduğunda aç' }
];

export const OCCASIONS = [
  { key: 'birthday', emoji: '🎂', label: 'Doğum gününde aç' },
  { key: 'anniversary', emoji: '💍', label: 'Yıl dönümümüzde aç' },
  { key: 'custom', emoji: '📅', label: 'Seçtiğim günde aç' }
];

// Genel Bakış mod anahtarı → mektup duygusu
const MOOD_TO_FEELING = { uzgun: 'uzgun', yorgun: 'yorgun', mutlu: 'mutlu', bikmis: 'kizgin' };

export const feelingOf = key => FEELINGS.find(f => f.key === key);

/** Bu kişiye bu moda uyan, henüz açılmamış mektupları döndürür. */
export async function lettersForMood(person, moodKey) {
  const feeling = MOOD_TO_FEELING[moodKey];
  if (!feeling) return [];
  try {
    const snap = await getDocs(collection(db, 'Letters'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.to === person && !l.opened && l.unlockType === 'feeling' && l.feeling === feeling);
  } catch (err) {
    console.warn('Mektuplar okunamadı:', err);
    return [];
  }
}
