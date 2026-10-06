// Buluşma Planla — gün, saat ve yeri kaydedilen buluşmalar (Firestore: Dates).
// Yaklaşanlar geri sayımla listelenir, takvime eklenebilir; geçmiş
// buluşmalara kalp puanı verilir. Özel Günler sayfası da aynı veriyi gösterir.
import { db, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, serverTimestamp } from '../firebase-config.js';
import { esc, toast } from '../utils.js';
import { parseLocalDate, daysUntil } from './special-days.js';
import { downloadIcs } from './ics.js';

const CATEGORIES = [
  { key: 'yemek', emoji: '🍽️', label: 'Yemek', hint: 'Örn: Sushi akşamı 🍣' },
  { key: 'kahve', emoji: '☕', label: 'Kahve', hint: 'Örn: Pazar kahvesi ☕' },
  { key: 'sinema', emoji: '🎬', label: 'Sinema', hint: 'Örn: Yeni çıkan film gecesi 🍿' },
  { key: 'gezi', emoji: '🌳', label: 'Gezi', hint: 'Örn: Gün batımı yürüyüşü 🌅' },
  { key: 'evde', emoji: '🏠', label: 'Evde', hint: 'Örn: Battaniye + film + pizza 🍕' },
  { key: 'surpriz', emoji: '🎁', label: 'Sürpriz', hint: 'Örn: Sana bir sürprizim var 🤫' },
  { key: 'tatil', emoji: '✈️', label: 'Tatil', hint: 'Örn: Hafta sonu kaçamağı 🏖️' }
];

const mapsUrl = place => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

let unsubscribe = null;
let tick = null;

