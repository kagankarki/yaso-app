// "Bugün nasıl sevilmek istiyorsun?" kartı (Firestore: LoveRequests) ve
// özen haftası bandı. Bizim Köşemiz sayfasının başında durur.
import { db, collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from '../firebase-config.js';
import { esc, toast } from '../utils.js';
import { personEmoji, otherPerson, notify, rememberedPerson, bindPersonSegment, burst } from './shared.js';
import { loadCycleSettings, cycleStatus } from './cycle.js';

export const LOVE_WAYS = [
  { key: 'sarilma', emoji: '🤗', label: 'Sarılmak', want: 'sarılmak istiyor' },
  { key: 'soz', emoji: '💬', label: 'Güzel sözler', want: 'güzel sözler duymak istiyor' },
  { key: 'surpriz', emoji: '🎁', label: 'Küçük sürpriz', want: 'küçük bir sürpriz bekliyor' },
  { key: 'vakit', emoji: '⏳', label: 'Birlikte vakit', want: 'seninle vakit geçirmek istiyor' },
  { key: 'simartilma', emoji: '🍫', label: 'Şımartılmak', want: 'şımartılmak istiyor' },
  { key: 'telefon', emoji: '📞', label: 'Uzun bir telefon', want: 'seninle uzun uzun konuşmak istiyor' },
  { key: 'bakim', emoji: '💆‍♀️', label: 'Dinlenmek', want: 'dinlenmek ve ilgilenilmek istiyor' },
  { key: 'alan', emoji: '🛋️', label: 'Biraz alan', want: 'bugün biraz kendi alanına ihtiyaç duyuyor' }
];
const wayOf = key => LOVE_WAYS.find(w => w.key === key);

let unsubscribe = null;

const isToday = ts => {
  if (!ts?.seconds) return false;
  return new Date(ts.seconds * 1000).toDateString() === new Date().toDateString();
};

export function initializeLoveLanguage() {
  const card = document.getElementById('ll-card');
  if (!card) return;
  if (unsubscribe) unsubscribe();

  const optionsEl = card.querySelector('#ll-options');
  const todayEl = card.querySelector('#ll-today');
  const person = bindPersonSegment(card.querySelector('#ll-person'), rememberedPerson('yaso_ll_person'), null, 'yaso_ll_person');

  optionsEl.innerHTML = LOVE_WAYS.map(w => `
    <button type="button" class="ll-option" data-way="${w.key}">
      <span class="ll-option-emoji">${w.emoji}</span>
      <span class="ll-option-label">${w.label}</span>
    </button>`).join('');

  optionsEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-way]');
    if (!btn) return;
    const w = wayOf(btn.dataset.way);
    const me = person.get();
    btn.classList.add('is-sending');
    try {
      await addDoc(collection(db, 'LoveRequests'), { person: me, way: w.key, ack: false, createdAt: serverTimestamp() });
      notify(`${w.emoji} ${me} bugün…`, `${me} ${w.want}. Haydi ${otherPerson(me)}, sıra sende! 💗`);
      toast(`${otherPerson(me)} haberdar edildi`, w.emoji);
      burst([w.emoji, '💗', '✨'], 10);
    } catch (err) {
      console.error('İstek gönderilemedi:', err);
      toast('Gönderilemedi, tekrar dene', '😢');
    } finally {
      btn.classList.remove('is-sending');
    }
  });

  let latest = {};
  unsubscribe = onSnapshot(collection(db, 'LoveRequests'), (snap) => {
    latest = {};
    snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(r => isToday(r.createdAt))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      .forEach(r => { latest[r.person] = r; });
    renderToday();
  }, (err) => console.warn('Sevgi istekleri dinlenemedi:', err));

  function renderToday() {
    const rows = ['Yasemin', 'Kağan'].filter(p => latest[p]).map(p => {
      const r = latest[p];
      const w = wayOf(r.way);
      if (!w) return '';
      const time = new Date(r.createdAt.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="ll-today-row">
          <span class="ll-today-emoji">${w.emoji}</span>
          <div class="min-w-0 flex-1">
            <strong>${personEmoji(p)} ${p}</strong> <span class="text-muted">bugün ${w.want}.</span>
            <span class="label ml-1">${time}</span>
          </div>
          ${r.ack
            ? `<span class="sd-pill is-soon">✓ ${otherPerson(p)} gördü</span>`
            : `<button type="button" class="btn btn-ghost btn-sm" data-ack="${r.id}">Gördüm, geliyorum 💗</button>`}
        </div>`;
    }).join('');
    todayEl.innerHTML = rows;
    todayEl.hidden = !rows;
  }

  todayEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ack]');
    if (!btn) return;
    const r = Object.values(latest).find(x => x.id === btn.dataset.ack);
    if (!r) return;
    try {
      await updateDoc(doc(db, 'LoveRequests', r.id), { ack: true });
      notify('💗 İsteğin görüldü', `${otherPerson(r.person)} isteğini gördü ve yolda! ${wayOf(r.way)?.emoji || ''}`);
    } catch (err) {
      console.error(err);
    }
  });

  renderCareBanner();
}

// Özen haftası: Kağan'a yalnızca "bu hafta ekstra özen" bilgisi gösterilir.
async function renderCareBanner() {
  const el = document.getElementById('ll-care');
  if (!el) return;
  const cfg = await loadCycleSettings();
  if (!cfg.share) { el.hidden = true; return; }
  const st = cycleStatus(cfg);
  if (!st.inWeek && st.daysUntil > 3) { el.hidden = true; return; }

  el.hidden = false;
  el.innerHTML = st.inWeek ? `
      <span class="ll-care-emoji">🍫</span>
      <div class="min-w-0 flex-1">
        <strong>Yasemin'in özen haftası · ${st.dayIndex}. gün</strong>
        <p>Bu hafta ekstra şefkat zamanı: sıcak su torbası, sevdiği tatlı, bol sarılma ve bolca sabır 💗</p>
      </div>`
    : `
      <span class="ll-care-emoji">🌙</span>
      <div class="min-w-0 flex-1">
        <strong>Özen haftası ${st.daysUntil === 1 ? 'yarın' : `${st.daysUntil} gün sonra`} başlıyor</strong>
        <p>Çikolata stoğunu şimdiden kontrol etmekte fayda var 😌🍫</p>
      </div>`;
}
