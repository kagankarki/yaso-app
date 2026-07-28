import { initializeLoveLogic } from './love/love.js';
import { initializeZamanTuneliLogic } from './love/zaman-tuneli.js';
import { initializeYasoAILogic } from './yaso-ai.js';
import { db, collection, onSnapshot, query, orderBy } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
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
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ef4444; padding: 40px; text-align: center;">
          <ion-icon name="warning-outline" style="font-size: 3rem; margin-bottom: 16px;"></ion-icon>
          <h2>Sayfa Yüklenemedi</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted);">${error.message}</p>
        </div>
      `;
    }
  }

  function initializeDynamicPageContent(pageId) {
    if (document.getElementById('love-page')) {
      initializeLoveLogic();
    }
    if (document.getElementById('zaman-tuneli-page')) {
      initializeZamanTuneliLogic();
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

  initializeYasoAILogic();

  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      const icon = themeBtn.querySelector('ion-icon');
      if (isDark) {
        icon.name = 'sunny-outline';
      } else {
        icon.name = 'moon-outline';
      }
    });
  }

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
          <div style="text-align: center; padding: 25px; color: var(--text-muted);">
            <ion-icon name="heart-dislike-outline" style="font-size: 2rem; opacity: 0.4; margin-bottom: 6px; color: #ff4b72;"></ion-icon>
            <p style="margin: 0; font-size: 0.9rem;">Henüz bir bildirim yok sevgilim 🥰</p>
          </div>
        `;
        return;
      }

      docs.forEach(docSnap => {
        const data = docSnap.data();
        const timeStr = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Şimdi';

        const item = document.createElement('div');
        item.style.cssText = `
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 75, 114, 0.1);
          border-left: 4px solid #ff4b72;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 10px;
        `;

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 0.95rem; color: var(--text-color);">${data.title || 'Aşk Bildirimi'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</span>
          </div>
          <span style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.4;">${data.message || ''}</span>
        `;

        notifList.appendChild(item);
      });
    });
  }
});
