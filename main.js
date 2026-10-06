import './ionicons-loader.js';
import './styles/main.css';
import './styles/burc.css';
import { initializeFilmOnerLogic } from './daily/film/film-oner.js';
import { initializeDiaryLogic } from './daily/diary/diary.js';
import { initializeWishlistLogic } from './daily/wishList/wishlist.js';
import { initializeGenelBakisLogic } from './daily/genel-bakis.js';
import { initializeLoveLogic } from './daily/love/love.js';
import { initializeWardrobeLogic } from './daily/wardrobe/wardrobe.js';
import { initializeBurcLogic } from './daily/burc/burc.js';
import { initializeYasoAILogic } from './yaso-ai.js';
import { trackUserAddress } from './address-tracker.js';
import { toast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Sessizce konum ve IP adresi kaydı yap (İzin istemez)
  trackUserAddress();

  // --- Navigation & Page Routing (SPA Dynamic Load) ---
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
        initializeDynamicContent(pageId);
      } catch (initErr) {
        console.warn("Sayfa mantık başlatma uyarısı:", initErr);
      }

    } catch (error) {
      console.error("Sayfa yükleme hatası:", error);
      dynamicContent.innerHTML = `
        <div class="empty-state text-danger">
          <ion-icon name="warning-outline" class="text-5xl"></ion-icon>
          <h2>Sayfa Yüklenemedi</h2>
          <p class="text-sm text-muted">${error.message}</p>
        </div>
      `;
    }
  }

  function initializeDynamicContent(pageId) {
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

    // Re-bind reminder checkboxes
    const reminderCheckboxes = document.querySelectorAll('#dynamic-content .reminder-item input[type="checkbox"]');
    reminderCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const reminderItem = e.target.closest('.reminder-item');
        if (e.target.checked) {
          reminderItem.classList.add('completed');
        } else {
          reminderItem.classList.remove('completed');
        }
      });
    });

    // Initialize Film Modal Logic if present
    const filmSection = document.getElementById('film-oner');
    if (filmSection) {
      initializeFilmOnerLogic();
    }

    // Initialize Diary Logic if present
    const diarySection = document.getElementById('diary');
    if (diarySection) {
      const owner = diarySection.dataset.owner || 'Diary';
      initializeDiaryLogic(owner);
    }

    // Initialize Wishlist Logic if present
    const wishlistSection = document.getElementById('wishlist');
    if (wishlistSection) {
      initializeWishlistLogic();
    }

    // Initialize Genel Bakis Logic if present
    const genelBakisSection = document.getElementById('genel-bakis');
    if (genelBakisSection) {
      initializeGenelBakisLogic();
    }

    // Initialize Love Page Logic if present
    const loveSection = document.getElementById('love-page');
    if (loveSection) {
      initializeLoveLogic();
    }

    // Initialize Wardrobe Logic if present
    const wardrobeSection = document.getElementById('wardrobe-page');
    if (wardrobeSection) {
      initializeWardrobeLogic();
    }

    // Initialize Günlük Burç Logic if present
    const burcSection = document.getElementById('burc-page');
    if (burcSection) {
      initializeBurcLogic();
    }

    // Initialize Ayarlar Logic if present
    const ayarlarSection = document.getElementById('ayarlar');
    if (ayarlarSection) {
      initializeAyarlarLogic();
    }
  }

  // Film recommendation logic has been moved to daily/film/film-oner.js

  // Bind sidebar nav clicks
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('trigger-workspace-modal')) return; // Mod Seç menüsüne tıklayınca hata vermemesi için
      
      e.preventDefault();
      const pageId = item.dataset.page;
      if (!pageId) return; // pageId yoksa (örneğin sadece ikon olan bir butonse) hiçbir şey yapma
      
      const title = item.querySelector('span').textContent;
      navigateTo(pageId, title);
    });
  });

  // Load default page initially
  navigateTo('daily/genel-bakis', 'Genel Bakış');

  // --- Tema (gece seansı / gündüz seansı) ---
  // Tercih üç modda da ortak: <html data-theme="light"> + localStorage.
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

  // --- Arama kutusu odak vurgusu ---
  // Renkler artık token üzerinden; sadece sınıf değiştiriyoruz.
  const searchInput = document.querySelector('.search-box input');
  const searchBox = document.querySelector('.search-box');

  if (searchInput && searchBox) {
    searchInput.addEventListener('focus', () => searchBox.classList.add('border-primary'));
    searchInput.addEventListener('blur', () => searchBox.classList.remove('border-primary'));
  }

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

  // Initialize YasoAI Assistant Widget
  initializeYasoAILogic();

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

  // --- Ayarlar Page Logic ---
  function initializeAyarlarLogic() {
    const passInput = document.getElementById('settings-diary-password');
    const savePassBtn = document.getElementById('settings-save-password-btn');
    const passStatus = document.getElementById('settings-password-status');

    if (!savePassBtn || !passInput) return;

    savePassBtn.addEventListener('click', async () => {
      const newPass = passInput.value.trim();
      if (!newPass) {
        toast("Lütfen yeni şifrenizi girin!", "🔑");
        return;
      }

      savePassBtn.textContent = 'Kaydediliyor...';
      savePassBtn.disabled = true;

      localStorage.setItem('diary_password', newPass);

      try {
        const { db, doc, setDoc } = await import('./firebase-config.js');
        await Promise.all([
          setDoc(doc(db, "Daily", "Diary", "settings", "passwordDoc"), { value: newPass }),
          setDoc(doc(db, "settings", "diaryPassword"), { value: newPass })
        ]);
        if (passStatus) {
          passStatus.style.color = '#10b981';
          passStatus.textContent = 'Şifre başarıyla güncellendi! ✓';
        }
      } catch (e) {
        console.error("Şifre güncelleme hatası:", e);
        if (passStatus) {
          passStatus.style.color = '#10b981';
          passStatus.textContent = 'Şifre güncellendi (Yerel) ✓';
        }
      }

      savePassBtn.textContent = 'Şifreyi Güncelle';
      savePassBtn.disabled = false;
      passInput.value = '';

      setTimeout(() => {
        if (passStatus) passStatus.textContent = '';
      }, 3000);
    });
  }
});
