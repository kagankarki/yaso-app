import { db, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from '../firebase-config.js';
import { esc } from '../utils.js';

export async function initializeGenelBakisLogic() {
  const moodBtns = document.querySelectorAll('.mood-btn');
  const moodStatus = document.querySelector('.mood-status');
  const personTabs = document.querySelectorAll('.person-tab-btn');
  const moodTitle = document.getElementById('mood-title');
  const moodSubtitle = document.getElementById('mood-subtitle');

  if (moodBtns.length === 0) return;

  let activePerson = 'yasemin'; // Default selected person

  // Helper to load mood for a person
  async function loadPersonMood(person) {
    // Reset selected states
    moodBtns.forEach(b => b.classList.remove('selected'));
    
    // Update Title & Subtitle
    const personName = person === 'kagan' ? 'Kağan' : 'Yasemin';
    if (moodTitle) {
      moodTitle.textContent = `${personName}'in Modu`;
    }
    if (moodSubtitle) {
      moodSubtitle.textContent = person === 'kagan' 
        ? 'Kağan bugün kendini nasıl hissediyor?' 
        : 'Bugün kendini nasıl hissediyorsun?';
    }

    if (moodStatus) {
      moodStatus.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Yükleniyor...';
    }

    try {
      const collectionName = person === 'kagan' ? 'myMode_kagan' : 'myMode';
      const q = query(collection(db, collectionName), orderBy('timestamp', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const latestMoodData = querySnapshot.docs[0].data();
        const latestMood = latestMoodData.mood;
        
        moodBtns.forEach(b => {
          if (b.dataset.mood === latestMood) {
            b.classList.add('selected');
          }
        });

        if (moodStatus) {
          moodStatus.innerHTML = `<span class="text-muted"><ion-icon name="information-circle-outline"></ion-icon> ${personName}'in son modu: <b>"${esc(latestMoodData.moodText)}"</b></span>`;
        }
      } else {
        if (moodStatus) {
          moodStatus.innerHTML = `<span class="text-muted">${personName} için henüz bir mod seçilmedi.</span>`;
        }
      }
    } catch (error) {
      console.error(`${personName} modu yüklenirken hata:`, error);
      if (moodStatus) {
        moodStatus.innerHTML = `<span class="text-danger"><ion-icon name="warning-outline"></ion-icon> Mod yüklenemedi.</span>`;
      }
    }
  }

  // Handle Tab Switch (Yasemin vs Kağan)
  // Sekme görünümü artık .chip / .is-active üzerinden; satır içi stil yok.
  personTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      personTabs.forEach(t => t.classList.remove('active', 'is-active'));
      tab.classList.add('active', 'is-active');

      activePerson = tab.dataset.person;
      loadPersonMood(activePerson);
    });
  });

  // Initial load for default person (Yasemin)
  loadPersonMood(activePerson);

  // Handle Mood Button Click
  moodBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Remove selected from all
      moodBtns.forEach(b => b.classList.remove('selected'));
      // Add selected to clicked
      btn.classList.add('selected');
      
      const selectedMood = btn.dataset.mood;
      const moodText = btn.querySelector('span').textContent;
      const personName = activePerson === 'kagan' ? 'Kağan' : 'Yasemin';
      const collectionName = activePerson === 'kagan' ? 'myMode_kagan' : 'myMode';
      
      if (moodStatus) {
        moodStatus.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Kaydediliyor...';
      }
      
      try {
        // Special popup only for Yasemin choosing "uzgun"
        if (activePerson === 'yasemin' && selectedMood === 'uzgun') {
          const popupDocRef = doc(db, 'settings', 'uzgunPopup');
          const popupDocSnap = await getDoc(popupDocRef);
          
          let showPopup = false;
          if (!popupDocSnap.exists()) {
              showPopup = true;
          } else {
              const data = popupDocSnap.data();
              if (data.shown === 0) {
                  showPopup = true;
              }
          }

          if (showPopup) {
              const modal = document.getElementById('uzgun-modal');
              if (modal) {
                  modal.style.display = 'flex';
                  const closeBtn = document.getElementById('uzgun-modal-close');
                  if (closeBtn) {
                    closeBtn.onclick = () => {
                      modal.style.display = 'none';
                    };
                  }
              }
              await setDoc(popupDocRef, { shown: 1 });
          }
        }

        await addDoc(collection(db, collectionName), {
          user: activePerson,
          mood: selectedMood,
          moodText: moodText,
          timestamp: serverTimestamp()
        });
        
        if (moodStatus) {
          moodStatus.innerHTML = `<span class="text-ok"><ion-icon name="checkmark-circle-outline"></ion-icon> Harika! ${personName}'in bugünkü modu <b>"${esc(moodText)}"</b> olarak kaydedildi.</span>`;
        }
        
      } catch (error) {
        console.error('Mood kaydedilirken hata:', error);
        if (moodStatus) {
          moodStatus.innerHTML = `<span class="text-danger"><ion-icon name="warning-outline"></ion-icon> Kaydedilemedi, tekrar dene!</span>`;
        }
      }
    });
  });
}
