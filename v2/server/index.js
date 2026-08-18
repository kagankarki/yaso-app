import express from 'express'
import cors from 'cors'
import axios from 'axios'
import * as cheerio from 'cheerio'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.send('SmartYasemin alışveriş botu çalışıyor 🎬'))

/** "64.999,00 ₺" → 64999 */
function extractPrice(text) {
  if (!text) return null
  let cleaned = String(text).replace(/[^\d.,]/g, '')
  if (cleaned.includes(',') && cleaned.indexOf(',') > cleaned.indexOf('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.')
  }
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'URL gerekli' })

  let parsedUrl
  try {
    parsedUrl = new URL(url)
    if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error('protokol')
  } catch {
    return res.status(400).json({ error: 'Geçersiz URL' })
  }

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    const $ = cheerio.load(response.data)

    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
    let image = $('meta[property="og:image"]').attr('content') || ''
    let priceText = ''

    // JSON-LD (SPA siteler için en güvenilir kaynak)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).contents().text())
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          if (item['@type'] !== 'Product') continue
          if (!title && item.name) title = item.name
          if (!image && item.image) image = Array.isArray(item.image) ? item.image[0] : item.image
          if (!priceText && item.offers) {
            if (item.offers.price) priceText = String(item.offers.price)
            else if (Array.isArray(item.offers) && item.offers[0]?.price) priceText = String(item.offers[0].price)
          }
        }
      } catch { /* bozuk JSON-LD */ }
    })

    if (!priceText) {
      priceText =
        $('meta[property="product:price:amount"]').attr('content') ||
        $('meta[name="twitter:data1"]').attr('content') ||
        ''
    }
    if (!priceText) priceText = $('.prc-dsc').first().text()                       // Trendyol
    if (!priceText) {
      const whole = $('.a-price-whole').first().text()                             // Amazon
      const frac = $('.a-price-fraction').first().text()
      if (whole) priceText = whole + (frac ? `,${frac}` : '')
    }
    if (!priceText) priceText = $('.money-amount__main').first().text() || $('.price-current__amount').first().text()
    if (!priceText) priceText = $('[itemprop="price"]').attr('content') || $('[itemprop="price"]').text()

    // Ağır SPA'lar için yedek
    if (!title || !image) {
      try {
        const fb = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`, { timeout: 12000 })
        const d = fb.data?.data
        if (d) {
          if (!title) title = d.title || ''
          if (!image && d.image?.url) image = d.image.url
        }
      } catch { /* yedek de olmadı */ }
    }

    let finalImage = typeof image === 'string' ? image : image?.url || ''
    if (finalImage.startsWith('/')) finalImage = parsedUrl.origin + finalImage

    const host = parsedUrl.hostname.replace(/^www\./, '')
    const parts = host.split('.')
    const storeRaw = parts.length > 2 ? parts[parts.length - 2] : parts[0]
    const store = storeRaw.charAt(0).toUpperCase() + storeRaw.slice(1)

    res.json({
      url,
      title: (title || 'Bilinmeyen ürün').trim(),
      image: finalImage,
      store,
      currentPrice: extractPrice(priceText),
      rawPriceText: priceText || '',
    })
  } catch (error) {
    console.error('Scrape hatası:', error.message)
    res.status(500).json({ error: 'Sayfa okunamadı', details: error.message })
  }
})

app.listen(PORT, () => console.log(`🎬 Scraper: http://localhost:${PORT}`))
