const TMDB_API_KEY = 'fe3936da79d2f983d2d8238bf61bb29b';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

import { db, collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc } from '../../firebase-config.js';

export function initializeFilmOnerLogic() {
  const openBtn = document.getElementById('open-film-modal');
  const closeBtn = document.querySelector('.close-modal');
  const modal = document.getElementById('film-modal');
  const fetchBtn = document.getElementById('fetch-movies-btn');
  const movieGrid = document.getElementById('movie-grid');
  
  // AI Elements
  const aiSearchBtn = document.getElementById('ai-search-btn');
  const aiPromptInput = document.getElementById('ai-movie-prompt');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      document.body.appendChild(modal); // Move to body to escape transform scopes
      modal.classList.add('active');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  
  // Close custom dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target.closest('.custom-select-wrapper')) return;
    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
      w.classList.remove('open');
      const icon = w.querySelector('ion-icon');
      if (icon) icon.style.transform = 'rotate(0deg)';
    });
  });

  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Convert selects
  convertToCustomSelect('movie-genre-select');
  convertToCustomSelect('movie-rating-select');
  convertToCustomSelect('movie-year-select');
  convertToCustomSelect('movie-sort-select');

  if (fetchBtn) {
    fetchBtn.addEventListener('click', () => {
      const genre = document.getElementById('movie-genre-select').value;
      const minRating = parseFloat(document.getElementById('movie-rating-select').value);
      const year = document.getElementById('movie-year-select').value;
      const sort = document.getElementById('movie-sort-select').value;
      modal.classList.remove('active');
      fetchAndRenderMovies(genre, minRating, year, sort, movieGrid);
    });
  }

  if (aiSearchBtn && aiPromptInput) {
    aiSearchBtn.addEventListener('click', () => {
      const prompt = aiPromptInput.value.trim();
      if (prompt.length > 2) {
        searchMovieWithAI(prompt, movieGrid);
      }
    });
    aiPromptInput.addEventListener('keypress', (e) => {
      if(e.key === 'Enter') {
        aiSearchBtn.click();
      }
    });
  }

  // Tab Logic
  const tabOneriler = document.getElementById('tab-oneriler');
  const tabIzlediklerim = document.getElementById('tab-izlediklerim');
  const watchedGrid = document.getElementById('watched-movie-grid');

  if (tabOneriler && tabIzlediklerim) {
    tabOneriler.addEventListener('click', () => {
      tabOneriler.style.color = 'var(--primary)';
      tabOneriler.style.fontWeight = 'bold';
      tabOneriler.style.borderBottomColor = 'var(--primary)';
      
      tabIzlediklerim.style.color = 'var(--text-muted)';
      tabIzlediklerim.style.fontWeight = 'normal';
      tabIzlediklerim.style.borderBottomColor = 'transparent';
      
      movieGrid.style.display = 'grid';
      watchedGrid.style.display = 'none';
    });

    tabIzlediklerim.addEventListener('click', () => {
      tabIzlediklerim.style.color = 'var(--primary)';
      tabIzlediklerim.style.fontWeight = 'bold';
      tabIzlediklerim.style.borderBottomColor = 'var(--primary)';
      
      tabOneriler.style.color = 'var(--text-muted)';
      tabOneriler.style.fontWeight = 'normal';
      tabOneriler.style.borderBottomColor = 'transparent';
      
      movieGrid.style.display = 'none';
      watchedGrid.style.display = 'grid';
      loadWatchedMovies(watchedGrid);
    });
  }

  // Initial load
  if (movieGrid) {
    fetchAndRenderMovies('all', 0, 'all', 'popularity.desc', movieGrid);
  }
}

