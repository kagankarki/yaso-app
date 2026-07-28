import { db, collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, getDoc, setDoc } from '../../firebase-config.js';

export function initializeDiaryLogic() {
  let DIARY_PASSWORD = localStorage.getItem('diary_password') || '12345'; // Default fallback
  
  // Asynchronously load password from Firebase (non-blocking)
  getDoc(doc(db, "Daily", "Diary", "settings", "passwordDoc"))
    .then(passSnap => {
      if (passSnap.exists() && passSnap.data().value) {
        DIARY_PASSWORD = passSnap.data().value;
        localStorage.setItem('diary_password', DIARY_PASSWORD);
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
          loadDiaryEntries(entriesGrid);
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

    // Immediately update local password & localStorage so unlocking always works!
    DIARY_PASSWORD = newPass;
    localStorage.setItem('diary_password', newPass);

    try {
      await Promise.all([
        setDoc(doc(db, "Daily", "Diary", "settings", "passwordDoc"), { value: newPass }),
        setDoc(doc(db, "settings", "diaryPassword"), { value: newPass })
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

  // --- Save Entry ---
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

      saveBtn.innerHTML = '<ion-icon name="hourglass-outline" class="spin"></ion-icon> Kaydediliyor...';
      saveBtn.disabled = true;

      try {
        await addDoc(collection(db, "Daily", "Diary", "entries"), {
          title,
          body,
          mood,
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

        loadDiaryEntries(entriesGrid);
      } catch (err) {
        console.error("Günlük kayıt hatası:", err);
        alert("Günlük kaydedilirken bir hata oluştu: " + (err.message || err));
        saveBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Kaydet';
        saveBtn.disabled = false;
      }
    });
  }
}

async function loadDiaryEntries(grid) {
  if (!grid) return;
  
  try {
    const q = query(collection(db, "Daily", "Diary", "entries"), orderBy("createdAt", "desc"));
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
      </article>
      `;
    });
    
    grid.innerHTML = html;

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
          await deleteDoc(doc(db, "Daily", "Diary", "entries", id));
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
