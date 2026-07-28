// Akıllı Gardırop & Gemini AI Kombin Danışmanı Logic
import { db, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from '../../firebase-config.js';
import { showCustomToast } from '../../love/love.js';
import { callGeminiApi } from '../../yaso-ai.js';

const WEATHER_DATA = {
  ankara: {
    city: 'Ankara',
    degree: '22°C',
    condition: 'Parçalı Bulutlu 🌸',
    advice: '"Bugün Ankara\'da tatlı bir bahar havası var! İnce bir ceket, pamuklu bir bluz ve kot pantolon kombinlemek harika bir tercih olur mimarım ✨"'
  },
  istanbul: {
    city: 'İstanbul',
    degree: '19°C',
    condition: 'Yağmurlu ☔',
    advice: '"Aşkım İstanbul\'da yağmur ve hafif rüzgar var! Şık bir trençkot, botlar ve şemsiyeni yanına almayı sakın unutma ☔"'
  },
  izmir: {
    city: 'İzmir',
    degree: '27°C',
    condition: 'Güneşli & Sıcak ☀️',
    advice: '"İzmir cıvıl cıvıl güneşli! İnce askılı bir bluz, şık bir etek veya keten pantolon harika yakışır sevgilim ☀️"'
  },
  eskisehir: {
    city: 'Eskişehir',
    degree: '15°C',
    condition: 'Rüzgarlı & Serin 🍃',
    advice: '"Eskişehir bugün serin ve rüzgarlı! Şık bir hırka, ceket veya triko üst giymeni tavsiye ederim biriciğim 🍃"'
  }
};

export function initializeWardrobeLogic() {
  const citySelect = document.getElementById('weather-city-select');
  const degreeElem = document.getElementById('weather-degree');
  const conditionElem = document.getElementById('weather-condition');
  const adviceElem = document.getElementById('weather-ai-advice');

  const itemsGrid = document.getElementById('wardrobe-items-grid');
  const filterBtns = document.querySelectorAll('[data-wardrobe-cat]');
  const geminiOutfitBtn = document.getElementById('gemini-ai-outfit-btn');
  const saveOutfitBtn = document.getElementById('save-outfit-combo-btn');

  const openModalBtn = document.getElementById('open-add-cloth-modal-btn');
  const closeModalBtn = document.getElementById('close-cloth-modal-btn');
  const modal = document.getElementById('add-cloth-modal');
  const saveClothBtn = document.getElementById('save-cloth-btn');

  const triggerFileBtn = document.getElementById('trigger-cloth-file-btn');
  const fileInput = document.getElementById('cloth-file-input');
  const urlInput = document.getElementById('cloth-url-input');
  const previewBox = document.getElementById('cloth-photo-preview-box');
  const previewImg = document.getElementById('cloth-photo-preview-img');

  if (!itemsGrid) return;

  let clothes = [];
  let activeCategory = 'all';
  let uploadedPhotoBase64 = null;
  let selectedCityKey = 'ankara';

  let currentOutfit = {
    top: null,
    bottom: null,
    shoes: null
  };

  // --- Weather Selector Handler ---
  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      selectedCityKey = e.target.value;
      const data = WEATHER_DATA[selectedCityKey] || WEATHER_DATA.ankara;
      if (degreeElem) degreeElem.textContent = data.degree;
      if (conditionElem) conditionElem.textContent = data.condition;
      if (adviceElem) adviceElem.textContent = data.advice;
    });
  }

  // --- Firestore Listener (Clean Real-time Wardrobe) ---
  const wardrobeCol = collection(db, "Wardrobe");
  onSnapshot(query(wardrobeCol, orderBy("createdAt", "desc")), (snapshot) => {
    const fetchedList = [];
    snapshot.forEach(docSnap => {
      fetchedList.push({ id: docSnap.id, ...docSnap.data() });
    });

    clothes = fetchedList;
    renderWardrobeGrid();
  }, (err) => {
    console.warn("Firestore Wardrobe hatası:", err);
    renderWardrobeGrid();
  });

  function renderWardrobeGrid() {
    itemsGrid.innerHTML = '';

    const filtered = activeCategory === 'all'
      ? clothes
      : clothes.filter(c => c.category === activeCategory);

    if (filtered.length === 0) {
      itemsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 45px 20px; color: var(--text-muted); background: rgba(0,0,0,0.15); border: 1.5px dashed var(--glass-border); border-radius: 20px;">
          <ion-icon name="shirt-outline" style="font-size: 3.5rem; opacity: 0.35; color: #ec4899; margin-bottom: 10px;"></ion-icon>
          <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; color: var(--text-color);">Gardıroban Henüz Boş Mimarım ✨</h4>
          <p style="font-size: 0.9rem; margin: 0; opacity: 0.85;">Sağ üstteki <strong>"Gardıroba Kıyafet Ekle"</strong> butonuna basarak kendi dolabındaki giysilerini ekle, Gemini sana hava durumuna özel kombinler önersin!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'glass-panel';
      card.style.cssText = `
        border-radius: 18px;
        padding: 14px;
        text-align: center;
        cursor: pointer;
        transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
        border: 1.5px solid var(--glass-border);
        background: rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
      `;

      card.innerHTML = `
        <button class="delete-cloth-btn" title="Kıyafeti Sil" style="position: absolute; top: 8px; right: 8px; background: rgba(239, 68, 68, 0.8); border: none; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5;">&times;</button>
        <div>
          ${item.photo ? `<img src="${item.photo}" style="width: 100%; height: 135px; object-fit: cover; border-radius: 12px; margin-bottom: 10px; border: 1px solid var(--glass-border);">` : ''}
          <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: var(--text-color); font-weight: 700;">${item.name}</h4>
          <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 8px; background: rgba(236,72,153,0.15); color: #ec4899; font-weight: 700;">${getCatBadge(item.category)}</span>
            <span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 8px; background: rgba(139,92,246,0.15); color: #a78bfa; font-weight: 700;">${item.color || 'Renk Belirtilmedi'}</span>
          </div>
          ${item.description ? `<p style="font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 0 0; line-height: 1.3; font-style: italic;">"${item.description}"</p>` : ''}
        </div>
        <button class="select-item-btn" style="margin-top: 10px; background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: var(--text-color); padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
          Kombine Ekle ➕
        </button>
      `;

      card.querySelector('.delete-cloth-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`"${item.name}" kıyafetini gardırobdan silmek istediğine emin misin?`)) {
          try {
            await deleteDoc(doc(db, "Wardrobe", item.id));
            showCustomToast("Kıyafet silindi!", "🗑️");
          } catch (err) {
            console.error("Silme hatası:", err);
          }
        }
      });

      card.querySelector('.select-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        assignToOutfit(item);
      });

      card.addEventListener('click', () => assignToOutfit(item));

      itemsGrid.appendChild(card);
    });
  }

  function getCatBadge(cat) {
    if (cat === 'top') return 'Üst Giyim';
    if (cat === 'bottom') return 'Alt Giyim';
    if (cat === 'shoes') return 'Ayakkabı';
    return 'Aksesuar';
  }

  // --- Assign Item to Outfit Slot ---
  function assignToOutfit(item) {
    if (!item.category || item.category === 'accessory') {
      showCustomToast(`Aksesuar eklendi: ${item.name}`, "👜");
      return;
    }

    currentOutfit[item.category] = item;
    updateOutfitSlotsUI();
    showCustomToast(`${item.name} kombine eklendi!`, "✨");
  }

  function updateOutfitSlotsUI() {
    ['top', 'bottom', 'shoes'].forEach(cat => {
      const slot = document.querySelector(`.outfit-slot[data-slot="${cat}"]`);
      if (!slot) return;

      const item = currentOutfit[cat];
      if (item) {
        slot.style.borderStyle = 'solid';
        slot.style.borderColor = '#ec4899';
        slot.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;">
            ${item.photo ? `<img src="${item.photo}" style="width: 46px; height: 46px; object-fit: cover; border-radius: 8px;">` : ''}
            <div>
              <span style="font-size: 0.75rem; color: #ec4899; font-weight: 800; text-transform: uppercase;">${cat.toUpperCase()}</span>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-color);">${item.name} (${item.color || ''})</div>
            </div>
          </div>
        `;
      }
    });
  }

  // --- GEMINI AI OUTFIT GENERATOR ---
  if (geminiOutfitBtn) {
    geminiOutfitBtn.addEventListener('click', async () => {
      if (clothes.length === 0) {
        showCustomToast("Lütfen önce gardırobuna en az bir kıyafet ekle mimarım!", "⚠️");
        return;
      }

      showCustomToast("Gemini gardırobunu ve hava durumunu inceliyor... 🔮", "✨");

      const weather = WEATHER_DATA[selectedCityKey] || WEATHER_DATA.ankara;

      const clothesSummary = clothes.map(c => 
        `- ID: ${c.id} | Adı: ${c.name} | Kategori: ${c.category} | Renk: ${c.color || 'Belirtilmedi'} | Mevsim: ${c.season || ''} | Stil: ${c.style || ''} | Açıklama: ${c.description || ''}`
      ).join('\n');

      const prompt = `
Sen Yasemin'in özel AI Stil Danışmanı Gemini'sin.
Hava Durumu: ${weather.city} (${weather.degree}, ${weather.condition}).

Yasemin'in gardırobundaki kıyafetler ve detayları:
${clothesSummary}

Lütfen bu kıyafetler arasından bugünkü havaya en uygun 1 Üst Giyim + 1 Alt Giyim + 1 Ayakkabı kombinle!
Yasemin'e "aşkım/mimarım" hitabıyla neden bu kombini seçtiğini 2-3 cümleyle tatlıca açıkla!
`.trim();

      try {
        const aiResponse = await callGeminiApi(prompt);
        if (adviceElem) adviceElem.textContent = aiResponse;

        // Auto Pick best matching top, bottom, shoes if available
        const top = clothes.find(c => c.category === 'top');
        const bottom = clothes.find(c => c.category === 'bottom');
        const shoes = clothes.find(c => c.category === 'shoes');

        if (top) currentOutfit.top = top;
        if (bottom) currentOutfit.bottom = bottom;
        if (shoes) currentOutfit.shoes = shoes;

        updateOutfitSlotsUI();
        triggerHeartExplosion();
        showCustomToast("Gemini sana özel kombin hazırladı! 👗✨", "💖");

      } catch (err) {
        console.error("Gemini Kombin hatası:", err);
      }
    });
  }

  // --- Save Outfit Combo ---
  if (saveOutfitBtn) {
    saveOutfitBtn.addEventListener('click', () => {
      if (!currentOutfit.top && !currentOutfit.bottom) {
        showCustomToast("Lütfen kombine en az bir kıyafet ekle mimarım!", "⚠️");
        return;
      }

      triggerHeartExplosion();
      showCustomToast("Günün kombini gardırobuna başarıyla kaydedildi sevgilim! ❤️", "👗");
    });
  }

  // --- Filter Tabs ---
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.wardrobeCat;
      renderWardrobeGrid();
    });
  });

  // --- Add Cloth Modal & File Upload ---
  if (triggerFileBtn && fileInput) {
    triggerFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        uploadedPhotoBase64 = await resizeImageToBase64(file, 800);
        previewImg.src = uploadedPhotoBase64;
        previewBox.style.display = 'block';
      } catch (err) {
        console.error("Kıyafet resim yükleme hatası:", err);
      }
    });
  }

  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));

    saveClothBtn.addEventListener('click', async () => {
      const name = document.getElementById('cloth-name-input').value.trim();
      const color = document.getElementById('cloth-color-input').value.trim();
      const category = document.getElementById('cloth-cat-input').value;
      const season = document.getElementById('cloth-season-input').value;
      const style = document.getElementById('cloth-style-input').value;
      const description = document.getElementById('cloth-desc-input').value.trim();
      const urlPhoto = urlInput ? urlInput.value.trim() : '';

      // Strict Mandatory Fields Validation
      if (!name) {
        showCustomToast("Lütfen kıyafet adını giriniz!", "⚠️");
        return;
      }
      if (!color) {
        showCustomToast("Lütfen kıyafet rengini giriniz!", "⚠️");
        return;
      }
      if (!description) {
        showCustomToast("Gemini'nin kıyafeti kombinleyebilmesi için kıyafet açıklaması yazmak zorunludur mimarım!", "⚠️");
        return;
      }

      const finalPhoto = uploadedPhotoBase64 || urlPhoto;
      if (!finalPhoto) {
        showCustomToast("Lütfen bir kıyafet fotoğrafı seçiniz veya URL giriniz!", "⚠️");
        return;
      }

      const newCloth = {
        name,
        color,
        category,
        season,
        style,
        description,
        photo: finalPhoto,
        createdAt: serverTimestamp()
      };

      try {
        await addDoc(collection(db, "Wardrobe"), newCloth);
        showCustomToast(`"${name}" gardırobuna kaydedildi sevgilim! ✨`, "👚");
      } catch (err) {
        console.error("Firestore kıyafet ekleme hatası:", err);
      }

      modal.classList.remove('active');
      document.getElementById('cloth-name-input').value = '';
      document.getElementById('cloth-color-input').value = '';
      document.getElementById('cloth-desc-input').value = '';
      if (urlInput) urlInput.value = '';
      uploadedPhotoBase64 = null;
      if (previewBox) previewBox.style.display = 'none';
    });
  }
}

function resizeImageToBase64(file, maxDimension = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function triggerHeartExplosion() {
  const hearts = ['❤️', '💖', '💕', '🌸', '✨', '🥰', '👗'];
  for (let i = 0; i < 20; i++) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart-anim';
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.left = `${Math.random() * 80 + 10}vw`;
    heart.style.top = `${Math.random() * 40 + 40}vh`;
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1800);
  }
}
