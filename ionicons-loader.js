// Ionicons yükleyicisi — CDN yerine kendi origin'imizden.
//
// Neden HTML'e <script> koymuyoruz: Vite, HTML'deki type="module"
// script'lerini kaynak modül sanıp bundle'a almaya çalışıyor ve
// public/ altındaki dosya için "should not be imported from source code"
// hatası veriyor. Runtime'da enjekte edince Vite hiç görmüyor; tarayıcı
// dosyayı public/'ten çekiyor, parça dosyalar ve svg'ler de aynı klasöre
// göre çözülüyor. Build'de public/ olduğu gibi dist'e kopyalandığı için
// yayında da aynı şekilde çalışıyor.
//
// Dosyalar `npm run dev` / `npm run build` öncesi scripts/copy-ionicons.mjs
// tarafından node_modules'ten public/ionicons'a kopyalanır.

if (!document.querySelector('script[data-ionicons]')) {
  const s = document.createElement('script');
  s.type = 'module';
  s.src = '/ionicons/ionicons.esm.js';
  s.dataset.ionicons = 'true';
  document.head.appendChild(s);
}
