import './ionicons-loader.js';
import './styles/main.css';
import './styles/love-extras.css';
import './styles/love-features.css';
import { initializeLoveLogic } from './love/love.js';
import { initializeZamanTuneliLogic } from './love/zaman-tuneli.js';
import { initializeQuizLogic } from './love/quiz.js';
import { initializeBulusmaLogic } from './love/bulusma.js';
import { initializeOzelGunlerLogic } from './love/ozel-gunler.js';
import { initializeMektuplarLogic } from './love/mektuplar.js';
import { initializeKuponlarLogic } from './love/kuponlar.js';
import { initializeHayallerLogic } from './love/hayaller.js';
import { initializeLoveLanguage } from './love/love-language.js';
import { buildSpecialDays, loadSpecialDayData, daysUntil } from './love/special-days.js';
import { initializeYasoAILogic } from './yaso-ai.js';
import { db, collection, onSnapshot, query, orderBy } from './firebase-config.js';
import { trackUserAddress } from './address-tracker.js';
import { esc, toast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Sessizce konum ve IP adresi kaydı yap (İzin istemez)
  trackUserAddress();

  const navItems = document.querySelectorAll('.nav-item');
  const pageTitle = document.getElementById('page-title');
  const dynamicContent = document.getElementById('dynamic-content');

  async function navigateTo(pageId, title) {
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === pageId) {
        item.classList.add('active');
      }
    });

    if (title && pageTitle) {
      pageTitle.textContent = title;
    }

    try {
      const cleanPath = pageId.replace(/^\//, '');
      const response = await fetch(`/${cleanPath}.html`);
      if (!response.ok) throw new Error(`Sayfa bulunamadı (${response.status})`);
      
      const html = await response.text();
      dynamicContent.innerHTML = html;
      
      try {
        initializeDynamicPageContent(pageId);
      } catch (initErr) {
        console.warn("Love sayfa başlatma uyarısı:", initErr);
      }

    } catch (error) {
      console.error("Love sayfa yükleme hatası:", error);
      dynamicContent.innerHTML = `
        <div class="empty-state text-danger">
          <ion-icon name="warning-outline" class="text-5xl"></ion-icon>
          <h2>Sayfa Yüklenemedi</h2>
          <p class="text-sm text-muted">${error.message}</p>
        </div>
      `;
    }
  }

  function initializeDynamicPageContent(pageId) {
    if (document.getElementById('love-page')) {
      initializeLoveLogic();
      initializeLoveLanguage();
    }
    if (document.getElementById('zaman-tuneli-page')) {
      initializeZamanTuneliLogic();
    }
    if (document.getElementById('quiz-page')) {
      initializeQuizLogic();
    }
    if (document.getElementById('bulusma-page')) {
      initializeBulusmaLogic();
    }
    if (document.getElementById('ozel-gunler-page')) {
      initializeOzelGunlerLogic();
    }
    if (document.getElementById('mektuplar-page')) {
      initializeMektuplarLogic();
    }
    if (document.getElementById('kuponlar-page')) {
      initializeKuponlarLogic();
    }
    if (document.getElementById('hayaller-page')) {
      initializeHayallerLogic();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      const title = item.querySelector('span').textContent;
      navigateTo(pageId, title);
    });
  });

  navigateTo('love/love', 'Bizim Köşemiz ❤️');

  showSpecialDayReminders();

  initializeYasoAILogic();

  // --- Tema (gece seansı / gündüz seansı) ---
  // Üç modda da aynı anahtar ve aynı mekanizma: <html data-theme="light">.
  const themeBtn = document.querySelector('.theme-toggle');

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    const icon = themeBtn?.querySelector('ion-icon');
    if (icon) icon.name = theme === 'light' ? 'moon-outline' : 'sunny-outline';
  }

  applyTheme(localStorage.getItem('yaso_theme') || 'dark');

  themeBtn?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('yaso_theme', next);
    applyTheme(next);
  });

  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('tr-TR', options);
  }

  // --- Real-time Firestore Notifications Sync ---
  const notifBtn = document.getElementById('notif-btn');
  const notifModal = document.getElementById('notif-modal');
  const closeNotifBtn = document.getElementById('close-notif-btn');
  const notifList = document.querySelector('.notif-list');
  const badge = document.querySelector('#notif-btn .badge');

  // --- Mobile Workspace Switcher Modal Logic ---
  const workspaceModal = document.getElementById('mobile-workspace-modal');
  const closeWorkspaceBtn = document.getElementById('close-workspace-modal-btn');
  const triggerWorkspaceBtns = document.querySelectorAll('.trigger-workspace-modal, .logo-text');

  triggerWorkspaceBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (workspaceModal) workspaceModal.classList.add('active');
    });
  });

  if (closeWorkspaceBtn && workspaceModal) {
    closeWorkspaceBtn.addEventListener('click', () => workspaceModal.classList.remove('active'));
    workspaceModal.addEventListener('click', (e) => {
      if (e.target === workspaceModal) workspaceModal.classList.remove('active');
    });
  }

  if (notifBtn && notifModal) {
    notifBtn.addEventListener('click', () => notifModal.classList.add('active'));
    if (closeNotifBtn) closeNotifBtn.addEventListener('click', () => notifModal.classList.remove('active'));
    notifModal.addEventListener('click', (e) => {
      if (e.target === notifModal) notifModal.classList.remove('active');
    });
  }

  if (notifList) {
    const q = query(collection(db, "Notifications"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      notifList.innerHTML = '';
      const docs = snapshot.docs;

      if (badge) {
        badge.textContent = docs.length > 0 ? docs.length : '0';
        badge.style.display = docs.length > 0 ? 'inline-block' : 'none';
      }

      if (docs.length === 0) {
        notifList.innerHTML = `
          <div class="empty-state">
            <ion-icon name="heart-dislike-outline" class="text-3xl text-primary opacity-40"></ion-icon>
            <p class="text-sm">Henüz bir bildirim yok sevgilim 🥰</p>
          </div>
        `;
        return;
      }

      docs.forEach(docSnap => {
        const data = docSnap.data();
        const timeStr = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Şimdi';

        const item = document.createElement('div');
        item.className = 'card-inset mb-2.5 flex flex-col gap-1 border-l-4 border-l-primary p-3.5';

        item.innerHTML = `
          <div class="flex items-center justify-between gap-2">
            <strong class="text-sm">${esc(data.title || 'Aşk Bildirimi')}</strong>
            <span class="label">${timeStr}</span>
          </div>
          <span class="text-sm leading-relaxed text-muted">${esc(data.message || '')}</span>
        `;

        notifList.appendChild(item);
      });
    });
  }
});

// Love açılınca 7 gün içindeki özel günleri hatırlat (günde bir kez).
async function showSpecialDayReminders() {
  const today = new Date().toDateString();
  try {
    if (localStorage.getItem('yaso_love_reminded') === today) return;
  } catch { /* depolama kapalıysa her açılışta göster */ }

  const events = buildSpecialDays(await loadSpecialDayData())
    .filter(e => daysUntil(e.at) <= 7)
    .slice(0, 3);
  if (events.length === 0) return;

  events.forEach((e, i) => {
    const d = daysUntil(e.at);
    const when = d === 0 ? 'Bugün' : d === 1 ? 'Yarın' : `${d} gün sonra`;
    setTimeout(() => toast(`${when}: ${e.title}`, e.emoji, 6000), 1200 + i * 900);
  });
  try { localStorage.setItem('yaso_love_reminded', today); } catch { /* yok say */ }
}
