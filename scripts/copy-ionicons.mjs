// Ionicons'u CDN yerine kendi origin'imizden servis etmek için
// node_modules'teki dist klasörünü public/ionicons altına kopyalar.
//
// Neden: unpkg üzerinden gelen parça dosyalar 429 (rate limit) yiyince
// Stencil bileşeni hiç hydrate olmuyor ve sitedeki TÜM ikonlar görünmez
// kalıyordu. Yerelden servis edince o bağımlılık tamamen kalkıyor.
//
// predev / prebuild adımlarında otomatik çalışır; public/ionicons
// .gitignore'da olduğu için depoya vendor dosyası girmez.

import { cp, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'node_modules/ionicons/dist/ionicons');
const dest = resolve(root, 'public/ionicons');

try {
  await stat(src);
} catch {
  console.error('[ionicons] node_modules/ionicons bulunamadı — önce `npm install` çalıştır.');
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
console.log('[ionicons] public/ionicons güncellendi.');
