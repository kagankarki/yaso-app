// Ortak yardımcılar.

/**
 * Firestore'dan veya kullanıcıdan gelen metni innerHTML'e gömmeden önce kaçırır.
 * Eskiden bu metinler doğrudan innerHTML'e yazılıyordu; günlüğe veya bildirime
 * yazılan bir <script>/<img onerror> parçası çalışabiliyordu.
 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Tema uyumlu bildirim. Tarayıcının alert()'i yerine kullanılır:
 * alert sayfayı kilitler ve Gece Sineması temasının dışında durur.
 */
export function toast(message, emoji = '✨', ms = 3200) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="toast-emoji">${esc(emoji)}</span><span>${esc(message)}</span>`;
  stack.appendChild(el);

  setTimeout(() => el.remove(), ms);
}

/**
 * Üst bar artık position:fixed ile ekranın tepesine sabit. Sabit bar akıştan
 * çıktığı için içeriğin altında kalmaması adına ana içeriğe bar yüksekliği
 * kadar üst boşluk veriyoruz. ResizeObserver bar boyu değişince (tema, kırılım,
 * yazı tipi yüklenmesi) boşluğu otomatik günceller.
 */
function initFixedHeader() {
  const header = document.querySelector('.top-header');
  const main = document.querySelector('.main-content');
  if (!header || !main) return;

  const apply = () => { main.style.paddingTop = header.offsetHeight + 'px'; };
  apply();

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(apply).observe(header);
  } else {
    window.addEventListener('resize', apply);
  }
  window.addEventListener('load', apply);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFixedHeader);
  } else {
    initFixedHeader();
  }
}
