import { db, collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, getDoc, setDoc, updateDoc } from '../../firebase-config.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function fetchGeminiDiaryComment(title, body, mood) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
    const prompt = `Sen sevecen, tatlı, içten ve motive edici bir günlük dostusun. Kullanıcı günlüğüne şunu yazdı:
Başlık: "${title}"
İçerik: "${body}"
Hisse/Mod: "${mood}"

Lütfen bu yazılanlara karşılık çok kısa (en fazla 1 veya 2 cümle, 25 kelimeyi geçmeyecek şekilde), samimi, tatlı ve içten bir cevap yaz. Cevabına uygun şirin bir emoji de ekle.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    return null;
  } catch (err) {
    console.error("Gemini günlük yorum hatası:", err);
    return null;
  }
}

export function initializeDiaryLogic(owner = 'Diary') {
  let DIARY_PASSWORD = localStorage.getItem(`diary_password_${owner}`) || (owner === 'Kagan_Diary' ? 'YASEMİN' : '12345'); // Default fallback
  
  // Asynchronously load password from Firebase (non-blocking)
  getDoc(doc(db, "Daily", owner, "settings", "passwordDoc"))
    .then(passSnap => {
      if (passSnap.exists() && passSnap.data().value) {
        DIARY_PASSWORD = passSnap.data().value;
        localStorage.setItem(`diary_password_${owner}`, DIARY_PASSWORD);
      }
    })
    .catch(e => {
      console.error("Firebase şifre çekilemedi:", e);
    });

  const lockScreen = document.getElementById('diary-lock-screen');
  const mainContent = document.getElementById('diary-main-content');
  const passwordInput = document.getElementById('diary-password-input');
  const unlockBtn = document.getElementById('diary-unlock-btn');
  const lockIcon = document.getElementById('lock-icon');
  const errorMsg = document.getElementById('diary-error-msg');

  // Diary Input Elements
  const titleInput = document.getElementById('diary-title-input');
  const bodyInput = document.getElementById('diary-body-input');
  const moodPillsContainer = document.getElementById('diary-mood-pills');
  const saveBtn = document.getElementById('diary-save-btn');
  const entriesGrid = document.getElementById('diary-entries-grid');
  let selectedMood = '😊 Mutlu';

  // Password UI Elements
  const changePasswordBtn = document.getElementById('diary-change-password-btn');
  const lockChangePasswordBtn = document.getElementById('diary-lock-change-password-btn');
  const passwordModal = document.getElementById('diary-password-modal');
  const closePasswordModal = document.getElementById('close-password-modal');
  const saveNewPasswordBtn = document.getElementById('save-new-password-btn');
  const newPasswordInput = document.getElementById('diary-new-password-input');
  const passStatusMsg = document.getElementById('diary-password-status-msg');
  
  // Write Modal UI Elements
  const writeModalBtn = document.getElementById('diary-open-write-modal-btn');
  const writeModal = document.getElementById('diary-write-modal');
  const closeWriteModal = document.getElementById('close-diary-write-modal');
  
  const currentDateEl = document.getElementById('diary-current-date');

  if (!lockScreen || !mainContent) return;

  // Set current date
  if (currentDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('tr-TR', options);
  }

  // Mood pill selection
  if (moodPillsContainer) {
    moodPillsContainer.querySelectorAll('.diary-mood-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        moodPillsContainer.querySelectorAll('.diary-mood-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedMood = pill.dataset.mood;
      });
    });
  }

  // --- Lock / Unlock ---
  function attemptUnlock() {
    if (!passwordInput) return;
    const val = passwordInput.value.trim();
    if (val === DIARY_PASSWORD) {
      if (lockIcon) {
        lockIcon.classList.remove('error');
        lockIcon.classList.add('success');
        lockIcon.innerHTML = '<ion-icon name="lock-open"></ion-icon>';
      }
      if (errorMsg) errorMsg.style.opacity = '0';
      
      setTimeout(() => {
        lockScreen.classList.add('unlocked');
        setTimeout(() => {
          lockScreen.style.display = 'none';
          mainContent.style.display = 'block';
          void mainContent.offsetWidth;
          mainContent.classList.add('visible');
          loadDiaryEntries(entriesGrid, owner);
        }, 400);
      }, 500);
    } else {
      if (lockIcon) {
        lockIcon.classList.remove('success');
        lockIcon.classList.remove('error');
        void lockIcon.offsetWidth; 
        lockIcon.classList.add('error');
      }
      if (errorMsg) {
        errorMsg.textContent = 'Yanlış Şifre!';
        errorMsg.style.opacity = '1';
      }
      passwordInput.value = '';
    }
  }

  if (unlockBtn) unlockBtn.addEventListener('click', attemptUnlock);
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') attemptUnlock();
    });
  }

  // --- Open Change Password Modal ---
  const openPasswordModal = () => {
    if (passwordModal) {
      passwordModal.classList.add('active');
      if (newPasswordInput) {
        newPasswordInput.value = '';
        newPasswordInput.focus();
      }
      if (passStatusMsg) passStatusMsg.textContent = '';
    }
  };

  if (changePasswordBtn) changePasswordBtn.addEventListener('click', openPasswordModal);
  if (lockChangePasswordBtn) lockChangePasswordBtn.addEventListener('click', openPasswordModal);

  // Close Password Modal
  if (closePasswordModal && passwordModal) {
    closePasswordModal.addEventListener('click', () => {
      passwordModal.classList.remove('active');
      if (newPasswordInput) newPasswordInput.value = '';
      if (passStatusMsg) passStatusMsg.textContent = '';
    });
  }

  // Backdrop click close for password modal
  if (passwordModal) {
    passwordModal.addEventListener('click', (e) => {
      if (e.target === passwordModal) {
        passwordModal.classList.remove('active');
        if (newPasswordInput) newPasswordInput.value = '';
        if (passStatusMsg) passStatusMsg.textContent = '';
      }
    });
  }

  // --- Save New Password ---
  const handleSavePassword = async () => {
    if (!newPasswordInput) return;
    const newPass = newPasswordInput.value.trim();
    if (!newPass) {
      alert("Lütfen yeni şifrenizi girin!");
      return;
    }
    
    if (saveNewPasswordBtn) {
      saveNewPasswordBtn.textContent = 'Kaydediliyor...';
      saveNewPasswordBtn.disabled = true;
    }

    // Immediately update local password & localStorage
    DIARY_PASSWORD = newPass;
    localStorage.setItem(`diary_password_${owner}`, newPass);

    try {
      await Promise.all([
        setDoc(doc(db, "Daily", owner, "settings", "passwordDoc"), { value: newPass }),
        setDoc(doc(db, "settings", `diaryPassword_${owner}`), { value: newPass })
      ]);
      
      if (passStatusMsg) {
        passStatusMsg.style.color = '#10b981';
        passStatusMsg.textContent = 'Şifreniz başarıyla değiştirildi! ✓';
      }
      if (saveNewPasswordBtn) {
        saveNewPasswordBtn.textContent = 'Kaydedildi ✓';
        saveNewPasswordBtn.style.background = '#10b981';
      }
    } catch (err) {
      console.error("Şifre kaydedilirken Firebase hatası oluştu, yerel kayıt yapıldı:", err);
      if (passStatusMsg) {
        passStatusMsg.style.color = '#10b981';
        passStatusMsg.textContent = 'Şifre güncellendi (Yerel) ✓';
      }
      if (saveNewPasswordBtn) {
        saveNewPasswordBtn.textContent = 'Kaydedildi ✓';
        saveNewPasswordBtn.style.background = '#10b981';
      }
    }

    setTimeout(() => {
      if (passwordModal) passwordModal.classList.remove('active');
      if (saveNewPasswordBtn) {
        saveNewPasswordBtn.textContent = 'Kaydet';
        saveNewPasswordBtn.style.background = '';
        saveNewPasswordBtn.disabled = false;
      }
      if (newPasswordInput) newPasswordInput.value = '';
      if (passStatusMsg) passStatusMsg.textContent = '';
    }, 1200);
  };

  if (saveNewPasswordBtn) {
    saveNewPasswordBtn.addEventListener('click', handleSavePassword);
  }
  if (newPasswordInput) {
    newPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSavePassword();
    });
  }

  // --- Write Modal ---
  if (writeModalBtn && writeModal) {
    writeModalBtn.addEventListener('click', () => writeModal.classList.add('active'));
    if (closeWriteModal) {
      closeWriteModal.addEventListener('click', () => writeModal.classList.remove('active'));
    }
    
    // Backdrop click close for write modal
    writeModal.addEventListener('click', (e) => {
      if (e.target === writeModal) {
        writeModal.classList.remove('active');
      }
    });
  }

  // --- Save Entry with Gemini AI Reply ---
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!titleInput || !bodyInput) return;

      const title = titleInput.value.trim();
      const body = bodyInput.value.trim();
      const mood = selectedMood;

      if (!title || !body) {
        alert("Lütfen başlık ve içeriği boş bırakma!");
        return;
      }

      saveBtn.innerHTML = '<ion-icon name="sparkles-outline" class="spin"></ion-icon> Yapay zeka yanıtlıyor...';
      saveBtn.disabled = true;

      // Generate Gemini AI Reply
      const aiResponse = await fetchGeminiDiaryComment(title, body, mood);

      try {
        await addDoc(collection(db, "Daily", owner, "entries"), {
          title,
          body,
          mood,
          aiResponse: aiResponse || '',
          createdAt: serverTimestamp()
        });

        titleInput.value = '';
        bodyInput.value = '';
        saveBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Kaydedildi ✓';
        saveBtn.style.background = '#10b981';
        
        setTimeout(() => {
          saveBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Kaydet';
          saveBtn.style.background = '';
          saveBtn.disabled = false;
          if (writeModal) writeModal.classList.remove('active');
        }, 1000);

        loadDiaryEntries(entriesGrid, owner);
      } catch (err) {
        console.error("Günlük kayıt hatası:", err);
        alert("Günlük kaydedilirken bir hata oluştu: " + (err.message || err));
        saveBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Kaydet';
        saveBtn.disabled = false;
      }
    });
  }
}

async function loadDiaryEntries(grid, owner) {
  if (!grid) return;
  
  try {
    const q = query(collection(db, "Daily", owner, "entries"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      grid.innerHTML = `
        <div class="diary-empty-state">
          <div class="diary-empty-icon">
            <ion-icon name="book-outline"></ion-icon>
          </div>
          <h3 class="diary-empty-title">Henüz sayfalar bomboş</h3>
          <p class="diary-empty-subtitle">İlk günlüğünü yazarak anılarını ölümsüzleştir.</p>
          <button class="diary-empty-btn" onclick="document.getElementById('diary-open-write-modal-btn').click()">
            <ion-icon name="add-outline"></ion-icon> İlk Anını Yaz
          </button>
        </div>`;
      return;
    }

    let html = '';
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      
      let dateStr = 'Az önce';
      if (data.createdAt) {
        try {
          const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        } catch (e) {
          dateStr = 'Az önce';
        }
      }

      const safeTitle = (data.title || '').replace(/"/g, '&quot;');
      const safeBody = (data.body || '').replace(/"/g, '&quot;');
      const safeMood = (data.mood || '').replace(/"/g, '&quot;');

      html += `
      <article class="diary-entry-card" id="diary-entry-${docId}">
        <div class="diary-entry-meta">
          <div class="diary-entry-meta-left">
            <span class="diary-entry-mood">${data.mood || '😊 Mutlu'}</span>
            <span class="diary-entry-date">
              <ion-icon name="time-outline"></ion-icon> ${dateStr}
            </span>
          </div>
          <button class="diary-entry-delete remove-diary-btn" data-id="${docId}" title="Sil">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </div>
        <h3 class="diary-entry-title">${data.title}</h3>
        <p class="diary-entry-body">${data.body}</p>

        ${data.aiResponse ? `
          <div class="diary-ai-reply">
            <div class="diary-ai-header">
              <ion-icon name="sparkles"></ion-icon>
              <span>Canım Günlük'ten Yorum 💖</span>
            </div>
            <p class="diary-ai-text">${data.aiResponse}</p>
          </div>
        ` : `
          <div class="diary-ai-reply-placeholder" id="ai-box-${docId}">
            <button class="diary-generate-ai-btn generate-ai-reply-btn" data-id="${docId}" data-title="${safeTitle}" data-body="${safeBody}" data-mood="${safeMood}">
              <ion-icon name="sparkles-outline"></ion-icon> Canım Günlük'ten Yorum Al
            </button>
          </div>
        `}
      </article>
      `;
    });
    
    grid.innerHTML = html;

    // Bind AI comment generator buttons for existing entries
    grid.querySelectorAll('.generate-ai-reply-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetBtn = e.target.closest('.generate-ai-reply-btn');
        if (!targetBtn) return;

        const id = targetBtn.dataset.id;
        const title = targetBtn.dataset.title || '';
        const body = targetBtn.dataset.body || '';
        const mood = targetBtn.dataset.mood || '';

        targetBtn.innerHTML = '<ion-icon name="sparkles-outline" class="spin"></ion-icon> Düşünülüyor...';
        targetBtn.disabled = true;

        const aiReply = await fetchGeminiDiaryComment(title, body, mood);
        const box = document.getElementById(`ai-box-${id}`);

        if (aiReply && box) {
          try {
            await updateDoc(doc(db, "Daily", owner, "entries", id), { aiResponse: aiReply });
          } catch (err) {
            console.error("Firebase aiResponse güncelleme hatası:", err);
          }
          box.innerHTML = `
            <div class="diary-ai-reply">
              <div class="diary-ai-header">
                <ion-icon name="sparkles"></ion-icon>
                <span>Canım Günlük'ten Yorum 💖</span>
              </div>
              <p class="diary-ai-text">${aiReply}</p>
            </div>`;
        } else if (box) {
          targetBtn.innerHTML = '<ion-icon name="warning-outline"></ion-icon> Yanıt alınamadı, tekrar dene';
          targetBtn.disabled = false;
        }
      });
    });

    // Bind delete buttons
    grid.querySelectorAll('.remove-diary-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm("Bu günlüğü silmek istediğine emin misin?")) return;
        
        const removeBtn = e.target.closest('.remove-diary-btn');
        if (!removeBtn) return;

        const id = removeBtn.dataset.id;
        const card = document.getElementById(`diary-entry-${id}`);
        if (card) {
          card.style.opacity = '0.5';
          card.style.transform = 'scale(0.98)';
        }

        try {
          await deleteDoc(doc(db, "Daily", owner, "entries", id));
          if (card) {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95) translateY(-10px)';
            setTimeout(() => {
              card.remove();
              if (grid.children.length === 0) {
                grid.innerHTML = `
                  <div class="diary-empty-state">
                    <div class="diary-empty-icon">
                      <ion-icon name="book-outline"></ion-icon>
                    </div>
                    <h3 class="diary-empty-title">Henüz sayfalar bomboş</h3>
                    <p class="diary-empty-subtitle">İlk günlüğünü yazarak anılarını ölümsüzleştir.</p>
                    <button class="diary-empty-btn" onclick="document.getElementById('diary-open-write-modal-btn').click()">
                      <ion-icon name="add-outline"></ion-icon> İlk Anını Yaz
                    </button>
                  </div>`;
              }
            }, 400);
          }
        } catch (error) {
          console.error("Silme hatası:", error);
          if (card) {
            card.style.opacity = '1';
            card.style.transform = '';
          }
        }
      });
    });

  } catch (error) {
    console.error("Günlükler çekilemedi:", error);
    grid.innerHTML = `
      <div class="diary-empty-state" style="border-color: rgba(239,68,68,0.3);">
        <div class="diary-empty-icon" style="color: #ef4444;">
          <ion-icon name="warning-outline"></ion-icon>
        </div>
        <h3 class="diary-empty-title">Bir sorun oluştu</h3>
        <p class="diary-empty-subtitle">Veriler yüklenirken hata meydana geldi.</p>
      </div>`;
  }
}
