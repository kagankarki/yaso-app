# SmartYasemin v2 — "Gece Sineması"

Kağan'ın Yasemin için yaptığı kişisel panelin baştan yazılmış hâli.
Vanilla CSS + kopyalanmış JS yerine **Tailwind CSS + Vite + modüler JS**.

---

## Kurulum

```bash
cd v2
npm install
cp .env.example .env      # değerleri doldur
npm run dev               # http://localhost:5173
```

Alışveriş takibi için ikinci bir terminalde:

```bash
npm run server            # http://localhost:3001
```

Yayına çıkarken:

```bash
npm run build             # dist/ klasörü oluşur
```

---

## `.env` içinde ne var

| Değişken | Zorunlu | Not |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase istemci anahtarı (tarayıcıya gömülmesi normaldir) |
| `VITE_TMDB_API_KEY` | ✅ | Film önerileri |
| `VITE_GEMINI_PROXY` | ⚠️ **önerilen** | Kendi proxy adresin; anahtar tarayıcıya inmez |
| `VITE_GEMINI_API_KEY` | sadece geliştirme | Yayına çıkarken **boş bırak** — aksi hâlde anahtarın herkese açık olur |
| `VITE_SCRAPER_URL` | ✅ | Varsayılan `http://localhost:3001` |

---

## Klasör yapısı

```
v2/
├── index.html            Daily modu
├── love.html             Love modu
├── business.html         Business modu
├── tailwind.config.js    Token → Tailwind eşlemesi
├── firestore.rules       ⚠️ Firebase konsoluna yapıştır (aşağıya bak)
├── src/
│   ├── styles/main.css   TASARIM SİSTEMİ — tek kaynak
│   ├── lib/
│   │   ├── shell.js      Ortak kabuk (sidebar, topbar, mobil nav, bildirim, pil, tema)
│   │   ├── router.js     Hash tabanlı router (deep-link çalışır)
│   │   ├── firebase.js   Firestore + koleksiyon yolları
│   │   ├── gemini.js     Yapay zekâ istemcisi (proxy destekli)
│   │   ├── icons.js      SVG ikon seti
│   │   └── ui.js         toast, modal, onay, escape, görsel sıkıştırma
│   ├── features/
│   │   ├── yaso-ai.js    YasoAI sohbeti (+ çevrimdışı Kağan personası)
│   │   └── tracker.js    Ziyaret kaydı (Ayarlar'dan kapatılabilir)
│   ├── pages/            Her sayfa bir modül: render() + mount()
│   └── app/              Üç modun giriş noktası
└── server/index.js       Fiyat okuyucu (Express + Cheerio)
```

---

## Tasarım sistemi

Her şey `src/styles/main.css` içindeki token katmanından geliyor.
Hiçbir bileşende ham renk kodu yok.

| Katman | İçerik |
|---|---|
| Renk | `--bg --surface --surface-2 --elevated --text --muted --faint --border --primary --accent --ok --warn --danger` |
| Biçim | `--r-lg --r-md --r-sm --shadow --shadow-sm` |
| Boşluk | `--s-1 … --s-8` (4px tabanlı) |
| Tipografi | Oswald (başlık) · Inter (gövde) · IBM Plex Mono (etiket/sayı) |

**Mod değişimi** yalnızca aksan değişkenlerini değiştirir:

- **Daily** — marki altını `#E7B23C`
- **Love** — kırmızı kadife `#E24B5E`
- **Business** — gümüş perde `#C3CFD9`

`<html data-mode="love">` yazmak yeterli; hiçbir bileşen değişmez.
**Tema** için `<html data-theme="light">` — "gündüz seansı" açık teması.

Sinemaya özgü bileşenler: `.marquee` (yanıp sönen ampuller), `.ticket`
(iki yanı kesikli bilet koçanı), `.film-strip` (perforasyonlu kenar),
`.now-showing` (mono etiket), `.reel` (makara yükleyici).

---

## Eskiden neler değişti

**Korunanlar:** tüm özellikler. Mod takibi (Yasemin/Kağan, "üzgün" tek
seferlik mesajı dâhil), iki günlük + şifre + Gemini yorumu, film keşfi +
hikâyeden arama + arşiv, alışveriş takibi + scraper, gardırop + kombin +
yapay zekâ önerisi, aşk sayacı, günün notu, dilek merkezi (rastgele süre
dağılımı birebir aynı), devir butonu, troll görevleri, zaman tüneli
(fotoğraf, beğeni, lightbox), bildirimler, pil rozeti, YasoAI, ayarlar.

**Düzeltilenler:**

- 470 satır inline `style=""` → sıfır. Her şey token + bileşen sınıfı.
- Üç ayrı `main.js` kopyası → tek `shell.js`.
- `love/` ve `daily/love/` çift klasörü → tek modül.
- Sayfalar artık `fetch('/x.html')` ile çekilmiyor; JS modülü olarak
  bundle'a giriyor. Deep-link (`#/gardirop`) ve geri tuşu çalışıyor.
- Firestore'dan gelen her metin `esc()` ile kaçırılıyor (XSS kapandı).
- `confirm()` / `alert()` → tema uyumlu modal ve toast.
- Tema tercihi kaydediliyor ve üç modda aynı çalışıyor (eskiden Daily'de
  `dark-mode`, Love'da `dark-theme` idi ve kaydedilmiyordu).
- Mobil: başlık artık kırpılmıyor, alt navigasyon 5 öğeyle sınırlı,
  tüm dokunma hedefleri ≥44px.
- `prefers-reduced-motion` ve `:focus-visible` desteği.
- Ziyaret kaydı Ayarlar'dan kapatılabiliyor.

---

## ⚠️ Yapılması gerekenler

1. **Firestore kuralları.** Şu an veritabanı büyük ihtimalle herkese açık.
   `firestore.rules` dosyasını Firebase konsoluna yapıştır ve Authentication
   bölümünden Yasemin ile Kağan için birer hesap aç. Aksi hâlde proje ID'sini
   bilen herkes günlükleri okuyabilir.

2. **Gemini anahtarı.** `VITE_GEMINI_API_KEY` derlenmiş dosyada görünür.
   Küçük bir proxy (Vercel serverless function yeter) yazıp `VITE_GEMINI_PROXY`
   ver; anahtar sunucuda kalsın.

3. **Görseller — hâlledildi.** `v2/public/assets/` içindeki PNG'ler
   512px'e indirildi ve optimize edildi: **21 MB → 1.7 MB**. Yanlarına
   `.webp` sürümleri de üretildi (toplam 92 KB). İstersen `<picture>` ile
   WebP'yi öncelikli sunabilirsin. Orijinaller ana klasördeki `assets/`
   içinde dokunulmadan duruyor.

4. Günlük şifresi tarayıcıda karşılaştırılıyor — meraklı gözler için
   yeterli, gerçek güvenlik değil. Gerçek koruma 1. maddeden geçiyor.
