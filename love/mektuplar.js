// Zaman Kapsülü Mektuplar (Firestore: Letters).
// Mektup ya bir duyguya ("Üzgün olduğunda aç") ya da bir güne (doğum günü,
// yıl dönümü, seçilen tarih) mühürlenir. Tarihli olanlar gün gelmeden açılmaz;
// duygulu olanlar alıcının "evet, şu an öyleyim" onayıyla açılır.
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from '../firebase-config.js';
import { esc, toast } from '../utils.js';
import { FEELINGS, OCCASIONS, feelingOf } from './letters-data.js';
import { BIRTHDAYS, RELATIONSHIP_START, parseLocalDate, daysUntil } from './special-days.js';
import { personEmoji, otherPerson, dative, genitive, notify, rememberedPerson, bindPersonSegment, burst } from './shared.js';

let unsubscribe = null;

const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function nextOccurrence(month, day) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(today.getFullYear(), month - 1, day);
  if (d < today) d = new Date(today.getFullYear() + 1, month - 1, day);
  return d;
}

function conditionLabel(l) {
  if (l.unlockType === 'feeling') {
    const f = feelingOf(l.feeling);
    return f ? `${f.emoji} ${f.label}` : '💌 İstediğinde aç';
  }
  const occ = OCCASIONS.find(o => o.key === l.occasion);
  const at = parseLocalDate(l.unlockDate);
  const dateText = at ? at.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return occ && occ.key !== 'custom' ? `${occ.emoji} ${occ.label} · ${dateText}` : `📅 ${dateText} tarihinde aç`;
}

