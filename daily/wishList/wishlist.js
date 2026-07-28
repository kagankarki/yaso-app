import { db, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, deleteDoc, doc } from '../../firebase-config.js';

export function initializeWishlistLogic() {
  const addBtn = document.getElementById('wishlist-add-btn');
  const urlInput = document.getElementById('wishlist-url-input');
  const grid = document.getElementById('wishlist-grid');

  const wishlistRef = collection(db, "Daily", "Wishlist", "Items");

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  // Real-time listener for wishlist items
  const q = query(wishlistRef, orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    grid.innerHTML = '';
    
    let totalItems = 0;
    let discountItems = 0;

    if (snapshot.empty) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          <ion-icon name="cart-outline" style="font-size: 4rem; opacity: 0.5; margin-bottom: 16px;"></ion-icon>
          <h3>İstek Listeniz Boş</h3>
          <p>Takip etmek istediğiniz ürünlerin linkini yukarıdan ekleyebilirsiniz.</p>
        </div>
      `;
    }

    snapshot.forEach((itemDoc) => {
      totalItems++;
      const data = itemDoc.data();
      const id = itemDoc.id;
      
      // Discount logic: If current price is lower than the price when we first saved it
      const isDiscounted = data.currentPrice && data.initialPrice && data.currentPrice < data.initialPrice;
      if (isDiscounted) discountItems++;

      // Badge logic
      let badgeClass = '';
      if (data.store.toLowerCase().includes('trendyol')) badgeClass = 'trendyol';
      else if (data.store.toLowerCase().includes('amazon')) badgeClass = 'amazon';
      else if (data.store.toLowerCase().includes('hepsiburada')) badgeClass = 'hepsiburada';

      const card = document.createElement('div');
      card.className = 'wishlist-card';
      card.innerHTML = `
        <div class="w-card-image">
          <img src="${data.image || 'https://via.placeholder.com/600?text=Resim+Yok'}" alt="${data.store}" onerror="this.src='https://via.placeholder.com/600?text=Resim+Yuklenemedi'">
          <div class="w-card-badge ${badgeClass}">${data.store}</div>
          ${isDiscounted ? '<div class="w-card-discount">İNDİRİM!</div>' : ''}
        </div>
        <div class="w-card-content">
          <h3 class="w-card-title">${data.title}</h3>
          
          <div class="w-card-prices">
            <div class="price-box target">
              <span class="price-label">İlk Kayıt Fiyatı</span>
              <span class="price-amount">${data.initialPrice ? formatCurrency(data.initialPrice) : (data.rawPriceText || '-')}</span>
            </div>
            <div class="price-box current ${isDiscounted ? 'text-green' : ''}">
              <span class="price-label">Güncel Fiyat</span>
              <span class="price-amount">${data.currentPrice ? formatCurrency(data.currentPrice) : (data.rawPriceText || '? ₺')}</span>
            </div>
          </div>

          <div class="w-card-actions">
            <a href="${data.url}" target="_blank" class="w-btn-outline" style="text-decoration:none;"><ion-icon name="open-outline"></ion-icon> Ürüne Git</a>
            <button class="w-btn-icon delete" data-id="${id}"><ion-icon name="trash-outline"></ion-icon></button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Update stats
    const statsContainer = document.querySelector('.wishlist-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="w-stat">
          <span class="w-stat-value">${totalItems}</span>
          <span class="w-stat-label">Takipte</span>
        </div>
        <div class="w-stat">
          <span class="w-stat-value ${discountItems > 0 ? 'text-green' : ''}">${discountItems}</span>
          <span class="w-stat-label">İndirimde</span>
        </div>
      `;
    }

    // Bind delete buttons
    document.querySelectorAll('.w-btn-icon.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm('Bu ürünü takip listesinden çıkarmak istediğinize emin misiniz?')) {
          const id = e.currentTarget.dataset.id;
          await deleteDoc(doc(db, "Daily", "Wishlist", "Items", id));
        }
      });
    });
  });

  // Add Item Logic
  if (addBtn && urlInput) {
    addBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) {
        alert('Lütfen geçerli bir ürün linki yapıştırın.');
        return;
      }

      const originalText = addBtn.innerHTML;
      addBtn.innerHTML = '<ion-icon name="reload-outline" class="spin"></ion-icon> Analiz Ediliyor...';
      addBtn.style.pointerEvents = 'none';

      try {
        // Call local backend scraper
        const response = await fetch('http://localhost:3001/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        if (!response.ok) throw new Error('Bot sunucusuna ulaşılamadı. Sunucu çalışıyor mu?');

        const scrapedData = await response.json();

        // Save to Firebase without asking for target price
        await addDoc(wishlistRef, {
          url: scrapedData.url,
          title: scrapedData.title,
          image: scrapedData.image,
          store: scrapedData.store,
          currentPrice: scrapedData.currentPrice,
          initialPrice: scrapedData.currentPrice, // The price at the time of adding
          rawPriceText: scrapedData.rawPriceText,
          createdAt: serverTimestamp()
        });

        urlInput.value = '';

      } catch (error) {
        alert('Hata: ' + error.message + '\n\nİpucu: "node server/index.js" komutuyla bot sunucusunu başlatmayı unutmayın.');
      } finally {
        addBtn.innerHTML = originalText;
        addBtn.style.pointerEvents = 'auto';
      }
    });
  }
}
