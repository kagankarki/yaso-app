// Love sayfalarının ortak yardımcıları: kişiler, Türkçe ekler, bildirim,
// kişi seçici (segment) ve fotoğraf küçültme.
import { db, collection, addDoc, serverTimestamp } from '../firebase-config.js';

export const PEOPLE = ['Yasemin', 'Kağan'];
export const personEmoji = name => (name === 'Kağan' ? '👑' : '🌸');
export const otherPerson = name => (name === 'Kağan' ? 'Yasemin' : 'Kağan');
// Ünlü uyumu: Yasemin'e / Kağan'a, Yasemin'in / Kağan'ın
export const dative = name => (name === 'Kağan' ? "Kağan'a" : `${name}'e`);
export const genitive = name => (name === 'Kağan' ? "Kağan'ın" : `${name}'in`);
export const ablative = name => (name === 'Kağan' ? "Kağan'dan" : `${name}'den`);

/** Love üst bardaki kalp ziline düşen bildirim. Hata akışı bozmaz. */
export function notify(title, message) {
  return addDoc(collection(db, 'Notifications'), { title, message, createdAt: serverTimestamp() })
    .catch(err => console.warn('Bildirim yazılamadı:', err));
}

/** Son seçilen kişiyi hatırlar (cihaz başına). */
export function rememberedPerson(key, fallback = 'Yasemin') {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

/**
 * [data-person] butonlu bir segmenti bağlar.
 * @returns {{get: () => string, set: (name: string) => void}}
 */
export function bindPersonSegment(root, initial, onChange, storageKey) {
  const btns = root.querySelectorAll('[data-person]');
  let value = initial;
  const set = (name) => {
    value = name;
    btns.forEach(b => b.classList.toggle('is-active', b.dataset.person === name));
  };
  btns.forEach(b => b.addEventListener('click', () => {
    set(b.dataset.person);
    if (storageKey) { try { localStorage.setItem(storageKey, value); } catch { /* yok say */ } }
    onChange?.(value);
  }));
  set(initial);
  return { get: () => value, set };
}

/** Fotoğrafı Firestore'a sığacak boyuta küçültüp data URL döndürür. */
export function resizeImageToDataUrl(file, maxDimension = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function burst(symbols = ['💖', '✨', '💕', '🥰'], count = 16) {
  for (let i = 0; i < count; i++) {
    const h = document.createElement('div');
    h.className = 'heart-burst';
    h.textContent = symbols[i % symbols.length];
    h.style.left = `${Math.random() * 80 + 10}vw`;
    h.style.top = `${Math.random() * 40 + 40}vh`;
    h.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 2500);
  }
}
