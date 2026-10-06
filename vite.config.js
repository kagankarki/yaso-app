import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

// Burç yorumları freehoroscopeapi.com'dan geliyor ama o servis CORS başlığı
// göndermiyor; tarayıcıdan doğrudan çağrılamaz. Aynı origin üzerinden
// /api/burc/<period>/<sign> yoluyla geçiriyoruz. Canlıda aynı yönlendirmeyi
// vercel.json yapıyor.
const burcProxy = {
  '/api/burc': {
    target: 'https://freehoroscopeapi.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(
      /^\/api\/burc\/([a-z]+)\/([a-z]+).*$/,
      '/api/v1/get-horoscope/$1?sign=$2'
    )
  }
};

export default defineConfig({
  plugins: [tailwindcss()],
  server: { proxy: burcProxy },
  preview: { proxy: burcProxy },
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
        yaseminDiary: resolve(__dirname, 'daily/diary/yasemin.html'),
        kaganDiary: resolve(__dirname, 'daily/diary/kagan.html'),
        burc: resolve(__dirname, 'daily/burc/burc.html'),
        gelenKutusu: resolve(__dirname, 'business/gelen-kutusu.html'),
        love: resolve(__dirname, 'love.html'),
        lovePage: resolve(__dirname, 'love/love.html'),
        zamanTuneli: resolve(__dirname, 'love/zaman-tuneli.html'),
        quiz: resolve(__dirname, 'love/quiz.html'),
        dailyLove: resolve(__dirname, 'daily/love/love.html'),
        dailyZamanTuneli: resolve(__dirname, 'daily/love/zaman-tuneli.html'),
        wardrobe: resolve(__dirname, 'daily/wardrobe/wardrobe.html')
      }
    }
  }
});
