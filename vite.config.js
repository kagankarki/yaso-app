import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync } from 'fs';

// If keys.js doesn't exist (e.g. on Vercel where it's gitignored),
// fall back to the stub file with empty exports
const keysAlias = !existsSync(resolve(__dirname, 'keys.js'))
  ? { './keys.js': resolve(__dirname, 'keys.stub.js') }
  : {};

export default defineConfig({
  resolve: {
    alias: keysAlias
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        business: resolve(__dirname, 'business.html'),
        ayarlar: resolve(__dirname, 'ayarlar.html'),
        genelBakis: resolve(__dirname, 'daily/genel-bakis.html'),
        istatistikler: resolve(__dirname, 'daily/istatistikler.html'),
        wishlist: resolve(__dirname, 'daily/wishList/wishlist.html'),
        hatirlaticilar: resolve(__dirname, 'daily/wishList/hatirlaticilar.html'),
        izlediklerim: resolve(__dirname, 'daily/film/izlediklerim.html'),
        filmOner: resolve(__dirname, 'daily/film/film-oner.html'),
        gunlugum: resolve(__dirname, 'daily/diary/gunlugum.html'),
        diary: resolve(__dirname, 'daily/diary/diary.html'),
        gelenKutusu: resolve(__dirname, 'business/gelen-kutusu.html'),
        love: resolve(__dirname, 'love.html'),
        lovePage: resolve(__dirname, 'love/love.html'),
        zamanTuneli: resolve(__dirname, 'love/zaman-tuneli.html'),
        dailyLove: resolve(__dirname, 'daily/love/love.html'),
        dailyZamanTuneli: resolve(__dirname, 'daily/love/zaman-tuneli.html'),
        wardrobe: resolve(__dirname, 'daily/wardrobe/wardrobe.html')
      }
    }
  }
});