export function initializeMektuplarLogic() {
  const page = document.getElementById('mektuplar-page');
  if (!page) return;
  if (unsubscribe) unsubscribe();

  const grid = page.querySelector('#lt-grid');
  const writeModal = page.querySelector('#lt-write-modal');
  const readModal = page.querySelector('#lt-read-modal');
  const letterEl = page.querySelector('#lt-letter');
  const condEl = page.querySelector('#lt-conditions');
  const dateEl = page.querySelector('#lt-date');
  const toLabel = page.querySelector('#lt-to-label');
  const statusEl = page.querySelector('#lt-status');
  const saveBtn = page.querySelector('#lt-save');

  let letters = [];
  let filter = 'all';
  let condition = { type: 'feeling', key: 'uzgun' };

  // ── Liste ──
  unsubscribe = onSnapshot(collection(db, 'Letters'), (snap) => {
    letters = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    render();
  }, (err) => {
    console.error('Mektuplar yüklenemedi:', err);
    grid.innerHTML = '<div class="empty-state text-danger"><p class="text-sm">Mektuplar yüklenemedi.</p></div>';
  });

  function lockState(l) {
    if (l.opened) return { open: true, label: 'Açıldı' };
    if (l.unlockType === 'date') {
      const at = parseLocalDate(l.unlockDate);
      const left = at ? daysUntil(at) : 0;
      if (left > 0) return { locked: true, label: left === 1 ? 'Yarın açılır' : `${left} gün sonra açılır` };
    }
    return { ready: true, label: 'Açılmaya hazır' };
  }

  function render() {
    const shown = letters.filter(l => filter === 'all' || l.to === filter);
    if (shown.length === 0) {
      grid.innerHTML = `
        <div class="empty-state lt-empty">
          <span class="text-5xl">💌</span>
          <h3 class="text-lg font-semibold">Henüz mühürlü mektup yok</h3>
          <p class="text-sm">İlk mektubu yaz; doğru an geldiğinde açılsın.</p>
        </div>`;
      return;
    }
    grid.innerHTML = shown.map(l => {
      const st = lockState(l);
      return `
        <article class="lt-envelope ${st.open ? 'is-open' : st.locked ? 'is-locked' : 'is-ready'}" data-id="${l.id}">
          <div class="lt-env-body">
            <div class="lt-env-flap"></div>
            <span class="lt-seal">${st.open ? '💗' : st.locked ? '🔒' : '💌'}</span>
          </div>
          <div class="lt-env-info">
            <span class="label">${personEmoji(l.from)} ${esc(l.from)} → ${personEmoji(l.to)} ${esc(l.to)}</span>
            <h3 class="lt-env-title">${esc(l.title)}</h3>
            <p class="lt-env-cond">${esc(conditionLabel(l))}</p>
            <div class="lt-env-foot">
              <span class="sd-pill ${st.ready ? 'is-soon' : ''}">${st.label}</span>
              <div class="flex gap-1">
                ${st.locked ? '' : `<button type="button" class="btn btn-${st.open ? 'quiet' : 'primary'} btn-sm" data-open="${l.id}">${st.open ? 'Tekrar oku' : 'Aç'}</button>`}
                <button type="button" class="lx-icon-btn is-danger" data-del="${l.id}" aria-label="Sil" title="Sil"><ion-icon name="trash-outline"></ion-icon></button>
              </div>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  page.querySelectorAll('[data-lt-filter]').forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.ltFilter;
    page.querySelectorAll('[data-lt-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
    render();
  }));

  // ── Aç / oku / sil ──
  grid.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!confirm('Bu mektubu kalıcı olarak silmek istediğine emin misin?')) return;
      try { await deleteDoc(doc(db, 'Letters', del.dataset.del)); } catch (err) { console.error(err); toast('Silinemedi', '😢'); }
      return;
    }
    const openBtn = e.target.closest('[data-open]');
    if (!openBtn) return;
    const l = letters.find(x => x.id === openBtn.dataset.open);
    if (!l) return;

    if (!l.opened) {
      if (l.unlockType === 'feeling') {
        const f = feelingOf(l.feeling);
        const ok = confirm(`Bu mektup "${f?.label || 'özel bir an'}" için yazıldı.\nŞu an gerçekten öyle mi hissediyorsun? 💌`);
        if (!ok) return;
      }
      try {
        await updateDoc(doc(db, 'Letters', l.id), { opened: true, openedAt: serverTimestamp() });
        notify('💌 Mektubun açıldı', `${l.to}, "${l.title}" mektubunu açtı ve okudu 🥹`);
      } catch (err) {
        console.error('Mektup açılamadı:', err);
      }
      burst(['💌', '💖', '✨', '🥹']);
    }
    showLetter(l);
  });

  function showLetter(l) {
    const written = l.createdAt?.seconds
      ? new Date(l.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    letterEl.innerHTML = `
      <button class="btn btn-quiet btn-icon lt-letter-close" data-close aria-label="Kapat"><ion-icon name="close-outline" class="text-xl"></ion-icon></button>
      <span class="lt-letter-cond">${esc(conditionLabel(l))}</span>
      <h2 class="lt-letter-title">${esc(l.title)}</h2>
      <p class="lt-letter-to">Sevgili ${esc(l.to)},</p>
      <div class="lt-letter-body">${esc(l.body).replace(/\n/g, '<br>')}</div>
      <p class="lt-letter-sign">Seni seven,<br><strong>${esc(l.from)} ${personEmoji(l.from)}</strong></p>
      ${written ? `<span class="label">${written}</span>` : ''}`;
    readModal.classList.add('active');
  }

  // ── Yaz ──
  const conditions = [
    ...FEELINGS.map(f => ({ type: 'feeling', key: f.key, text: `${f.emoji} ${f.label.replace(' aç', '')}` })),
    ...OCCASIONS.map(o => ({ type: 'date', key: o.key, text: `${o.emoji} ${o.label.replace(' aç', '')}` }))
  ];
  condEl.innerHTML = conditions.map((c, i) =>
    `<button type="button" class="chip ${i === 0 ? 'is-active' : ''}" data-cond="${c.type}:${c.key}">${c.text}</button>`
  ).join('');
  condEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cond]');
    if (!btn) return;
    const [type, key] = btn.dataset.cond.split(':');
    condition = { type, key };
    condEl.querySelectorAll('[data-cond]').forEach(b => b.classList.toggle('is-active', b === btn));
    dateEl.hidden = !(type === 'date' && key === 'custom');
  });
  dateEl.min = isoDate(new Date());

  const from = bindPersonSegment(page.querySelector('#lt-from'), rememberedPerson('yaso_lt_from', 'Kağan'),
    (name) => { toLabel.textContent = `→ ${dative(otherPerson(name))} 💌`; }, 'yaso_lt_from');
  toLabel.textContent = `→ ${dative(otherPerson(from.get()))} 💌`;

  page.querySelector('#lt-write-btn').addEventListener('click', () => {
    statusEl.textContent = '';
    writeModal.classList.add('active');
  });

  [writeModal, readModal].forEach(m => m.addEventListener('click', (e) => {
    if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('active');
  }));

  saveBtn.addEventListener('click', async () => {
    const title = page.querySelector('#lt-title').value.trim();
    const body = page.querySelector('#lt-body').value.trim();
    const sender = from.get();
    const to = otherPerson(sender);
    const fail = (m) => { statusEl.textContent = m; statusEl.style.color = 'var(--danger)'; };

    if (!title) return fail('Zarfın üstüne bir şey yaz 🙏');
    if (body.length < 5) return fail('Mektup biraz kısa kaldı 🥹');

    const data = { title, body, from: sender, to, opened: false, createdAt: serverTimestamp() };
    if (condition.type === 'feeling') {
      Object.assign(data, { unlockType: 'feeling', feeling: condition.key });
    } else {
      let at;
      if (condition.key === 'birthday') {
        const b = BIRTHDAYS.find(x => x.name === to);
        at = nextOccurrence(b.month, b.day);
      } else if (condition.key === 'anniversary') {
        at = nextOccurrence(RELATIONSHIP_START.getMonth() + 1, RELATIONSHIP_START.getDate());
      } else {
        at = parseLocalDate(dateEl.value);
        if (!at) return fail('Açılacağı günü seç 📅');
      }
      Object.assign(data, { unlockType: 'date', occasion: condition.key, unlockDate: isoDate(at) });
    }

    saveBtn.disabled = true;
    try {
      await addDoc(collection(db, 'Letters'), data);
      const hint = data.unlockType === 'feeling'
        ? feelingOf(data.feeling).label.toLocaleLowerCase('tr')
        : `${parseLocalDate(data.unlockDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} günü açılacak`;
      notify('💌 Mühürlü bir mektubun var', `${sender} sana "${title}" mektubunu yazdı (${hint}).`);
      page.querySelector('#lt-title').value = '';
      page.querySelector('#lt-body').value = '';
      writeModal.classList.remove('active');
      toast(`Mektup mühürlendi, ${genitive(to)} kutusunda`, '💌');
    } catch (err) {
      console.error('Mektup kaydedilemedi:', err);
      fail('Kaydedilemedi, tekrar dene 😢');
    } finally {
      saveBtn.disabled = false;
    }
  });
}
