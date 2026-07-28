// Zaman Tüneli Standalone Logic & Story Feed (Firebase Firestore Integrated)
import { db, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from '../../firebase-config.js';

const DEFAULT_STARTER_MILESTONES = [
  {
    id: 'starter_31_mayis',
    title: 'Bizim Hikayemiz Başladı ❤️',
    category: 'Aşk',
    emoji: '🥰',
    date: '31 Mayıs 2026',
    desc: 'Kağan ve Yasemin ilk adımı attı... Birlikte sonsuz mutluluğa, sevgiye ve heyecan dolu bir ömre giden harika hikayemiz resmi olarak başladı!',
    photo: '',
    likes: 12
  }
];

export function initializeZamanTuneliLogic() {
  const container = document.getElementById('milestones-container');
  const openModalBtn = document.getElementById('open-add-milestone-btn');
  const closeModalBtn = document.getElementById('close-milestone-modal-btn');
  const modal = document.getElementById('add-milestone-modal');
  const saveBtn = document.getElementById('save-milestone-btn');

  // Photo Upload elements
  const triggerFileBtn = document.getElementById('trigger-ms-file-btn');
  const fileInput = document.getElementById('ms-file-input');
  const photoUrlInput = document.getElementById('ms-photo-input');
  const previewBox = document.getElementById('ms-photo-preview-box');
  const previewImg = document.getElementById('ms-photo-preview-img');
  const removePhotoBtn = document.getElementById('remove-ms-photo-btn');

  // Lightbox elements
  const lightboxModal = document.getElementById('photo-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeLightboxBtn = document.getElementById('close-lightbox-btn');

  if (!container) return;

  const saved = JSON.parse(localStorage.getItem('yaso_milestones'));
  let milestones = (saved && saved.length > 0) ? saved : DEFAULT_STARTER_MILESTONES;
  let uploadedPhotoBase64 = null;

  // Render immediately with initial state
  renderMilestones();

  // --- Firestore Real-time Collection Listener (Love Collection) ---
  const loveCollectionRef = collection(db, "Love");
  const loveQuery = query(loveCollectionRef, orderBy("createdAt", "desc"));

  onSnapshot(loveQuery, (snapshot) => {
    const fetchedList = [];
    snapshot.forEach(docSnap => {
      fetchedList.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    if (fetchedList.length > 0) {
      milestones = fetchedList;
    } else {
      milestones = DEFAULT_STARTER_MILESTONES;
    }

    localStorage.setItem('yaso_milestones', JSON.stringify(milestones));
    renderMilestones();
  }, (err) => {
    console.warn("Firestore Love koleksiyon hatası:", err);
    renderMilestones();
  });

  // Photo File Upload Handling
  if (triggerFileBtn && fileInput) {
    triggerFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        uploadedPhotoBase64 = await resizeImageToBase64(file, 1000);
        previewImg.src = uploadedPhotoBase64;
        previewBox.style.display = 'block';
      } catch (err) {
        console.error("Fotoğraf yükleme hatası:", err);
      }
    });

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        uploadedPhotoBase64 = null;
        fileInput.value = '';
        if (photoUrlInput) photoUrlInput.value = '';
        previewBox.style.display = 'none';
      });
    }
  }

  function renderMilestones() {
    container.innerHTML = '';

    if (!milestones || milestones.length === 0) {
      milestones = DEFAULT_STARTER_MILESTONES;
    }

    milestones.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'milestone-card';

      card.innerHTML = `
        <div class="milestone-dot"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="milestone-date">${item.date}</span>
            <span style="font-size: 0.8rem; padding: 3px 10px; border-radius: 10px; background: rgba(255, 75, 114, 0.15); color: #ff4b72; font-weight: 700;">${item.category || 'Aşk'}</span>
          </div>
          ${item.id !== 'starter_31_mayis' ? `
            <button class="delete-ms-btn" data-id="${item.id}" style="background: none; border: none; color: #ef4444; opacity: 0.6; cursor: pointer; font-size: 1.2rem; transition: opacity 0.2s;" title="Anıyı Sil">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          ` : ''}
        </div>

        <div class="milestone-title" style="display: flex; align-items: center; gap: 8px; font-size: 1.2rem; font-weight: 700; color: var(--text-color); margin-top: 4px;">
          <span>${item.emoji || '💖'}</span>
          <span>${item.title}</span>
        </div>

        <div class="milestone-desc" style="white-space: pre-line; margin-top: 10px; font-size: 0.98rem; color: var(--text-muted); line-height: 1.6;">${item.desc}</div>

        ${item.photo ? `
          <div style="margin-top: 14px; position: relative; cursor: pointer;" class="timeline-photo-wrapper">
            <img src="${item.photo}" class="milestone-photo timeline-photo-click" alt="Anı Fotoğrafı" data-src="${item.photo}" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 16px; border: 1px solid var(--glass-border);">
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--glass-border);">
          <button class="like-ms-btn" data-id="${item.id}" data-likes="${item.likes || 0}" style="background: rgba(255, 75, 114, 0.1); border: 1px solid rgba(255, 75, 114, 0.3); color: #ff4b72; padding: 6px 16px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
            <ion-icon name="heart" style="font-size: 1rem;"></ion-icon>
            <span>${item.likes || 0} Beğeni</span>
          </button>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Kağan & Yasemin Hatıra Albümü</span>
        </div>
      `;

      container.appendChild(card);
    });

    // Delete Event
    container.querySelectorAll('.delete-ms-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm("Bu anıyı zaman tünelinden silmek istediğinize emin misiniz?")) {
          try {
            await deleteDoc(doc(db, "Love", id));
          } catch (err) {
            console.error("Anı silme hatası:", err);
            milestones = milestones.filter(m => m.id !== id);
            localStorage.setItem('yaso_milestones', JSON.stringify(milestones));
            renderMilestones();
          }
        }
      });
    });

    // Like Event
    container.querySelectorAll('.like-ms-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const currentLikes = parseInt(e.currentTarget.dataset.likes || '0', 10);
        const newLikes = currentLikes + 1;

        triggerHeartExplosion();

        if (id === 'starter_31_mayis') {
          const starter = milestones.find(m => m.id === 'starter_31_mayis');
          if (starter) starter.likes = newLikes;
          renderMilestones();
          return;
        }

        try {
          await updateDoc(doc(db, "Love", id), { likes: newLikes });
        } catch (err) {
          console.error("Beğeni güncelleme hatası:", err);
          const target = milestones.find(m => m.id === id);
          if (target) {
            target.likes = newLikes;
            localStorage.setItem('yaso_milestones', JSON.stringify(milestones));
            renderMilestones();
          }
        }
      });
    });

    // Lightbox Event
    container.querySelectorAll('.timeline-photo-click').forEach(img => {
      img.addEventListener('click', (e) => {
        const src = e.target.dataset.src;
        if (lightboxModal && lightboxImg) {
          lightboxImg.src = src;
          lightboxModal.classList.add('active');
        }
      });
    });
  }

  // Lightbox Close
  if (closeLightboxBtn && lightboxModal) {
    closeLightboxBtn.addEventListener('click', () => lightboxModal.classList.remove('active'));
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) lightboxModal.classList.remove('active');
    });
  }

  // Modal Open/Close & Save
  if (openModalBtn && modal) {
    openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));

    saveBtn.addEventListener('click', async () => {
      const title = document.getElementById('ms-title-input').value.trim();
      const category = document.getElementById('ms-category-input').value;
      const dateVal = document.getElementById('ms-date-input').value;
      const emoji = document.getElementById('ms-emoji-input').value.trim() || '🥰';
      const desc = document.getElementById('ms-desc-input').value.trim();
      const photoUrl = document.getElementById('ms-photo-input').value.trim();

      if (!title || !dateVal) {
        alert("Lütfen en az bir anı başlığı ve tarih giriniz!");
        return;
      }

      const formattedDate = new Date(dateVal).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      const finalPhoto = uploadedPhotoBase64 || photoUrl || '';

      const newMsData = {
        title,
        category,
        emoji,
        date: formattedDate,
        desc,
        photo: finalPhoto,
        likes: 1,
        createdAt: serverTimestamp()
      };

      try {
        await addDoc(collection(db, "Love"), newMsData);
      } catch (err) {
        console.error("Firestore'a anı ekleme hatası:", err);
        const localObj = { id: Date.now().toString(), ...newMsData };
        milestones.unshift(localObj);
        localStorage.setItem('yaso_milestones', JSON.stringify(milestones));
        renderMilestones();
      }

      modal.classList.remove('active');
      
      // Clear Form
      document.getElementById('ms-title-input').value = '';
      document.getElementById('ms-date-input').value = '';
      document.getElementById('ms-desc-input').value = '';
      document.getElementById('ms-emoji-input').value = '';
      document.getElementById('ms-photo-input').value = '';
      uploadedPhotoBase64 = null;
      if (previewBox) previewBox.style.display = 'none';

      triggerHeartExplosion();
    });
  }
}

function resizeImageToBase64(file, maxDimension = 1000) {
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function triggerHeartExplosion() {
  const hearts = ['❤️', '💖', '💕', '🌸', '✨', '🥰'];
  for (let i = 0; i < 18; i++) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart-anim';
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    heart.style.left = `${Math.random() * 80 + 10}vw`;
    heart.style.top = `${Math.random() * 40 + 40}vh`;
    document.body.appendChild(heart);

    setTimeout(() => heart.remove(), 1800);
  }
}
