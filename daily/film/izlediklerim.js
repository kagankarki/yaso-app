import { db, collection, getDocs, query, orderBy, deleteDoc, doc } from '../../firebase-config.js';

export async function initializeIzlediklerimLogic() {
  const grid = document.getElementById('watched-movie-grid');
  if (!grid) return;

  try {
    const q = query(collection(db, "Daily", "Films", "watchedMovies"), orderBy("savedAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
          <ion-icon name="film-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
          <p>Henüz hafızaya aldığın bir film yok.<br>Film önerilerinden beğendiklerini buraya ekleyebilirsin.</p>
        </div>`;
      return;
    }

    let html = '';
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      
      html += `
      <div class="glass-card movie-card" id="watched-card-${docId}">
        <div class="movie-poster">
          <img src="${data.posterUrl}" alt="${data.title} Poster">
          <div class="movie-rating"><ion-icon name="star"></ion-icon> ${data.rating}</div>
        </div>
        <div class="movie-info">
          <h3 title="${data.title}">${data.title.length > 25 ? data.title.substring(0, 25) + '...' : data.title}</h3>
          <p class="movie-genre">${data.genreNames || 'Çeşitli'}</p>
          <p class="movie-plot">${data.plot}</p>
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(data.title + ' trailer')}" target="_blank" class="btn-primary" style="flex: 1; justify-content: center; text-decoration: none; padding: 8px;">
              <ion-icon name="play-circle-outline"></ion-icon> Fragman
            </a>
            <button class="icon-btn remove-movie-btn" data-id="${docId}" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </div>
        </div>
      </div>
      `;
    });
    
    grid.innerHTML = html;

    // Bind delete buttons
    grid.querySelectorAll('.remove-movie-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.remove-movie-btn').dataset.id;
        const card = document.getElementById(`watched-card-${id}`);
        card.style.opacity = '0.5';
        try {
          await deleteDoc(doc(db, "Daily", "Films", "watchedMovies", id));
          card.remove();
          if(grid.children.length === 0) {
            grid.innerHTML = `
              <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
                <ion-icon name="film-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
                <p>Henüz hafızaya aldığın bir film yok.</p>
              </div>`;
          }
        } catch (error) {
          console.error("Silme hatası:", error);
          card.style.opacity = '1';
        }
      });
    });

  } catch (error) {
    console.error("Veriler çekilemedi:", error);
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
        <ion-icon name="warning-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
        <p>Hafızaya ulaşılamadı. İnternet bağlantınızı kontrol edin.</p>
      </div>`;
  }
}
