import { db, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from '../firebase-config.js';

export async function initializeGenelBakisLogic() {
  const moodBtns = document.querySelectorAll('.mood-btn');
  const moodStatus = document.querySelector('.mood-status');

  if (moodBtns.length === 0) return;

  // Load the latest mood
  try {
    const q = query(collection(db, 'myMode'), orderBy('timestamp', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const latestMoodData = querySnapshot.docs[0].data();
      const latestMood = latestMoodData.mood;
      
      moodBtns.forEach(b => {
        if (b.dataset.mood === latestMood) {
          b.classList.add('selected');
        }
      });
    }
  } catch (error) {
    console.error('Mood yüklenirken hata:', error);
  }

  moodBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Remove selected from all
      moodBtns.forEach(b => b.classList.remove('selected'));
      // Add selected to clicked
      btn.classList.add('selected');
      
      const selectedMood = btn.dataset.mood;
      const moodText = btn.querySelector('span').textContent;
      
      moodStatus.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Kaydediliyor...';
      
      try {
        if (selectedMood === "uzgun") {
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
                  closeBtn.onclick = () => {
                      modal.style.display = 'none';
                  };
              }
              await setDoc(popupDocRef, { shown: 1 });
          }
        }

        await addDoc(collection(db, 'myMode'), {
          mood: selectedMood,
          moodText: moodText,
          timestamp: serverTimestamp()
        });
        
        moodStatus.innerHTML = `<span style="color: #10b981;"><ion-icon name="checkmark-circle-outline"></ion-icon> Harika! Bugünkü modun <b>"${moodText}"</b> olarak kaydedildi.</span>`;
        
      } catch (error) {
        console.error('Mood kaydedilirken hata:', error);
        moodStatus.innerHTML = `<span style="color: #ef4444;"><ion-icon name="warning-outline"></ion-icon> Kaydedilemedi, tekrar dene!</span>`;
      }
    });
  });
}
