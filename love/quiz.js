// Bizim Testlerimiz — Firebase bağlı çoktan seçmeli quiz modülü.
// Millet soru girer → kaydeder (Firestore) → biz çözeriz → skor gösterilir & kaydedilir.
import {
  db, collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp
} from '../firebase-config.js';
import { esc } from '../utils.js';
import { initializeSorular36 } from './sorular36.js';

const OPTION_COUNT = 4;
const PLAYERS = [
  { name: 'Yasemin', emoji: '🌸' },
  { name: 'Kağan', emoji: '👑' }
];

// Sayfaya her girişte yeni dinleyici açılıyor; eskileri kapat ki birikmesin.
let unsubscribers = [];

// "Kağan'ın testi" → çözen büyük ihtimalle Yasemin; değilse son seçim.
function defaultSolver(createdBy) {
  const by = (createdBy || '').toLocaleLowerCase('tr');
  if (by.includes('kağan') || by.includes('kagan')) return 'Yasemin';
  if (by.includes('yasemin')) return 'Kağan';
  return localStorage.getItem('yaso_quiz_solver') || 'Yasemin';
}

export function initializeQuizLogic() {
  const page = document.getElementById('quiz-page');
  if (!page) return;

  unsubscribers.forEach(fn => fn());
  unsubscribers = [];

  const solveView = document.getElementById('quiz-solve-view');
  const createView = document.getElementById('quiz-create-view');
  const tabs = page.querySelectorAll('.quiz-tab-btn');
  const listEl = document.getElementById('quiz-list');

  const builder = document.getElementById('quiz-questions-builder');
  const addQBtn = document.getElementById('quiz-add-question-btn');
  const saveBtn = document.getElementById('quiz-save-btn');
  const statusEl = document.getElementById('quiz-create-status');
  const titleInput = document.getElementById('quiz-title-input');
  const authorInput = document.getElementById('quiz-author-input');

  // ─────────────── Sekme geçişi (Çöz / Oluştur) ───────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const which = tab.dataset.quizTab;
      solveView.style.display = which === 'solve' ? '' : 'none';
      createView.style.display = which === 'create' ? '' : 'none';
      const qaView = document.getElementById('quiz-qa-view');
      if (qaView) qaView.style.display = which === 'qa' ? '' : 'none';
      if (which === 'qa') initializeSorular36();
    });
  });

  // ─────────────── OLUŞTUR: dinamik soru kurucusu ───────────────
  function addQuestionBlock() {
    const groupName = `q-correct-${Date.now()}-${builder.children.length}`;
    const block = document.createElement('div');
    block.className = 'quiz-q-card';
    block.innerHTML = `
      <div class="quiz-q-head">
        <span class="quiz-q-num">Soru</span>
        <button type="button" class="quiz-remove-q" title="Soruyu sil">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
      <input class="input quiz-q-text" placeholder="Soru metnini yaz...">
      <div class="quiz-opts-build">
        ${Array.from({ length: OPTION_COUNT }, (_, i) => `
          <label class="quiz-opt-build">
            <input type="radio" name="${groupName}" value="${i}" ${i === 0 ? 'checked' : ''} class="quiz-correct-radio" title="Doğru cevap">
            <span class="quiz-opt-letter">${String.fromCharCode(65 + i)}</span>
            <input class="input quiz-opt-input" placeholder="Seçenek ${String.fromCharCode(65 + i)}${i < 2 ? ' *' : ''}">
          </label>
        `).join('')}
      </div>
      <p class="quiz-q-hint"><ion-icon name="radio-button-on-outline"></ion-icon> Soldaki yuvarlaktan doğru cevabı işaretle.</p>
    `;
    builder.appendChild(block);
    block.querySelector('.quiz-remove-q').addEventListener('click', () => {
      block.remove();
      renumber();
    });
    renumber();
  }

  function renumber() {
    [...builder.children].forEach((b, i) => {
      const n = b.querySelector('.quiz-q-num');
      if (n) n.textContent = `Soru ${i + 1}`;
    });
  }

  addQBtn?.addEventListener('click', addQuestionBlock);
  if (builder && builder.children.length === 0) addQuestionBlock();

  // ─────────────── OLUŞTUR: kaydet ───────────────
  saveBtn?.addEventListener('click', async () => {
    const title = (titleInput.value || '').trim();
    const author = (authorInput.value || '').trim() || 'Gizli Hayran';

    if (!title) { setStatus('Lütfen teste bir başlık ver 💭', true); return; }

    const questions = [];
    for (const b of builder.children) {
      const qText = (b.querySelector('.quiz-q-text').value || '').trim();
      const optInputs = [...b.querySelectorAll('.quiz-opt-input')];
      const rawOptions = optInputs.map(o => (o.value || '').trim());
      const correctRadio = b.querySelector('.quiz-correct-radio:checked');
      const rawCorrect = correctRadio ? parseInt(correctRadio.value, 10) : 0;

      if (!qText) { setStatus('Bir sorunun metni boş kalmış 🙏', true); return; }
      if (rawOptions.filter(Boolean).length < 2) { setStatus('Her soruda en az 2 seçenek olmalı 🙏', true); return; }
      if (!rawOptions[rawCorrect]) { setStatus('İşaretlediğin doğru cevap boş olamaz 🙏', true); return; }

      // Boş seçenekleri at, doğru cevabın index'ini yeniden eşle.
      const options = [];
      let correct = 0;
      rawOptions.forEach((opt, i) => {
        if (opt) {
          if (i === rawCorrect) correct = options.length;
          options.push(opt);
        }
      });
      questions.push({ q: qText, options, correct });
    }

    if (questions.length === 0) { setStatus('En az 1 soru ekle 🙏', true); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Kaydediliyor...';
    try {
      await addDoc(collection(db, 'LoveQuizzes'), {
        title,
        createdBy: author,
        questions,
        createdAt: serverTimestamp()
      });
      setStatus('Test kaydedildi! 🎉 Çöz sekmesine geçtik.', false);
      titleInput.value = '';
      authorInput.value = '';
      builder.innerHTML = '';
      addQuestionBlock();
      page.querySelector('.quiz-tab-btn[data-quiz-tab="solve"]').click();
    } catch (err) {
      console.error('Test kaydetme hatası:', err);
      setStatus('Kaydedilemedi, tekrar dene 😢', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon> Testi Kaydet';
    }
  });

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--ok)';
    if (!isError) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 4000);
  }

  // ─────────────── ÇÖZ: kayıtlı testleri dinle & listele ───────────────
  // ─────────────── SKOR TABLOSU: Kim kimi daha iyi tanıyor? ───────────────
  const verdictEl = document.getElementById('qs-verdict');
  const playersEl = document.getElementById('qs-players');
  const recentEl = document.getElementById('qs-recent');

  unsubscribers.push(onSnapshot(collection(db, 'QuizScores'), (snap) => {
    // Çözeni bilinmeyen eski skorlar tabloya katılmaz.
    const scores = snap.docs.map(d => d.data()).filter(s => s.solver && s.total > 0);
    renderScoreboard(scores);
  }, (err) => {
    console.warn('Skorlar yüklenemedi:', err);
    if (verdictEl) verdictEl.textContent = 'Skorlar şu an yüklenemedi.';
  }));

  function renderScoreboard(scores) {
    if (!playersEl) return;
    const stats = PLAYERS.map(p => {
      const mine = scores.filter(s => s.solver === p.name);
      const correct = mine.reduce((a, s) => a + s.score, 0);
      const total = mine.reduce((a, s) => a + s.total, 0);
      return {
        ...p,
        tests: mine.length,
        correct,
        total,
        pct: total ? Math.round((correct / total) * 100) : 0,
        perfect: mine.filter(s => s.score === s.total).length
      };
    });

    const [a, b] = stats;
    const leader = a.tests + b.tests === 0 ? null
      : a.pct === b.pct ? 'tie'
      : (a.pct > b.pct ? a : b);

    verdictEl.textContent = !leader ? 'Henüz kimse test çözmedi. İlk puanı kim alacak? 👀'
      : leader === 'tie' ? 'Berabere! İkiniz de birbirinizi aynı derecede iyi tanıyorsunuz 💞'
      : `${leader.emoji} ${leader.name} önde! Karşısındakini %${leader.pct} doğrulukla tanıyor.`;

    playersEl.innerHTML = stats.map(p => `
      <div class="qs-player ${leader && leader !== 'tie' && leader.name === p.name ? 'is-leader' : ''}">
        <div class="qs-player-top">
          <span class="qs-avatar">${p.emoji}</span>
          <strong>${p.name}</strong>
          ${leader && leader !== 'tie' && leader.name === p.name ? '<span class="qs-crown" title="Lider">👑</span>' : ''}
          <span class="qs-pct numeric">%${p.pct}</span>
        </div>
        <div class="qs-track"><div class="qs-fill" style="width:${p.pct}%"></div></div>
        <div class="qs-stats">
          <span>${p.tests} test</span>
          <span>${p.correct}/${p.total} doğru</span>
          <span>${p.perfect} tam puan 🏆</span>
        </div>
      </div>
    `).join('');

    const recent = [...scores]
      .sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0))
      .slice(0, 4);
    recentEl.innerHTML = recent.length ? `
      <span class="label">Son çözülenler</span>
      ${recent.map(s => `
        <div class="qs-recent-row">
          <span>${s.solver === 'Kağan' ? '👑' : '🌸'} <strong>${esc(s.solver)}</strong> · ${esc(s.quizTitle || 'Test')}</span>
          <span class="numeric">${s.score}/${s.total}</span>
        </div>`).join('')}` : '';
  }

  const qy = query(collection(db, 'LoveQuizzes'), orderBy('createdAt', 'desc'));
  unsubscribers.push(onSnapshot(qy, (snap) => {
    if (snap.empty) {
      listEl.innerHTML = `
        <div class="empty-state">
          <ion-icon name="game-controller-outline" class="text-4xl text-primary" style="opacity:.5"></ion-icon>
          <h3 class="text-lg font-semibold">Henüz test yok</h3>
          <p class="text-sm">Önce bir test oluşturup kaydet, sonra buradan çöz 💘</p>
          <button class="btn btn-primary" id="quiz-empty-create-btn">
            <ion-icon name="add-circle-outline"></ion-icon> İlk Testi Oluştur
          </button>
        </div>`;
      const emptyBtn = document.getElementById('quiz-empty-create-btn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          page.querySelector('.quiz-tab-btn[data-quiz-tab="create"]').click();
        });
      }
      return;
    }

    listEl.innerHTML = '';
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      const count = data.questions?.length || 0;

      const card = document.createElement('div');
      card.className = 'quiz-card';
      card.innerHTML = `
        <div class="quiz-card-top">
          <div class="quiz-card-icon">🧠</div>
          <button class="quiz-del-btn" data-id="${id}" title="Testi sil">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </div>
        <h3 class="quiz-card-title">${esc(data.title)}</h3>
        <p class="quiz-card-meta">
          <ion-icon name="help-circle-outline"></ion-icon> ${count} soru
          <span class="quiz-card-dot">·</span>
          <ion-icon name="person-outline"></ion-icon> ${esc(data.createdBy || 'Anonim')}
        </p>
        <button class="btn btn-primary quiz-solve-btn" data-id="${id}">
          <ion-icon name="play"></ion-icon> Çöz
        </button>
      `;
      listEl.appendChild(card);

      card.querySelector('.quiz-solve-btn').addEventListener('click', () => openPlay(id, data));
      card.querySelector('.quiz-del-btn').addEventListener('click', async () => {
        if (!confirm('Bu testi silmek istediğine emin misin?')) return;
        try {
          await deleteDoc(doc(db, 'LoveQuizzes', id));
        } catch (err) {
          console.error('Test silme hatası:', err);
        }
      });
    });
  }, (err) => {
    console.error('Testler yüklenemedi:', err);
    listEl.innerHTML = `<div class="empty-state text-danger">
      <ion-icon name="cloud-offline-outline" class="text-4xl"></ion-icon>
      <p class="text-sm">Testler yüklenemedi. Bağlantını kontrol et.</p>
    </div>`;
  }));

  // ─────────────── ÇÖZ: oynatma modalı ───────────────
  function openPlay(id, data) {
    const modal = document.getElementById('quiz-play-modal');
    const titleEl = document.getElementById('quiz-play-title');
    const body = document.getElementById('quiz-play-body');
    const resultEl = document.getElementById('quiz-play-result');
    const submitBtn = document.getElementById('quiz-play-submit');
    const closeBtn = document.getElementById('quiz-play-close');

    const questions = data.questions || [];
    const answers = new Array(questions.length).fill(-1);
    let submitted = false;

    // Kim çözüyor?
    const solverBtns = modal.querySelectorAll('[data-solver]');
    let solver = defaultSolver(data.createdBy);
    const setSolver = (name) => {
      solver = name;
      solverBtns.forEach(b => {
        b.classList.toggle('is-active', b.dataset.solver === name);
        b.disabled = false;
      });
    };
    setSolver(solver);
    solverBtns.forEach(b => {
      b.onclick = () => {
        if (submitted) return;
        setSolver(b.dataset.solver);
        localStorage.setItem('yaso_quiz_solver', solver);
      };
    });

    titleEl.textContent = data.title;
    resultEl.textContent = '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Bitir & Skoru Gör';

    body.innerHTML = questions.map((q, qi) => `
      <div class="quiz-play-q" data-qi="${qi}">
        <div class="quiz-play-q-title">${qi + 1}. ${esc(q.q)}</div>
        <div class="quiz-play-opts">
          ${q.options.map((opt, oi) => `
            <button type="button" class="quiz-opt" data-qi="${qi}" data-oi="${oi}">
              <span class="quiz-opt-letter">${String.fromCharCode(65 + oi)}</span>
              <span class="quiz-opt-text">${esc(opt)}</span>
              <ion-icon class="quiz-opt-mark"></ion-icon>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Seçenek seçimi
    body.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (submitted) return;
        const qi = parseInt(btn.dataset.qi, 10);
        answers[qi] = parseInt(btn.dataset.oi, 10);
        body.querySelectorAll(`.quiz-opt[data-qi="${qi}"]`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    submitBtn.onclick = async () => {
      if (submitted) { modal.classList.remove('active'); return; }
      if (answers.includes(-1)) {
        resultEl.textContent = 'Önce tüm soruları işaretle 🙏';
        resultEl.style.color = 'var(--warn)';
        return;
      }

      submitted = true;
      solverBtns.forEach(b => { b.disabled = true; });
      let score = 0;
      questions.forEach((q, qi) => {
        const chosen = answers[qi];
        if (chosen === q.correct) score++;
        body.querySelectorAll(`.quiz-opt[data-qi="${qi}"]`).forEach(b => {
          const oi = parseInt(b.dataset.oi, 10);
          const mark = b.querySelector('.quiz-opt-mark');
          if (oi === q.correct) {
            b.classList.add('correct');
            if (mark) mark.setAttribute('name', 'checkmark-circle');
          } else if (oi === chosen) {
            b.classList.add('wrong');
            if (mark) mark.setAttribute('name', 'close-circle');
          }
          b.disabled = true;
        });
      });

      const total = questions.length;
      const pct = Math.round((score / total) * 100);
      const emoji = pct === 100 ? '🏆' : pct >= 60 ? '🎉' : pct >= 40 ? '🙂' : '🌱';
      resultEl.innerHTML = `<span style="color:var(--primary)">${emoji} ${esc(solver)}: ${score}/${total} doğru · %${pct}</span>`;
      resultEl.style.color = '';
      submitBtn.textContent = 'Kapat';

      // Skoru kaydet (isteğe bağlı kayıt; hata olsa da akış bozulmaz)
      try {
        await addDoc(collection(db, 'QuizScores'), {
          quizId: id,
          quizTitle: data.title,
          solver,
          score,
          total,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Skor kaydedilemedi:', err);
      }
    };

    closeBtn.onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    modal.classList.add('active');
    body.scrollTop = 0;
  }
}
