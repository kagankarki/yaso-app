// Hayal Panomuz (Firestore: Dreams).
// Ortak hayaller fotoğraflı polaroid kartlar olarak durur. "Gerçekleşti"
// denince kart damgalanır ve Zaman Tüneli'ne (Love koleksiyonu) anı eklenir.
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from '../firebase-config.js';
import { esc, toast } from '../utils.js';
import { notify, resizeImageToDataUrl, burst } from './shared.js';

const CATEGORIES = [
  { key: 'seyahat', emoji: '✈️', label: 'Seyahat', tl: 'Gezi' },
  { key: 'ev', emoji: '🏡', label: 'Yuvamız', tl: 'Aşk' },
  { key: 'birlikte', emoji: '💞', label: 'Birlikte', tl: 'Aşk' },
  { key: 'macera', emoji: '🎢', label: 'Macera', tl: 'Sürpriz' },
  { key: 'kariyer', emoji: '📐', label: 'Kariyer', tl: 'Mimari' },
  { key: 'kucuk', emoji: '🌷', label: 'Küçük Mutluluklar', tl: 'Aşk' }
];
const catOf = key => CATEGORIES.find(c => c.key === key) || CATEGORIES[2];

let unsubscribe = null;

export function initializeHayallerLogic() {
  const page = document.getElementById('hayaller-page');
  if (!page) return;
  if (unsubscribe) unsubscribe();

  const board = page.querySelector('#dr-board');
  const progressEl = page.querySelector('#dr-progress');
  const modal = page.querySelector('#dr-modal');
  const statusEl = page.querySelector('#dr-status');
  const saveBtn = page.querySelector('#dr-save');
  const photoInput = page.querySelector('#dr-photo');
  const photoPreview = page.querySelector('#dr-photo-preview');

  let dreams = [];
  let filter = 'all';
  let category = CATEGORIES[0];
  let photo = '';

  unsubscribe = onSnapshot(collection(db, 'Dreams'), (snap) => {
    dreams = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.done) - Number(b.done)) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    render();
  }, (err) => {
    console.error('Hayaller yüklenemedi:', err);
    board.innerHTML = '<div class="empty-state text-danger"><p class="text-sm">Hayaller yüklenemedi.</p></div>';
  });

  function render() {
    const doneCount = dreams.filter(d => d.done).length;
    progressEl.hidden = dreams.length === 0;
    if (dreams.length) {
      const pct = Math.round((doneCount / dreams.length) * 100);
      progressEl.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <strong>${doneCount} / ${dreams.length} hayal gerçekleşti</strong>
          <span class="numeric text-primary">%${pct}</span>
        </div>
        <div class="sd-bday-track"><div class="sd-bday-fill" style="width:${pct}%"></div></div>`;
    }

    const shown = dreams.filter(d => filter === 'all' || (filter === 'done' ? d.done : !d.done));
    if (shown.length === 0) {
      board.innerHTML = `
        <div class="empty-state dr-empty">
          <span class="text-5xl">🌠</span>
          <p class="text-sm">${filter === 'done' ? 'Henüz gerçekleşen yok; ama sırada çok güzel şeyler var!' : 'Panoya ilk hayalinizi asın ✨'}</p>
        </div>`;
      return;
    }

    board.innerHTML = shown.map((d, i) => {
      const cat = catOf(d.category);
      return `
        <article class="dr-card ${d.done ? 'is-done' : ''}" style="--tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.6)}deg">
          <span class="dr-pin" aria-hidden="true"></span>
          <div class="dr-visual">
            ${d.photo ? `<img src="${esc(d.photo)}" alt="" loading="lazy">` : `<span class="dr-visual-emoji">${cat.emoji}</span>`}
            ${d.done ? '<span class="dr-stamp">GERÇEKLEŞTİ</span>' : ''}
          </div>
          <div class="dr-body">
            <span class="sd-kind">${cat.emoji} ${cat.label}${d.target ? ` · ${esc(d.target)}` : ''}</span>
            <h3 class="dr-title">${esc(d.title)}</h3>
            ${d.desc ? `<p class="dr-desc">${esc(d.desc)}</p>` : ''}
            <div class="dr-foot">
              ${d.done
                ? `<span class="text-xs text-muted">🎉 ${d.doneAt?.seconds ? new Date(d.doneAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</span>`
                : `<button type="button" class="btn btn-ghost btn-sm" data-done="${d.id}"><ion-icon name="checkmark-circle-outline"></ion-icon> Gerçekleşti!</button>`}
              <button type="button" class="lx-icon-btn is-danger" data-del="${d.id}" aria-label="Sil" title="Sil"><ion-icon name="trash-outline"></ion-icon></button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  page.querySelectorAll('[data-dr-filter]').forEach(btn => btn.addEventListener('click', () => {
    filter = btn.dataset.drFilter;
    page.querySelectorAll('[data-dr-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
    render();
  }));

  board.addEventListener('click', async (e) => {
    const doneBtn = e.target.closest('[data-done]');
    if (doneBtn) {
      const d = dreams.find(x => x.id === doneBtn.dataset.done);
      if (!d || !confirm(`"${d.title}" gerçekleşti mi? 🎉 Zaman Tüneli'ne anı olarak eklenecek.`)) return;
      try {
        await updateDoc(doc(db, 'Dreams', d.id), { done: true, doneAt: serverTimestamp() });
        const cat = catOf(d.category);
        await addDoc(collection(db, 'Love'), {
          title: `Hayalimiz gerçekleşti: ${d.title}`,
          category: cat.tl,
          emoji: cat.emoji,
          date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
          desc: d.desc || 'Hayal panomuzdan gerçeğe ✨',
          photo: d.photo || '',
          likes: 1,
          createdAt: serverTimestamp()
        });
        notify('🎉 Bir hayalimiz gerçekleşti!', `"${d.title}" artık bir anı. Zaman Tüneli'ne eklendi ✨`);
        burst(['🎉', '✨', '💖', cat.emoji]);
      } catch (err) {
        console.error('Hayal güncellenemedi:', err);
        toast('Güncellenemedi, tekrar dene', '😢');
      }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del && confirm('Bu hayali panodan kaldırmak istediğine emin misin?')) {
      try { await deleteDoc(doc(db, 'Dreams', del.dataset.del)); } catch (err) { console.error(err); }
    }
  });

  // ── Hayal ekle ──
  const catsEl = page.querySelector('#dr-cats');
  catsEl.innerHTML = CATEGORIES.map((c, i) =>
    `<button type="button" class="chip ${i === 0 ? 'is-active' : ''}" data-cat="${c.key}">${c.emoji} ${c.label}</button>`).join('');
  catsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    category = catOf(btn.dataset.cat);
    catsEl.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('is-active', b === btn));
  });

  page.querySelector('#dr-photo-btn').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    if (!file) return;
    try {
      photo = await resizeImageToDataUrl(file, 900, 0.75);
      photoPreview.src = photo;
      photoPreview.hidden = false;
    } catch (err) {
      console.error('Fotoğraf işlenemedi:', err);
      toast('Fotoğraf işlenemedi', '😢');
    }
  });

  page.querySelector('#dr-new-btn').addEventListener('click', () => {
    statusEl.textContent = '';
    modal.classList.add('active');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.classList.remove('active');
  });

  saveBtn.addEventListener('click', async () => {
    const title = page.querySelector('#dr-title').value.trim();
    if (!title) {
      statusEl.textContent = 'Hayalimizin adını yaz ✨';
      statusEl.style.color = 'var(--danger)';
      return;
    }
    saveBtn.disabled = true;
    try {
      await addDoc(collection(db, 'Dreams'), {
        title,
        desc: page.querySelector('#dr-desc').value.trim(),
        target: page.querySelector('#dr-target').value.trim(),
        category: category.key,
        photo,
        done: false,
        createdAt: serverTimestamp()
      });
      ['#dr-title', '#dr-desc', '#dr-target'].forEach(s => { page.querySelector(s).value = ''; });
      photo = '';
      photoInput.value = '';
      photoPreview.hidden = true;
      modal.classList.remove('active');
      toast('Hayal panoya asıldı', category.emoji);
    } catch (err) {
      console.error('Hayal kaydedilemedi:', err);
      statusEl.textContent = 'Kaydedilemedi, tekrar dene 😢';
      statusEl.style.color = 'var(--danger)';
    } finally {
      saveBtn.disabled = false;
    }
  });
}