async function loadWatchedMovies(grid) {
  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
      <ion-icon name="reload-outline" class="spin" style="font-size: 2.5rem;"></ion-icon>
      <p style="margin-top: 12px;">Hafızan yükleniyor...</p>
    </div>`;

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

export function convertToCustomSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select || select.nextElementSibling?.classList.contains('custom-select-wrapper')) return;
  
  select.style.display = 'none'; // Hide native
  
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  
  const trigger = document.createElement('div');
  trigger.className = 'glass-input custom-select-trigger';
  trigger.style.paddingRight = '12px'; // Adjust for icon
  
  const triggerText = document.createElement('span');
  triggerText.textContent = select.options[select.selectedIndex]?.text || '';
  triggerText.style.overflow = 'hidden';
  triggerText.style.textOverflow = 'ellipsis';
  triggerText.style.whiteSpace = 'nowrap';
  
  const icon = document.createElement('ion-icon');
  icon.name = 'chevron-down-outline';
  
  trigger.appendChild(triggerText);
  trigger.appendChild(icon);
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'custom-select-options';
  
  Array.from(select.options).forEach(opt => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'custom-option';
    if(opt.value === select.value) optionDiv.classList.add('selected');
    optionDiv.textContent = opt.text;
    optionDiv.dataset.value = opt.value;
    
    optionDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      select.value = opt.value; // Update original select
      triggerText.textContent = opt.text;
      wrapper.classList.remove('open');
      icon.style.transform = 'rotate(0deg)';
      
      wrapper.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
      optionDiv.classList.add('selected');
    });
    optionsContainer.appendChild(optionDiv);
  });
  
  wrapper.appendChild(trigger);
  wrapper.appendChild(optionsContainer);
  
  select.parentNode.insertBefore(wrapper, select.nextSibling);
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains('open');
    
    // Close all others
    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
      w.classList.remove('open');
      w.querySelector('ion-icon').style.transform = 'rotate(0deg)';
    });
    
    if (!isOpen) {
      wrapper.classList.add('open');
      icon.style.transform = 'rotate(180deg)';
    }
  });
}

async function searchMovieWithAI(promptText, grid) {
  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--primary);">
      <ion-icon name="sparkles-outline" class="spin" style="font-size: 3rem; margin-bottom: 16px;"></ion-icon>
      <h3 style="margin-bottom: 8px;">Yapay Zeka Düşünüyor...</h3>
      <p style="color: var(--text-muted);">Hikayeni inceliyor ve en uygun filmleri TMDB veritabanında arıyor.</p>
    </div>`;

  try {
    // 1. Ask Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
    const geminiPrompt = `Sen bir sinema uzmanısın. Kullanıcı sana bir hikaye veya filmden bir sahne anlatacak. Sen sadece bu tarife uyan 1 veya en fazla 3 filmin adını aralarında virgül olacak şekilde yazacaksın. Sadece film isimleri yaz, başka hiçbir açıklama yapma. Orijinal veya Türkçe isimlerini yazabilirsin. Kullanıcının tarifi: "${promptText}"`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }]
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error("Gemini Hatası: " + errorText);
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error("Gemini cevap veremedi veya filtreye takıldı.");
    }

    const movieNamesText = geminiData.candidates[0].content.parts[0].text.trim();
    console.log("Gemini'nin Bulduğu Filmler:", movieNamesText);
    const movieNames = movieNamesText.split(',').map(n => n.trim());

    // 2. Fetch from TMDB
    let allMovies = [];
    for (const movieName of movieNames) {
      const cleanName = movieName.replace(/["\n\r*]/g, '');
      if (!cleanName) continue;

      const tmdbSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=tr-TR&query=${encodeURIComponent(cleanName)}&page=1`;
      const tmdbRes = await fetch(tmdbSearchUrl);
      if (!tmdbRes.ok) {
         throw new Error("TMDB Hatası: Sunucu cevap vermedi.");
      }
      const tmdbData = await tmdbRes.json();
      
      if (tmdbData.results && tmdbData.results.length > 0) {
        allMovies.push(tmdbData.results[0]);
      }
    }

    if (allMovies.length === 0) {
       grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          <ion-icon name="sad-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
          <p>Anlattığın hikayeye uygun bir film bulamadık.<br>Lütfen biraz daha detay vererek tekrar dene.</p>
        </div>`;
       return;
    }

    renderMoviesToGrid(allMovies.slice(0, 6), grid);

  } catch (error) {
    console.error("Yapay Zeka veya TMDB Hatası:", error);
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
        <ion-icon name="warning-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
        <p>Motorlara bağlanılamadı. Hata Detayı:</p>
        <p style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">${error.message}</p>
      </div>`;
  }
}

async function fetchAndRenderMovies(genreId, minRating, year, sort, grid) {
  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
      <ion-icon name="reload-outline" class="spin" style="font-size: 2.5rem;"></ion-icon>
      <p style="margin-top: 12px;">TMDB'den en iyi filmler getiriliyor...</p>
    </div>`;

  try {
    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=tr-TR&vote_count.gte=100`;
    
    if (sort) {
      url += `&sort_by=${sort}`;
    } else {
      url += `&sort_by=popularity.desc`;
    }

    if (genreId && genreId !== 'all') {
      url += `&with_genres=${genreId}`;
    }
    if (minRating > 0) {
      url += `&vote_average.gte=${minRating}`;
    }
    if (year && year !== 'all') {
      const startYear = parseInt(year);
      const endYear = startYear + 9;
      url += `&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          <ion-icon name="sad-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
          <p>Seçtiğin kriterlere uygun film bulunamadı.<br>Lütfen filtreleri esneterek tekrar dene.</p>
        </div>`;
      return;
    }

    renderMoviesToGrid(data.results.slice(0, 6), grid);

  } catch (error) {
    console.error("TMDB Hatası:", error);
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
        <ion-icon name="warning-outline" style="font-size: 3rem; margin-bottom: 12px;"></ion-icon>
        <p>Filmler yüklenirken bir hata oluştu.<br>Lütfen internet bağlantını kontrol et.</p>
      </div>`;
  }
}

function renderMoviesToGrid(movies, grid) {
  const genreMap = {
    28: "Aksiyon", 12: "Macera", 16: "Animasyon", 35: "Komedi", 80: "Suç", 
    99: "Belgesel", 18: "Dram", 10751: "Aile", 14: "Fantastik", 36: "Tarih", 
    27: "Korku", 10402: "Müzik", 9648: "Gizem", 10749: "Romantik", 878: "Bilim Kurgu", 
    10770: "TV Filmi", 53: "Gerilim", 10752: "Savaş", 37: "Vahşi Batı"
  };

  grid.innerHTML = movies.map(m => {
    const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600';
    const rating = m.vote_average.toFixed(1);
    const genreNames = m.genre_ids.map(id => genreMap[id]).filter(Boolean).slice(0, 2).join(', ');
    
    const plot = m.overview ? (m.overview.length > 130 ? m.overview.substring(0, 130) + '...' : m.overview) : 'Bu film için henüz Türkçe bir özet bulunmuyor.';

    return `
    <div class="glass-card movie-card">
      <div class="movie-poster">
        <img src="${posterUrl}" alt="${m.title} Poster">
        <div class="movie-rating"><ion-icon name="star"></ion-icon> ${rating}</div>
      </div>
      <div class="movie-info">
        <h3 title="${m.title}">${m.title.length > 25 ? m.title.substring(0, 25) + '...' : m.title}</h3>
        <p class="movie-genre">${genreNames || 'Çeşitli'}</p>
        <p class="movie-plot">${plot}</p>
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(m.title + ' trailer')}" target="_blank" class="btn-text" style="padding: 0; margin-top: 16px; color: var(--primary); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
          <ion-icon name="play-circle-outline" style="font-size: 1.2rem;"></ion-icon> Fragmanı İzle
        </a>
        <button class="btn-primary save-movie-btn" data-movie='${JSON.stringify({id: m.id, title: m.title, posterUrl, rating, genreNames, plot}).replace(/'/g, "&#39;")}' style="margin-top: 12px; width: 100%; justify-content: center;">
          <ion-icon name="bookmark-outline"></ion-icon> Kaydet
        </button>
      </div>
    </div>
    `;
  }).join('');

  // Bind save buttons
  grid.querySelectorAll('.save-movie-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      try {
        const button = e.target.closest('.save-movie-btn');
        const movieData = JSON.parse(button.dataset.movie);
        
        button.innerHTML = '<ion-icon name="hourglass-outline" class="spin"></ion-icon> Kaydediliyor...';
        button.disabled = true;
        
        await addDoc(collection(db, "Daily", "Films", "watchedMovies"), {
          movieId: movieData.id,
          title: movieData.title,
          posterUrl: movieData.posterUrl,
          rating: movieData.rating,
          genreNames: movieData.genreNames,
          plot: movieData.plot,
          savedAt: serverTimestamp()
        });
        
        button.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> Kaydedildi';
        button.style.background = '#10b981'; // green
      } catch (err) {
        console.error("Firebase kayıt hatası:", err);
        const button = e.target.closest('.save-movie-btn');
        button.innerHTML = '<ion-icon name="warning-outline"></ion-icon> Hata!';
        button.disabled = false;
      }
    });
  });
}
