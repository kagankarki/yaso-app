// Aşk Kupon Defteri (Firestore: Coupons).
// Bir kişi diğerine kupon verir; sahibi "Kullan" deyince kupon damgalanır ve
// veren kişiye bildirim gider.
import { db, collection, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, writeBatch } from '../firebase-config.js';
import { esc, toast } from '../utils.js';
import { personEmoji, otherPerson, dative, genitive, ablative, notify, rememberedPerson, bindPersonSegment, burst } from './shared.js';

const TEMPLATES = [
  { emoji: '🥐', title: 'Yatakta kahvaltı' },
  { emoji: '🎬', title: 'Film seçme hakkı' },
  { emoji: '💆‍♀️', title: '15 dakika masaj' },
  { emoji: '🏳️', title: 'Tartışmada haklı çıkma kartı' },
  { emoji: '🍽️', title: 'Bulaşıktan muafiyet' },
  { emoji: '🤗', title: 'Sınırsız sarılma' },
  { emoji: '💐', title: 'Sürpriz çiçek' },
  { emoji: '👑', title: 'Bir gün prenses modu' },
  { emoji: '🍫', title: 'İstediğin tatlı kapında' },
  { emoji: '🛍️', title: 'Alışverişte sabırlı eşlik' },
  { emoji: '📵', title: 'Telefonsuz akşam' },
  { emoji: '🎤', title: 'Senin için şarkı söylerim' }
];

let unsubscribe = null;

