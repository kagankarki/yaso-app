import { initializeFilmOnerLogic } from './daily/film/film-oner.js';
import { initializeDiaryLogic } from './daily/diary/diary.js';
import { initializeWishlistLogic } from './daily/wishList/wishlist.js';
import { initializeGenelBakisLogic } from './daily/genel-bakis.js';

document.addEventListener('DOMContentLoaded', () => {
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
    if (title) {
      pageTitle.textContent = title;
    }

    // Show loading state
    dynamicContent.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100%; color: var(--text-muted);">
        <ion-icon name="reload-outline" class="spin" style="font-size: 2.5rem;"></ion-icon>
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
        initializeDynamicContent(pageId);
      }, 300);

    } catch (error) {
      dynamicContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ef4444;">
          <ion-icon name="warning-outline" style="font-size: 3rem; margin-bottom: 16px;"></ion-icon>
          <h2>Sayfa Yüklenemedi</h2>
          <p>${error.message}</p>
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
      initializeDiaryLogic();
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
  }

  // Film recommendation logic has been moved to daily/film/film-oner.js

  // Bind sidebar nav clicks
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = item.dataset.page;
      const title = item.querySelector('span').textContent;
      navigateTo(pageId, title);
    });
  });

  // Load default page initially
  navigateTo('daily/genel-bakis', 'Genel Bakış');

  // --- Theme Toggler ---
  const themeToggleBtn = document.querySelector('.theme-toggle');
  const body = document.body;

  themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const icon = themeToggleBtn.querySelector('ion-icon');
    if (body.classList.contains('dark-mode')) {
      icon.name = 'sunny-outline';
    } else {
      icon.name = 'moon-outline';
    }
  });

  // --- Date Display ---
  const dateElement = document.getElementById('current-date');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateElement.textContent = new Date().toLocaleDateString('tr-TR', options);

  // --- Search Bar Effect ---
  const searchInput = document.querySelector('.search-box input');
  const searchBox = document.querySelector('.search-box');
  
  searchInput.addEventListener('focus', () => {
    searchBox.style.borderColor = 'var(--primary)';
    searchBox.style.boxShadow = '0 0 0 2px var(--primary-light)';
  });

  searchInput.addEventListener('blur', () => {
    searchBox.style.borderColor = 'var(--glass-border)';
    searchBox.style.boxShadow = 'none';
  });
});
