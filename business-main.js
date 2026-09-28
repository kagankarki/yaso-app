import './ionicons-loader.js';
import './styles/main.css';
import { initializeYasoAILogic } from './yaso-ai.js';
import { trackUserAddress } from './address-tracker.js';
import { toast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Sessizce konum ve IP adresi kaydı yap (İzin istemez)
  trackUserAddress();

  // Initialize YasoAI Assistant Widget
  initializeYasoAILogic();

  // --- Navigation & Page Routing (SPA Dynamic Load for Business Mode) ---
  const navItems = document.querySelectorAll('.nav-item');
  const pageTitle = document.getElementById('page-title');
  const dynamicContent = document.getElementById('dynamic-content');

  async function navigateTo(pageId, title) {
    // Update active nav item
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === pageId) {
        item.classList.add('active');
      }
    });

    // Update title
    if (title) {
      pageTitle.textContent = title;
    }

    // Show loading state
    dynamicContent.innerHTML = `
      <div class="flex h-full items-center justify-center py-20">
        <div class="reel"></div>
      </div>
    `;

    try {
      // Fetch the HTML content dynamically
      const response = await fetch(`/${pageId}.html`);
      if (!response.ok) throw new Error('Sayfa bulunamadı');
      
      const html = await response.text();
      
      // Add slight delay for visual smoothness of loading
      setTimeout(() => {
        dynamicContent.innerHTML = html;
        initializeDynamicContent();
      }, 300);

    } catch (error) {
      dynamicContent.innerHTML = `
        <div class="empty-state text-danger">
          <ion-icon name="warning-outline" class="text-5xl"></ion-icon>
          <h2>Sayfa Yüklenemedi</h2>
          <p class="text-sm text-muted">${error.message}</p>
        </div>
      `;
    }
  }

  function initializeDynamicContent() {
    // Re-bind buttons that navigate (e.g. data-goto)
    document.querySelectorAll('#dynamic-content [data-goto]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = btn.dataset.goto;
        const targetNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        const title = targetNav ? targetNav.querySelector('span').textContent : 'Sayfa';
        navigateTo(pageId, title);
      });
    });
  }

  // Bind sidebar nav clicks
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      const title = item.querySelector('span').textContent;
      navigateTo(pageId, title);
    });
  });

  // Load default page initially (Gelen Kutusu for business mode)
  navigateTo('business/gelen-kutusu', 'Gelen Kutusu');

  // --- Tema (gece seansı / gündüz seansı) ---
  // Üç modda da aynı anahtar ve aynı mekanizma: <html data-theme="light">.
  const themeToggleBtn = document.querySelector('.theme-toggle');

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    const icon = themeToggleBtn?.querySelector('ion-icon');
    if (icon) icon.name = theme === 'light' ? 'moon-outline' : 'sunny-outline';
  }

  applyTheme(localStorage.getItem('yaso_theme') || 'dark');

  themeToggleBtn?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('yaso_theme', next);
    applyTheme(next);
  });

  // --- Date Display ---
  const dateElement = document.getElementById('current-date');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateElement.textContent = new Date().toLocaleDateString('tr-TR', options);

  // --- Arama kutusu ---
  const searchInput = document.querySelector('.search-box input');
  const searchBox = document.querySelector('.search-box');

  if (searchInput && searchBox) {
    searchInput.addEventListener('focus', () => searchBox.classList.add('border-primary'));
    searchInput.addEventListener('blur', () => searchBox.classList.remove('border-primary'));

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (val) {
          toast(`"${val}" için iş maillerinde arama yapılıyor...`, '🔎');
          searchInput.value = '';
        }
      }
    });
  }

  // --- Notifications Modal ---
  const notifBtn = document.getElementById('notif-btn');
  const notifModal = document.getElementById('notif-modal');
  const closeNotifBtn = document.getElementById('close-notif-btn');

  if (notifBtn && notifModal) {
    notifBtn.addEventListener('click', () => {
      notifModal.classList.add('active');
    });
    
    closeNotifBtn.addEventListener('click', () => {
      notifModal.classList.remove('active');
    });

    notifModal.addEventListener('click', (e) => {
      if (e.target === notifModal) {
        notifModal.classList.remove('active');
      }
    });
  }
});
