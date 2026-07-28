const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3001; // Backend port

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SmartYasemin Alışveriş Botu Çalışıyor! 🚀');
});

// Helper function to extract price strings to numbers
function extractPrice(priceText) {
  if (!priceText) return null;
  // Basic cleanup: remove symbols, "TL", "₺", etc.
  let cleaned = priceText.replace(/[^\d.,]/g, '');
  // Example "64.999,00" -> "64999.00"
  // If comma is the decimal separator:
  if (cleaned.includes(',') && cleaned.indexOf(',') > cleaned.indexOf('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // maybe 64,99
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    // mostly already in 64999.00 format if no commas
  }
  return parseFloat(cleaned);
}

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Add common headers to avoid simple bot blocks
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    let image = $('meta[property="og:image"]').attr('content') || '';
    let priceText = '';
    
    // --- JSON-LD (Structured Data) SEO Parsing (Saves us on SPAs like Zara) ---
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        // Sometimes it's an array of objects
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const item of items) {
          if (item['@type'] === 'Product') {
            if (!title && item.name) title = item.name;
            if (!image && item.image) {
              image = Array.isArray(item.image) ? item.image[0] : item.image;
            }
            if (!priceText && item.offers) {
              if (item.offers.price) priceText = String(item.offers.price);
              else if (Array.isArray(item.offers) && item.offers[0].price) {
                priceText = String(item.offers[0].price);
              }
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    if (!title) title = 'Bilinmeyen Ürün';

    // Store Name Extraction Fix
    const parsedUrl = new URL(url);
    let hostname = parsedUrl.hostname.replace('www.', '');
    const parts = hostname.split('.');
    let store = parts.length > 2 ? parts[parts.length - 2] : parts[0]; // e.g. tr.tommy.com -> tommy
    store = store.charAt(0).toUpperCase() + store.slice(1);

    // 1. Check meta tags (often reliable for e-commerce)
    if (!priceText) {
      priceText = $('meta[property="product:price:amount"]').attr('content') || 
                  $('meta[name="twitter:data1"]').attr('content'); // some sites put price here
    }
                
    // 2. Trendyol specific
    if (!priceText) priceText = $('.prc-dsc').first().text();
    
    // 3. Amazon specific
    if (!priceText) {
      const amazonWhole = $('.a-price-whole').first().text();
      const amazonFraction = $('.a-price-fraction').first().text();
      if (amazonWhole) priceText = amazonWhole + (amazonFraction ? ',' + amazonFraction : '');
    }

    // 4. Zara Specific (Fallback if JSON-LD fails)
    if (!priceText) priceText = $('.money-amount__main').first().text() || $('.price-current__amount').first().text();

    // 5. Hepsiburada / Generic itemprop
    if (!priceText) priceText = $('[itemprop="price"]').attr('content') || $('[itemprop="price"]').text();

    let currentPrice = extractPrice(priceText);

    // --- FALLBACK FOR HEAVY SPAs (Like Zara) ---
    if ((!title || title === 'Bilinmeyen Ürün') || !image) {
      try {
        console.log("Local extraction failed, trying Microlink API...");
        const fallbackRes = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
        if (fallbackRes.data && fallbackRes.data.data) {
          const mData = fallbackRes.data.data;
          if (!title || title === 'Bilinmeyen Ürün') title = mData.title || title;
          if (!image && mData.image) image = mData.image.url || image;
        }
      } catch (fallbackErr) {
        console.error("Microlink fallback failed:", fallbackErr.message);
      }
    }

    if (!title) title = 'Bilinmeyen Ürün';
    
    let finalImage = typeof image === 'string' ? image : (image?.url || '');
    // Fix relative image URLs
    if (finalImage && finalImage.startsWith('/')) {
      finalImage = parsedUrl.origin + finalImage;
    }

    res.json({
      url,
      title: title.trim(),
      image: finalImage,
      store,
      currentPrice: currentPrice || null,
      rawPriceText: priceText || ''
    });

  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ error: 'Failed to scrape URL', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Scraper backend running on http://localhost:${PORT}`);
});