export function initializeBulusmaLogic() {
  const page = document.getElementById('bulusma-page');
  if (!page) return;

  if (unsubscribe) unsubscribe();
  clearInterval(tick);

  const catsEl = page.querySelector('#dt-categories');
  const titleEl = page.querySelector('#dt-title');
  const dateEl = page.querySelector('#dt-date');
  const timeEl = page.querySelector('#dt-time');
  const placeEl = page.querySelector('#dt-place');
  const noteEl = page.querySelector('#dt-note');
  const mapPreview = page.querySelector('#dt-map-preview');
  const statusEl = page.querySelector('#dt-status');
  const saveBtn = page.querySelector('#dt-save');
  const byBtns = page.querySelectorAll('[data-dt-by]');
  const upcomingEl = page.querySelector('#dt-upcoming');
  const pastEl = page.querySelector('#dt-past');
  const pastWrap = page.querySelector('#dt-past-wrap');
  const heroSub = page.querySelector('#dt-hero-sub');

  // ── Form ──
  let category = CATEGORIES[0];
  let plannedBy = localStorage.getItem('yaso_dt_by') || 'Yasemin';

  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  dateEl.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  catsEl.innerHTML = CATEGORIES.map((c, i) =>
    `<button type="button" class="chip ${i === 0 ? 'is-active' : ''}" data-cat="${c.key}">${c.emoji} ${c.label}</button>`
  ).join('');
  catsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    category = CATEGORIES.find(c => c.key === btn.dataset.cat);
    catsEl.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('is-active', b === btn));
    titleEl.placeholder = category.hint;
  });

  const setBy = (name) => {
    plannedBy = name;
    byBtns.forEach(b => b.classList.toggle('is-active', b.dataset.dtBy === name));
  };
  setBy(plannedBy);
  byBtns.forEach(b => b.addEventListener('click', () => {
    setBy(b.dataset.dtBy);
    localStorage.setItem('yaso_dt_by', plannedBy);
  }));

  placeEl.addEventListener('input', () => {
    const place = placeEl.value.trim();
    mapPreview.hidden = !place;
    if (place) mapPreview.href = mapsUrl(place);
  });

  const setStatus = (msg, ok) => {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? 'var(--ok)' : 'var(--danger)';
  };

  saveBtn.addEventListener('click', async () => {
    const title = titleEl.value.trim() || `${category.label} buluşması`;
    const date = dateEl.value;
    const time = timeEl.value;
    const place = placeEl.value.trim();
    const note = noteEl.value.trim();

    if (!date || !time) { setStatus('Gün ve saat seçmeyi unutma 🙏', false); return; }
    if (!place) { setStatus('Nerede buluşuyoruz? Yeri yaz 📍', false); return; }
    const at = parseLocalDate(date, time);
    if (at < new Date()) { setStatus('Geçmiş bir zaman seçtin, ileri bir tarih seç ⏳', false); return; }

    saveBtn.disabled = true;
    try {
      await addDoc(collection(db, 'Dates'), {
        title, date, time, place, note,
        category: category.key, emoji: category.emoji,
        plannedBy, rating: 0,
        createdAt: serverTimestamp()
      });

      // Bildirim zili (Love üst bar) diğer kişiye haber versin.
      const when = at.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
      addDoc(collection(db, 'Notifications'), {
        title: `${category.emoji} Yeni Buluşma Planı`,
        message: `${plannedBy}, ${when} ${time}'de "${title}" planladı. Yer: ${place} 💌`,
        createdAt: serverTimestamp()
      }).catch(err => console.warn('Buluşma bildirimi yazılamadı:', err));

      titleEl.value = '';
      noteEl.value = '';
      placeEl.value = '';
      mapPreview.hidden = true;
      setStatus('Buluşma kaydedildi! Takvime eklemeyi unutma 📅', true);
      toast('Buluşma planlandı', category.emoji);
      setTimeout(() => { if (statusEl.style.color === 'var(--ok)') statusEl.textContent = ''; }, 4000);
    } catch (err) {
      console.error('Buluşma kaydedilemedi:', err);
      setStatus('Kaydedilemedi, tekrar dene 😢', false);
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ── Liste ──
  let dates = [];

  unsubscribe = onSnapshot(collection(db, 'Dates'), (snap) => {
    dates = snap.docs.map(d => ({ id: d.id, ...d.data(), at: parseLocalDate(d.data().date, d.data().time) }))
      .filter(d => d.at);
    render();
  }, (err) => {
    console.error('Buluşmalar yüklenemedi:', err);
    upcomingEl.innerHTML = `<div class="empty-state text-danger"><ion-icon name="cloud-offline-outline" class="text-4xl"></ion-icon><p class="text-sm">Buluşmalar yüklenemedi.</p></div>`;
  });

  function countdownText(at) {
    const s = Math.max(0, Math.floor((at - new Date()) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
    if (d > 0) return `${d} gün ${h} saat kaldı`;
    if (h > 0) return `${h} saat ${m} dk kaldı`;
    return `${m} dk kaldı`;
  }

  function dateCard(d, isNext) {
    const month = d.at.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', '');
    const wd = d.at.toLocaleDateString('tr-TR', { weekday: 'short' });
    return `
      <article class="dt-card ${isNext ? 'is-next' : ''}" data-id="${d.id}">
        <div class="dt-cal">
          <span class="dt-cal-month">${esc(month)}</span>
          <span class="dt-cal-day numeric">${d.at.getDate()}</span>
          <span class="dt-cal-wd">${esc(wd)}</span>
        </div>
        <div class="min-w-0 flex-1">
          ${isNext ? '<span class="now-showing">Sıradaki buluşma</span>' : ''}
          <div class="dt-card-title">${esc(d.emoji || '💑')} ${esc(d.title)}</div>
          <div class="dt-card-meta">
            <span><ion-icon name="time-outline"></ion-icon> ${esc(d.time)}</span>
            <a href="${mapsUrl(d.place)}" target="_blank" rel="noopener"><ion-icon name="location-outline"></ion-icon> ${esc(d.place)}</a>
          </div>
          ${d.note ? `<p class="dt-card-note">“${esc(d.note)}”</p>` : ''}
          <div class="dt-card-foot">
            <span class="sd-pill ${daysUntil(d.at) <= 1 ? 'is-soon' : ''}" data-countdown="${d.id}">${countdownText(d.at)}</span>
            <span class="label">${esc(d.plannedBy || '')} planladı</span>
          </div>
        </div>
        <div class="lx-row-actions dt-actions">
          <button type="button" class="lx-icon-btn" data-ics="${d.id}" title="Takvime ekle" aria-label="Takvime ekle"><ion-icon name="calendar-outline"></ion-icon></button>
          <button type="button" class="lx-icon-btn is-danger" data-del="${d.id}" title="Sil" aria-label="Sil"><ion-icon name="trash-outline"></ion-icon></button>
        </div>
      </article>`;
  }

  function pastCard(d) {
    const rating = d.rating || 0;
    return `
      <article class="dt-card is-past" data-id="${d.id}">
        <div class="dt-cal">
          <span class="dt-cal-month">${esc(d.at.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''))}</span>
          <span class="dt-cal-day numeric">${d.at.getDate()}</span>
          <span class="dt-cal-wd">${d.at.getFullYear()}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="dt-card-title">${esc(d.emoji || '💑')} ${esc(d.title)}</div>
          <div class="dt-card-meta"><span><ion-icon name="location-outline"></ion-icon> ${esc(d.place)}</span></div>
          <div class="dt-rating" role="group" aria-label="Puan">
            ${[1, 2, 3, 4, 5].map(n => `
              <button type="button" class="dt-heart ${n <= rating ? 'is-on' : ''}" data-rate="${n}" data-id="${d.id}" aria-label="${n} kalp">♥</button>
            `).join('')}
            <span class="text-xs text-muted">${rating ? ['', 'Eh işte', 'Fena değil', 'Güzeldi', 'Çok güzeldi', 'Efsaneydi!'][rating] : 'Nasıldı?'}</span>
          </div>
        </div>
        <div class="lx-row-actions dt-actions">
          <button type="button" class="lx-icon-btn is-danger" data-del="${d.id}" title="Sil" aria-label="Sil"><ion-icon name="trash-outline"></ion-icon></button>
        </div>
      </article>`;
  }

  function render() {
    const now = new Date();
    const upcoming = dates.filter(d => d.at >= now).sort((a, b) => a.at - b.at);
    const past = dates.filter(d => d.at < now).sort((a, b) => b.at - a.at);

    if (upcoming.length) {
      const left = daysUntil(upcoming[0].at);
      heroSub.textContent = left === 0 ? 'Bugün buluşuyoruz! 💞'
        : left === 1 ? 'Yarın buluşuyoruz! 💞'
        : `Sıradaki buluşmamıza ${left} gün kaldı 💞`;
    } else {
      heroSub.textContent = 'Gününü, saatini, yerini seç; gerisini birlikte hayal edelim.';
    }

    upcomingEl.innerHTML = upcoming.length
      ? upcoming.map((d, i) => dateCard(d, i === 0)).join('')
      : `<div class="empty-state">
           <span class="text-4xl">💭</span>
           <p class="text-sm">Henüz planlanmış buluşma yok. Yukarıdan ilkini planla!</p>
         </div>`;

    pastWrap.hidden = past.length === 0;
    pastEl.innerHTML = past.map(pastCard).join('');
  }

  // Geri sayımları dakikada bir tazele (saniye hassasiyeti burada gereksiz).
  tick = setInterval(() => {
    if (!document.body.contains(page)) { clearInterval(tick); return; }
    page.querySelectorAll('[data-countdown]').forEach(el => {
      const d = dates.find(x => x.id === el.dataset.countdown);
      if (!d) return;
      if (d.at < new Date()) render(); else el.textContent = countdownText(d.at);
    });
  }, 30000);

  page.addEventListener('click', async (e) => {
    const icsBtn = e.target.closest('[data-ics]');
    if (icsBtn) {
      const d = dates.find(x => x.id === icsBtn.dataset.ics);
      if (!d) return;
      downloadIcs({
        uid: `date-${d.id}`, title: `${d.emoji || '💑'} ${d.title}`, at: d.at,
        durationMin: 180, location: d.place,
        description: [d.note, `${d.plannedBy} planladı · SmartYasemin`].filter(Boolean).join('\n')
      });
      toast('Takvim dosyası indirildi, açınca takvimine eklenir', '📅');
      return;
    }

    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      if (!confirm('Bu buluşmayı silmek istediğine emin misin?')) return;
      try {
        await deleteDoc(doc(db, 'Dates', delBtn.dataset.del));
      } catch (err) {
        console.error('Buluşma silinemedi:', err);
        toast('Silinemedi, tekrar dene', '😢');
      }
      return;
    }

    const rateBtn = e.target.closest('[data-rate]');
    if (rateBtn) {
      try {
        await updateDoc(doc(db, 'Dates', rateBtn.dataset.id), { rating: Number(rateBtn.dataset.rate) });
      } catch (err) {
        console.error('Puan kaydedilemedi:', err);
      }
    }
  });
}
