// Bizim Köşemiz (Love Module) Logic
import { db, collection, addDoc, serverTimestamp } from '../../firebase-config.js';

let counterInterval = null;

export function initializeLoveLogic() {
  initLoveCounter();
  initSurpriseNote();
  initDilekMerkezi();
}

// --- 1. Realtime Love Counter ---
function initLoveCounter() {
  const startDate = new Date('2026-05-31T00:00:00');

  function updateCounter() {
    const now = new Date();
    const diffMs = now - startDate;

    if (diffMs < 0) {
      document.getElementById('cnt-years').textContent = '0';
      document.getElementById('cnt-days').textContent = '0';
      document.getElementById('cnt-hours').textContent = '0';
      document.getElementById('cnt-minutes').textContent = '0';
      document.getElementById('cnt-seconds').textContent = '0';
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const remainingHours = totalHours % 24;
    const remainingMinutes = totalMinutes % 60;
    const remainingSeconds = totalSeconds % 60;

    const yElem = document.getElementById('cnt-years');
    const dElem = document.getElementById('cnt-days');
    const hElem = document.getElementById('cnt-hours');
    const mElem = document.getElementById('cnt-minutes');
    const sElem = document.getElementById('cnt-seconds');

    if (yElem) yElem.textContent = years;
    if (dElem) dElem.textContent = remainingDays;
    if (hElem) hElem.textContent = remainingHours;
    if (mElem) mElem.textContent = remainingMinutes;
    if (sElem) sElem.textContent = remainingSeconds;
  }

  updateCounter();
  if (counterInterval) clearInterval(counterInterval);
  counterInterval = setInterval(updateCounter, 1000);
}

// --- 2. Günün Sürpriz Aşk Notu ---
const LOVE_NOTES = [
  "Bazen saman alevi gibi parlasan da, o yufka gibi pamuk kalbini ve tatlılığını çok iyi biliyorum biriciğim 🥰",
  "Duvarlarını bir bir yıkıp o kocaman sevgi dolu kalbine girdiğim için kendimi dünyanın en şanslı adamı sayıyorum ✨",
  "O filtresiz, en doğal, eğlenceli ve geyik dolu hallerin benim bu dünyadaki en favori manzaram! 😂❤️",
  "Beni kıskanan, sorgulayan ve tutkuyla sahiplenen o tatlı hallerine kurban olurum...",
  "Ailene ve sevdiklerine olan o güzel bağlılığın ve kocaman kalbin beni sana her gün yeniden aşık ediyor 🌸",
  "Bazen inatçısın ama adaletini ve haksız olduğunda o tatlı özür dileyişini bile çok seviyorum benim güzel mimarım ❤️",
  "Günün nasıl geçerse geçsin seni her şeyden çok seven biri var burada 🥰",
  "Gülüşün mimarlık projelerinden bile daha kusursuz bir sanat eseri ✨",
  "Dünyanın en tatlı, en güzel ve en çalışkan mimarına kocaman sarılıyorum!",
  "Sen benim hayatıma katılmış en güzel detay ve en büyük şansımsın... ❤️",
  "Ne olursa olsun moralini bozma, arkanda daima seni seven Kağan var 💪🌸"
];

function initSurpriseNote() {
  const getNoteBtn = document.getElementById('get-surprise-note-btn');
  const noteDisplay = document.getElementById('surprise-note-display');

  if (!getNoteBtn || !noteDisplay) return;

  const todayStr = new Date().toLocaleDateString('tr-TR');
  const savedDate = localStorage.getItem('yaso_today_note_date');
  const savedNote = localStorage.getItem('yaso_today_love_note');

  const btnSpan = getNoteBtn.querySelector('span');

  if (savedDate === todayStr && savedNote) {
    noteDisplay.textContent = `"${savedNote}"`;
    getNoteBtn.disabled = true;
    getNoteBtn.style.opacity = '0.65';
    getNoteBtn.style.cursor = 'not-allowed';
    if (btnSpan) btnSpan.textContent = 'Bugünün Notunu Okudun 🥰';
  } else {
    getNoteBtn.disabled = false;
    getNoteBtn.style.opacity = '1';
    getNoteBtn.style.cursor = 'pointer';
    if (btnSpan) btnSpan.textContent = 'Sürpriz Notu Aç 💌';
  }

  getNoteBtn.addEventListener('click', () => {
    if (getNoteBtn.disabled) return;

    const randomIndex = Math.floor(Math.random() * LOVE_NOTES.length);
    const selectedNote = LOVE_NOTES[randomIndex];
    
    noteDisplay.style.opacity = '0';
    setTimeout(() => {
      noteDisplay.textContent = `"${selectedNote}"`;
      noteDisplay.style.opacity = '1';
    }, 200);

    localStorage.setItem('yaso_today_note_date', todayStr);
    localStorage.setItem('yaso_today_love_note', selectedNote);

    getNoteBtn.disabled = true;
    getNoteBtn.style.opacity = '0.65';
    getNoteBtn.style.cursor = 'not-allowed';
    if (btnSpan) btnSpan.textContent = 'Bugünün Notunu Okudun 🥰';

    triggerHeartExplosion();
    showCustomToast("Bugünün sürpriz aşk notu açıldı sevgilim!", "💌");
  });
}

// --- 3. DİLEK & KURAL MERKEZİ LOGIC ---
function getRandomWishDurationSeconds() {
  const rand = Math.random();
  if (rand < 0.20) {
    // 20% chance: 20s to 90s (1.5 mins)
    return Math.floor(Math.random() * (90 - 20 + 1)) + 20;
  } else if (rand < 0.80) {
    // 60% chance: 90s to 3600s (1 hour)
    return Math.floor(Math.random() * (3600 - 90 + 1)) + 90;
  } else {
    // 20% chance: 3600s to 14400s (4 hours)
    return Math.floor(Math.random() * (14400 - 3600 + 1)) + 3600;
  }
}

function formatDurationText(totalSec) {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function initDilekMerkezi() {
  const startTimerBtn = document.getElementById('start-wish-timer-btn');
  const timerDisplay = document.getElementById('wish-timer-display');
  const wishFormBox = document.getElementById('wish-form-box');
  const wishInput = document.getElementById('wish-input');
  const submitWishBtn = document.getElementById('submit-wish-btn');
  const transferWishBtn = document.getElementById('transfer-wish-btn');
  const transferKissModal = document.getElementById('transfer-kiss-modal');
  const closeKissModalBtn = document.getElementById('close-kiss-modal-btn');

  let wishTimer = null;
  let secondsLeft = 0;

  if (startTimerBtn && timerDisplay) {
    startTimerBtn.addEventListener('click', () => {
      secondsLeft = getRandomWishDurationSeconds();
      const initialText = formatDurationText(secondsLeft);

      startTimerBtn.style.display = 'none';
      if (wishFormBox) wishFormBox.style.display = 'block';
      timerDisplay.textContent = initialText;
      timerDisplay.style.color = '#ff4b72';

      showCustomToast(`Sürpriz dilek süren başladı: ${initialText} ⏳`, "⏱️");

      if (wishTimer) clearInterval(wishTimer);
      wishTimer = setInterval(() => {
        secondsLeft--;
        const formatted = formatDurationText(secondsLeft);
        timerDisplay.textContent = formatted;

        if (secondsLeft <= 10) {
          timerDisplay.style.color = '#ef4444';
        }

        if (secondsLeft <= 0) {
          clearInterval(wishTimer);
          showCustomToast("SÜRE DOLDU AŞKIM! Dilek hakkın Kağan'a geçti! (Sınırsız öpücük kazandın 😘)", "⌛");

          addDoc(collection(db, "Notifications"), {
            title: "Dilek Hakkı Süresi Doldu ⌛",
            message: "Süreli dilek süresi bitti. Dilek hakkı Kağan'a geçti!",
            type: "timeout",
            createdAt: serverTimestamp()
          }).catch(err => console.warn(err));

          startTimerBtn.style.display = 'inline-flex';
          if (wishFormBox) wishFormBox.style.display = 'none';
          timerDisplay.textContent = '--:--';
          timerDisplay.style.color = '#ff4b72';
        }
      }, 1000);
    });
  }

  if (submitWishBtn && wishInput) {
    submitWishBtn.addEventListener('click', async () => {
      const val = wishInput.value.trim();
      if (!val) {
        showCustomToast("Lütfen bir dilek yaz aşkım!", "⚠️");
        return;
      }
      if (wishTimer) clearInterval(wishTimer);

      triggerHeartExplosion();

      try {
        await addDoc(collection(db, "Wishes"), {
          wish: val,
          from: "Yasemin",
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, "Notifications"), {
          title: "Yasemin Dilek Kullandı 🧞‍♂️",
          message: `"${val}" (Kağan'a ulaştırıldı!)`,
          type: "wish",
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Dilek gönderme hatası:", err);
      }

      showCustomToast(`Dileğin Kağan'a Ulaştı Sevgilim! (YasoAI: "Oldu bilin efendim! ❤️")`, "🚀");

      wishInput.value = '';
      if (wishFormBox) wishFormBox.style.display = 'none';
      if (startTimerBtn) startTimerBtn.style.display = 'inline-flex';
      if (timerDisplay) {
        timerDisplay.textContent = '--:--';
        timerDisplay.style.color = '#ff4b72';
      }
    });
  }

  if (transferWishBtn && transferKissModal) {
    transferWishBtn.addEventListener('click', async () => {
      transferKissModal.classList.add('active');
      triggerHeartExplosion();

      try {
        await addDoc(collection(db, "Notifications"), {
          title: "Dilek Hakkı Kağan'a Devredildi 💋",
          message: "Yasemin dilek hakkını Kağan'a devretti! Sınırsız öpücük kuponu aktif edildi!",
          type: "transfer",
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn(err);
      }
    });
  }

  if (closeKissModalBtn && transferKissModal) {
    closeKissModalBtn.addEventListener('click', () => {
      transferKissModal.classList.remove('active');
    });
  }
}

// --- 4. Sleek Custom UI Toast Notification Engine ---
export function showCustomToast(message, emoji = '💖') {
  const existingToast = document.querySelector('.custom-ui-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'custom-ui-toast';
  toast.innerHTML = `
    <span style="font-size: 1.4rem;">${emoji}</span>
    <span style="font-size: 0.92rem; font-weight: 600; color: var(--text-color);">${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4200);
}

function triggerHeartExplosion() {
  const hearts = ['❤️', '💖', '💕', '🌸', '✨', '🥰', '💋'];
  for (let i = 0; i < 20; i++) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart-anim';
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.left = `${Math.random() * 80 + 10}vw`;
    heart.style.top = `${Math.random() * 40 + 40}vh`;
    document.body.appendChild(heart);

    setTimeout(() => heart.remove(), 1800);
  }
}