export function initializeKuponlarLogic() {
  const page = document.getElementById('kuponlar-page');
  if (!page) return;
  if (unsubscribe) unsubscribe();

  const grid = page.querySelector('#cp-grid');
  const modal = page.querySelector('#cp-modal');
  const statusEl = page.querySelector('#cp-status');
  const saveBtn = page.querySelector('#cp-save');
  const titleEl = page.querySelector('#cp-title');
  const emojiEl = page.querySelector('#cp-emoji');
  const descEl = page.querySelector('#cp-desc');
  const countEl = page.querySelector('#cp-count');
  const toLabel = page.querySelector('#cp-to-label');

  let coupons = [];
  let tab = 'active';
  let owner = 'all';

  unsubscribe = onSnapshot(collection(db, 'Coupons'), (snap) => {
    coupons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => {
    console.error('Kuponlar yüklenemedi:', err);
    grid.innerHTML = '<div class="empty-state text-danger"><p class="text-sm">Kuponlar yüklenemedi.</p></div>';
  });

  function render() {
    const shown = coupons
      .filter(c => (tab === 'used' ? c.status === 'used' : c.status !== 'used'))
      .filter(c => owner === 'all' || c.to === owner)
      .sort((a, b) => tab === 'used'
        ? (b.usedAt?.seconds || 0) - (a.usedAt?.seconds || 0)
        : (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (shown.length === 0) {
      grid.innerHTML = `
        <div class="empty-state cp-empty">
          <span class="text-5xl">🎟️</span>
          <p class="text-sm">${tab === 'used' ? 'Henüz kullanılmış kupon yok.' : 'Kullanılabilir kupon yok. "Kupon Hazırla" ile bir sürpriz yap!'}</p>
        </div>`;
      return;
    }

    grid.innerHTML = shown.map(c => {
      const used = c.status === 'used';
      const usedText = used && c.usedAt?.seconds
        ? new Date(c.usedAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
        : '';
      return `
        <article class="cp-ticket ${used ? 'is-used' : ''}">
          <div class="cp-main">
            <span class="cp-kicker">${personEmoji(c.from)} ${esc(ablative(c.from))} ${personEmoji(c.to)} ${esc(dative(c.to))}</span>
            <h3 class="cp-title">${esc(c.title)}</h3>
            ${c.desc ? `<p class="cp-desc">${esc(c.desc)}</p>` : ''}
            ${used ? `<span class="cp-used-date">${usedText} tarihinde kullanıldı</span>` : ''}
          </div>
          <div class="cp-stub">
            <span class="cp-emoji">${esc(c.emoji || '🎟️')}</span>
            ${used
              ? '<span class="cp-stamp">KULLANILDI</span>'
              : `<button type="button" class="btn btn-primary btn-sm" data-use="${c.id}">Kullan</button>`}
          </div>
          <button type="button" class="cp-del" data-del="${c.id}" aria-label="Sil" title="Sil"><ion-icon name="close-outline"></ion-icon></button>
        </article>`;
    }).join('');
  }

  page.querySelectorAll('[data-cp-tab]').forEach(btn => btn.addEventListener('click', () => {
    tab = btn.dataset.cpTab;
    page.querySelectorAll('[data-cp-tab]').forEach(b => b.classList.toggle('is-active', b === btn));
    render();
  }));
  page.querySelectorAll('[data-cp-owner]').forEach(btn => btn.addEventListener('click', () => {
    owner = btn.dataset.cpOwner;
    page.querySelectorAll('[data-cp-owner]').forEach(b => b.classList.toggle('is-active', b === btn));
    render();
  }));

  grid.addEventListener('click', async (e) => {
    const use = e.target.closest('[data-use]');
    if (use) {
      const c = coupons.find(x => x.id === use.dataset.use);
      if (!c || !confirm(`"${c.title}" kuponunu şimdi kullanmak istiyor musun? ${c.emoji || ''}`)) return;
      try {
        await updateDoc(doc(db, 'Coupons', c.id), { status: 'used', usedAt: serverTimestamp() });
        notify(`🎟️ Kupon kullanıldı!`, `${c.to}, "${c.title}" kuponunu kullandı ${c.emoji || ''} Söz verdin ${c.from}, hadi bakalım 😘`);
        burst([c.emoji || '🎟️', '💖', '✨']);
        toast(`${dative(c.from)} haber verildi`, '🎟️');
      } catch (err) {
        console.error('Kupon kullanılamadı:', err);
        toast('Kupon kullanılamadı, tekrar dene', '😢');
      }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del && confirm('Bu kuponu silmek istediğine emin misin?')) {
      try { await deleteDoc(doc(db, 'Coupons', del.dataset.del)); } catch (err) { console.error(err); }
    }
  });

  // ── Kupon hazırla ──
  page.querySelector('#cp-templates').innerHTML = TEMPLATES.map((t, i) =>
    `<button type="button" class="chip" data-tpl="${i}">${t.emoji} ${t.title}</button>`).join('');
  page.querySelector('#cp-templates').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tpl]');
    if (!btn) return;
    const t = TEMPLATES[Number(btn.dataset.tpl)];
    titleEl.value = t.title;
    emojiEl.value = t.emoji;
  });

  const from = bindPersonSegment(page.querySelector('#cp-from'), rememberedPerson('yaso_cp_from', 'Kağan'),
    (name) => { toLabel.textContent = `→ ${dative(otherPerson(name))} 🎁`; }, 'yaso_cp_from');
  toLabel.textContent = `→ ${dative(otherPerson(from.get()))} 🎁`;

  page.querySelector('#cp-new-btn').addEventListener('click', () => {
    statusEl.textContent = '';
    modal.classList.add('active');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.classList.remove('active');
  });

  saveBtn.addEventListener('click', async () => {
    const title = titleEl.value.trim();
    const count = Math.max(1, Math.min(10, Number(countEl.value) || 1));
    if (!title) {
      statusEl.textContent = 'Kupona bir isim ver 🙏';
      statusEl.style.color = 'var(--danger)';
      return;
    }
    const sender = from.get();
    const to = otherPerson(sender);
    const data = {
      title, emoji: emojiEl.value.trim() || '🎟️', desc: descEl.value.trim(),
      from: sender, to, status: 'active', createdAt: serverTimestamp()
    };

    saveBtn.disabled = true;
    try {
      const batch = writeBatch(db);
      for (let i = 0; i < count; i++) batch.set(doc(collection(db, 'Coupons')), data);
      await batch.commit();
      notify('🎁 Yeni kuponun var!', `${sender} sana ${count > 1 ? `${count} adet ` : ''}"${title}" kuponu verdi ${data.emoji}`);
      titleEl.value = ''; emojiEl.value = ''; descEl.value = ''; countEl.value = 1;
      modal.classList.remove('active');
      toast(`Kupon ${genitive(to)} defterine eklendi`, data.emoji);
    } catch (err) {
      console.error('Kupon kaydedilemedi:', err);
      statusEl.textContent = 'Kaydedilemedi, tekrar dene 😢';
      statusEl.style.color = 'var(--danger)';
    } finally {
      saveBtn.disabled = false;
    }
  });
}
