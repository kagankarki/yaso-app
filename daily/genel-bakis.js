import { db, collection, addDoc, serverTimestamp } from '../firebase-config.js';

export function initializeGenelBakisLogic() {
  const moodBtns = document.querySelectorAll('.mood-btn');
  const moodStatus = document.querySelector('.mood-status');

  if (moodBtns.length === 0) return;

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
        await addDoc(collection(db, 'myMode'), {
          mood: selectedMood,
          moodText: moodText,
          timestamp: serverTimestamp()
        });
        
        moodStatus.innerHTML = `<span style="color: #10b981;"><ion-icon name="checkmark-circle-outline"></ion-icon> Harika! Bugünkü modun <b>"${moodText}"</b> olarak kaydedildi.</span>`;
        
        // Optionally remove success message after a while
        // setTimeout(() => {
        //   moodStatus.innerHTML = '';
        // }, 5000);
        
      } catch (error) {
        console.error('Mood kaydedilirken hata:', error);
        moodStatus.innerHTML = `<span style="color: #ef4444;"><ion-icon name="warning-outline"></ion-icon> Kaydedilemedi, tekrar dene!</span>`;
      }
    });
  });
}
