// Özel Günler — doğum günleri, yıl dönümleri, buluşmalar ve anıların
// yaklaşanlarını canlı geri sayımla gösterir. Veriler special-days.js'de
// hesaplanır; Dates / SpecialDays / Love koleksiyonları canlı dinlenir.
import { db, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from '../firebase-config.js';
import { esc, toast } from '../utils.js';
import {
  BIRTHDAYS, KIND_LABELS, buildSpecialDays, daysUntil, daysLeftText, formatLongDate
} from './special-days.js';
import { downloadIcs } from './ics.js';
import { loadCycleSettings } from './cycle.js';

const US_KINDS = new Set(['birthday', 'anniversary', 'monthiversary', 'milestone', 'holiday', 'custom', 'care']);

// Sayfadan çıkıp geri gelince dinleyiciler ve sayaç birikmesin.
let cleanups = [];

export function initializeOzelGunlerLogic() {
  const page = document.getElementById('ozel-gunler-page');
  if (!page) return;

  cleanups.forEach(fn => fn());
  cleanups = [];

  const heroEl = page.querySelector('#sd-hero');
  const listEl = page.querySelector('#sd-list');
  const birthdaysEl = page.querySelector('#sd-birthdays');
  const filterBtns = page.querySelectorAll('[data-sd-filter]');

  const data = { dates: [], custom: [], memories: [], cycle: null };
  let events = [];
  let filter = 'all';
  let celebrated = false;

  // ── Canlı veri ──
  const listen = (name, key) => {
    const unsub = onSnapshot(collection(db, name), (snap) => {
      data[key] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      refresh();
    }, (err) => console.warn(`${name} dinlenemedi:`, err));
    cleanups.push(unsub);
  };
  listen('Dates', 'dates');
  listen('SpecialDays', 'custom');
  listen('Love', 'memories');
  loadCycleSettings().then(cfg => { data.cycle = cfg; refresh(); });

  function refresh() {
    events = buildSpecialDays(data);
    renderHero();
    renderList();
  }

  // ── Sıradaki özel gün + geri sayım ──
  let tick = null;
  function renderHero() {
    const next = events[0];
    if (!next) {
      heroEl.innerHTML = '<div class="sd-hero-inner"><p>Yaklaşan özel gün yok.</p></div>';
      return;
    }
    const isToday = daysUntil(next.at) === 0;
    heroEl.classList.toggle('is-today', isToday);
    heroEl.innerHTML = `
      <span class="sd-hero-emoji" aria-hidden="true">${esc(next.emoji)}</span>
      <div class="sd-hero-inner">
        <span class="sd-hero-kicker">${isToday ? 'Bugün bizim günümüz' : 'Sıradaki Özel Gün'}</span>
        <h1 class="love-hero-title">${isToday ? '🎉 ' : ''}${esc(next.title)}</h1>
        <p class="love-hero-subtitle">${esc(formatLongDate(next.at, !next.allDay))}${next.note ? ` · ${esc(next.note)}` : ''}</p>
        <div class="sd-countdown" ${isToday ? 'hidden' : ''}>
          ${['Gün', 'Saat', 'Dakika', 'Saniye'].map((l, i) => `
            <div class="sd-count-unit"><span class="sd-count-num numeric" data-u="${i}">0</span><span class="sd-count-label">${l}</span></div>
          `).join('')}
        </div>
      </div>`;

    const nums = heroEl.querySelectorAll('.sd-count-num');
    const update = () => {
      if (!document.body.contains(heroEl)) { clearInterval(tick); return; }
      let s = Math.max(0, Math.floor((next.at - new Date()) / 1000));
      const parts = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
      parts.forEach((v, i) => { if (nums[i]) nums[i].textContent = v; });
      if (s === 0 && !isToday) refresh();
    };
    clearInterval(tick);
    update();
    tick = setInterval(update, 1000);

    if (isToday && !celebrated) {
      celebrated = true;
      burstHearts();
    }
  }

  // ── Doğum günü kartları ──
  function renderBirthdays() {
    const now = new Date();
    birthdaysEl.innerHTML = BIRTHDAYS.map(b => {
      const at = events.find(e => e.id === `birthday-${b.key}`)?.at
        || new Date(now.getFullYear() + 1, b.month - 1, b.day);
      const left = daysUntil(at, now);
      const pct = Math.round(Math.max(0, Math.min(1, 1 - left / 365)) * 100);
      return `
        <div class="card-flat sd-bday">
          <div class="sd-bday-top">
            <span class="sd-bday-avatar">${b.emoji}</span>
            <div class="min-w-0 flex-1">
              <strong class="block">${b.name}</strong>
              <span class="text-sm text-muted">${at.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · ${b.sign}</span>
            </div>
            <span class="sd-pill ${left <= 7 ? 'is-soon' : ''}">${daysLeftText(at, now)}</span>
          </div>
          <div class="sd-bday-track" aria-hidden="true"><div class="sd-bday-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');
  }

  // ── Liste ──
  function renderList() {
    renderBirthdays();
    const shown = events.filter(e =>
      filter === 'all' ? true
        : filter === 'us' ? US_KINDS.has(e.kind)
        : e.kind === filter);

    if (shown.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <ion-icon name="calendar-clear-outline" class="text-4xl"></ion-icon>
          <p class="text-sm">${filter === 'date' ? 'Planlanmış buluşma yok. Buluşma Planla sekmesinden ekleyebilirsin 💌' : 'Bu kategoride yaklaşan gün yok.'}</p>
        </div>`;
      return;
    }

    listEl.innerHTML = shown.map(e => {
      const left = daysUntil(e.at);
      return `
        <div class="lx-row sd-kind-${e.kind}" data-id="${esc(e.id)}">
          <span class="lx-row-icon">${esc(e.emoji)}</span>
          <div class="min-w-0 flex-1">
            <div class="lx-row-title">${esc(e.title)}</div>
            <div class="lx-row-meta">
              <span class="sd-kind">${KIND_LABELS[e.kind]}</span>
              ${esc(formatLongDate(e.at, !e.allDay))}
            </div>
          </div>
          <span class="sd-pill ${left === 0 ? 'is-today' : left <= 7 ? 'is-soon' : ''}">${daysLeftText(e.at)}</span>
          <div class="lx-row-actions">
            <button type="button" class="lx-icon-btn" data-ics="${esc(e.id)}" title="Takvime ekle" aria-label="Takvime ekle">
              <ion-icon name="calendar-outline"></ion-icon>
            </button>
            ${e.kind === 'custom' ? `
              <button type="button" class="lx-icon-btn is-danger" data-del="${esc(e.docId)}" title="Sil" aria-label="Sil">
                <ion-icon name="trash-outline"></ion-icon>
              </button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.sdFilter;
    filterBtns.forEach(b => b.classList.toggle('is-active', b === btn));
    renderList();
  }));

  listEl.addEventListener('click', async (e) => {
    const icsBtn = e.target.closest('[data-ics]');
    if (icsBtn) {
      const ev = events.find(x => x.id === icsBtn.dataset.ics);
      if (!ev) return;
      downloadIcs({
        uid: ev.id, title: `${ev.emoji} ${ev.title}`, at: ev.at, allDay: ev.allDay,
        yearly: ev.yearly, location: ev.place, description: ev.note
      });
      toast('Takvim dosyası indirildi, açınca takvimine eklenir', '📅');
      return;
    }
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      if (!confirm('Bu özel günü silmek istediğine emin misin?')) return;
      try {
        await deleteDoc(doc(db, 'SpecialDays', delBtn.dataset.del));
      } catch (err) {
        console.error('Özel gün silinemedi:', err);
        toast('Silinemedi, tekrar dene', '😢');
      }
    }
  });

  // ── Özel gün ekle ──
  const modal = page.querySelector('#sd-modal');
  const statusEl = page.querySelector('#sd-status');
  const saveBtn = page.querySelector('#sd-save');

  page.querySelector('#sd-add-btn').addEventListener('click', () => {
    statusEl.textContent = '';
    modal.classList.add('active');
    page.querySelector('#sd-title').focus();
  });
  page.querySelector('#sd-modal-close').addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  saveBtn.addEventListener('click', async () => {
    const title = page.querySelector('#sd-title').value.trim();
    const date = page.querySelector('#sd-date').value;
    const emoji = page.querySelector('#sd-emoji').value.trim() || '⭐';
    const yearly = page.querySelector('#sd-yearly').checked;

    if (!title || !date) {
      statusEl.textContent = 'Başlık ve tarih gerekli 🙏';
      statusEl.style.color = 'var(--danger)';
      return;
    }

    saveBtn.disabled = true;
    try {
      await addDoc(collection(db, 'SpecialDays'), { title, date, emoji, yearly, createdAt: serverTimestamp() });
      modal.classList.remove('active');
      page.querySelector('#sd-title').value = '';
      page.querySelector('#sd-date').value = '';
      page.querySelector('#sd-emoji').value = '';
      toast('Özel gün eklendi', emoji);
    } catch (err) {
      console.error('Özel gün kaydedilemedi:', err);
      statusEl.textContent = 'Kaydedilemedi, tekrar dene 😢';
      statusEl.style.color = 'var(--danger)';
    } finally {
      saveBtn.disabled = false;
    }
  });

  cleanups.push(() => clearInterval(tick));
  refresh();
}

function burstHearts() {
  const hearts = ['🎉', '💖', '🎂', '✨', '🥳', '💕'];
  for (let i = 0; i < 18; i++) {
    const h = document.createElement('div');
    h.className = 'heart-burst';
    h.textContent = hearts[i % hearts.length];
    h.style.left = `${Math.random() * 80 + 10}vw`;
    h.style.top = `${Math.random() * 40 + 40}vh`;
    h.style.animationDelay = `${Math.random() * 0.6}s`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 2600);
  }
}
