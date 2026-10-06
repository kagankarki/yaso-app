// Özen Takvimim (Daily) — Yasemin'in kişisel döngü/özen haftası takvimi.
// Ayar settings/cycle'da; Love tarafı (Kağan) yalnızca "özen haftası" bandını
// ve Özel Günler'de tek satırı görür (paylaşım açıksa).
import { db, collection, addDoc, serverTimestamp } from '../../firebase-config.js';
import { toast } from '../../utils.js';
import { loadCycleSettings, saveCycleSettings, cycleStatus, weekForMonth } from '../../love/cycle.js';
import { LOVE_WAYS } from '../../love/love-language.js';
import { notify } from '../../love/shared.js';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export async function initializeOzenLogic() {
  const page = document.getElementById('ozen-page');
  if (!page) return;

  const startEl = page.querySelector('#oz-start');
  const lengthEl = page.querySelector('#oz-length');
  const shareEl = page.querySelector('#oz-share');
  const statusEl = page.querySelector('#oz-status');

  let cfg = await loadCycleSettings();
  startEl.value = cfg.startDay;
  lengthEl.value = cfg.length;
  shareEl.checked = cfg.share;

  function renderStatus() {
    const st = cycleStatus(cfg);
    const title = page.querySelector('#oz-status-title');
    const sub = page.querySelector('#oz-status-sub');
    const fmt = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    page.querySelector('#oz-hero').classList.toggle('is-active', st.inWeek);
    if (st.inWeek) {
      title.textContent = `Özen haftandasın · ${st.dayIndex}. gün`;
      sub.textContent = `${fmt(st.start)} – ${fmt(st.end)} · Kendine nazik ol, bu hafta senin 💗`;
      page.querySelector('#oz-fill').style.width = `${Math.round((st.dayIndex / cfg.length) * 100)}%`;
    } else {
      title.textContent = st.daysUntil === 1 ? 'Özen haftan yarın başlıyor' : `Özen haftana ${st.daysUntil} gün var`;
      sub.textContent = `Sıradaki: ${fmt(st.start)} – ${fmt(st.end)}`;
      // Bir önceki haftanın sonundan bu yana geçen kısım
      const cycleLen = 30;
      page.querySelector('#oz-fill').style.width = `${Math.round(Math.max(0, 1 - st.daysUntil / cycleLen) * 100)}%`;
    }
  }

  function renderMonths() {
    const today = new Date();
    const todayKey = today.toDateString();
    const months = [0, 1].map(offset => {
      const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const y = first.getFullYear();
      const m = first.getMonth();
      const days = new Date(y, m + 1, 0).getDate();
      const { start, end } = weekForMonth(cfg, y, m);
      const lead = (first.getDay() + 6) % 7; // Pazartesi başlangıçlı
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span class="oz-day is-empty"></span>');
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const inWeek = date >= start && date <= end;
        const cls = [
          'oz-day',
          inWeek ? 'is-care' : '',
          inWeek && date.getTime() === start.getTime() ? 'is-first' : '',
          inWeek && date.getTime() === end.getTime() ? 'is-last' : '',
          date.toDateString() === todayKey ? 'is-today' : ''
        ].filter(Boolean).join(' ');
        cells.push(`<span class="${cls}">${d}</span>`);
      }
      return `
        <div class="card oz-month">
          <h3 class="oz-month-title">${first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h3>
          <div class="oz-grid">
            ${WEEKDAYS.map(w => `<span class="oz-wd">${w}</span>`).join('')}
            ${cells.join('')}
          </div>
        </div>`;
    });
    page.querySelector('#oz-months').innerHTML = months.join('');
  }

  renderStatus();
  renderMonths();

  page.querySelector('#oz-save').addEventListener('click', async () => {
    const startDay = Math.min(28, Math.max(1, Number(startEl.value) || 15));
    const length = Math.min(10, Math.max(3, Number(lengthEl.value) || 7));
    cfg = { startDay, length, share: shareEl.checked };
    startEl.value = startDay;
    lengthEl.value = length;
    try {
      await saveCycleSettings(cfg);
      statusEl.textContent = 'Kaydedildi ✓';
      statusEl.style.color = 'var(--ok)';
    } catch (err) {
      console.error('Döngü ayarı kaydedilemedi:', err);
      statusEl.textContent = 'Kaydedilemedi 😢';
      statusEl.style.color = 'var(--danger)';
    }
    renderStatus();
    renderMonths();
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  });

  // "Kağan'dan iste" → Love'daki sevgi dili kartıyla aynı akış
  page.querySelectorAll('[data-oz-ask]').forEach(btn => btn.addEventListener('click', async () => {
    const w = LOVE_WAYS.find(x => x.key === btn.dataset.ozAsk);
    try {
      await addDoc(collection(db, 'LoveRequests'), { person: 'Yasemin', way: w.key, ack: false, createdAt: serverTimestamp() });
      notify(`${w.emoji} Yasemin bugün…`, `Yasemin ${w.want}. Haydi Kağan, sıra sende! 💗`);
      toast("Kağan'a haber verildi", w.emoji);
    } catch (err) {
      console.error('İstek gönderilemedi:', err);
      toast('Gönderilemedi, tekrar dene', '😢');
    }
  }));
}
