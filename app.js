// ============================================================
// STREAMHUB - Main Application JavaScript
// ============================================================

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
  console.error('❌ JavaScript Error:', message);
  showToast('An error occurred: ' + message, 'error', 5000);
  return false;
};

function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }

function showToast(message, type = 'info', duration = 3000) {
  const container = $('#toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function updateSEO(movie) {
  if (!movie) return;
  document.title = `${movie.title} - Watch Online | StreamHub`;
  document.querySelector('meta[name="description"]').setAttribute("content", movie.story || "Watch movies online");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title,
    "description": movie.story,
    "duration": movie.runtime ? `PT${movie.runtime}M` : null,
    "datePublished": movie.releaseDate,
    "genre": movie.genres ? movie.genres.join(", ") : null
  };
  $('#structuredData').textContent = JSON.stringify(structuredData);
}

function detectSource(url) {
  if (!url || typeof url !== 'string') return { type: 'none', player: 'none', url: '' };
  const trimmed = url.trim();

  const drivePatterns = [
    /\/file\/d\/([^\/]+)\/view/,
    /\/file\/d\/([^\/]+)\/preview/,
    /\/open\?id=([^&]+)/,
    /\/uc\?id=([^&]+)/,
    /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([^&\/?]+)/
  ];

  for (const pattern of drivePatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const fileId = match[1];
      return {
        type: 'drive',
        player: 'iframe',
        fileId: fileId,
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        directUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        originalUrl: trimmed
      };
    }
  }

  const videoExtensions = /\.(mp4|webm|m3u8|mov|avi|mkv|ogv)(\?.*)?$/i;
  if (videoExtensions.test(trimmed) || trimmed.includes('.mp4') || trimmed.includes('.webm')) {
    return { type: 'video', player: 'video', url: trimmed };
  }

  return { type: 'unknown', player: 'video', url: trimmed };
}

const MovieManager = {
  currentMovieId: null,
  watchlist: JSON.parse(localStorage.getItem('watchlist') || '[]'),
  history: JSON.parse(localStorage.getItem('history') || '[]'),
  currentSourceIndex: 0,
  currentDriveInfo: null,
  currentVideoUrl: null,
  currentSources: [],

  sanitize(str) {
    return (str && String(str).trim()) ? String(str).trim() : 'N/A';
  },

  init() {
    if (!movies.list || movies.list.length === 0) {
      showToast('No movies loaded', 'error');
      return;
    }

    this.renderAll();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    
    const featured = this.getFeatured();
    if (featured) {
      this.renderHero(featured);
    }
  },

  renderAll() {
    this.renderHero(this.getFeatured() || movies.list[0]);
    this.renderContinueWatching(this.getContinueWatching());
    this.renderTrending(this.getTrending());
    this.renderPopular();
    this.renderNewReleases();
    this.renderTopRated();
    this.renderRecommended(this.getRecommended());
  },

  getFeatured() {
    if (!movies.list || movies.list.length === 0) return null;
    if (typeof movies.featured === 'number') return movies.list.find(m => m.id === movies.featured) || movies.list[0];
    if (typeof movies.featured === 'object' && movies.featured !== null) return movies.featured;
    return movies.list[0];
  },

  getTrending() { return movies.list.filter(m => m.isTrending).slice(0, 12); },
  getRecommended() { return movies.list.filter(m => m.isRecommended && !m.isTrending).slice(0, 12); },
  getContinueWatching() {
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    return history
      .filter(h => h.position > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(h => {
        const movie = movies.list.find(m => m.id === h.id);
        if (movie) {
          movie.progress = h.position;
          movie.duration = 7200;
        }
        return movie;
      })
      .filter(m => m !== undefined);
  },

  renderHero(movie) {
    if (!movie) return;
    this.currentMovieId = movie.id;
    
    const bannerImg = document.getElementById('bannerImage');
    bannerImg.src = movie.banner || movie.poster || '';
    
    document.getElementById('heroTitle').textContent = this.sanitize(movie.title);
    document.getElementById('heroMeta').textContent = 
      `${this.sanitize(movie.year)} · ${this.sanitize(movie.language)} · ${this.sanitize(movie.quality)} · ${this.sanitize(movie.runtime)} min · ⭐ ${this.sanitize(movie.rating)}`;
    
    const storyText = this.sanitize(movie.story);
    document.getElementById('heroStory').textContent = storyText.length > 280 ? storyText.substring(0, 280) + '...' : storyText;

    const badges = document.getElementById('heroBadges');
    let badgesHtml = '';
    if (movie.isFeatured) badgesHtml += '<span class="badge featured">⭐ Featured</span>';
    if (movie.isTrending) badgesHtml += '<span class="badge trending">🔥 Trending</span>';
    if (movie.quality === '4K') badgesHtml += '<span class="badge quality-badge">4K Ultra HD</span>';
    badges.innerHTML = badgesHtml || '<span class="badge new">✨ New</span>';

    document.getElementById('watchNowBtn').onclick = () => this.openPlayer(movie);
    document.getElementById('addWatchlistBtn').onclick = () => this.toggleWatchlist(movie);
    document.getElementById('copyLinkBtn').onclick = () => this.copyLink(movie);
  },

  createMovieRow(moviesList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (moviesList.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem;">No movies available</p>';
      return;
    }
    
    moviesList.forEach(movie => {
      const card = this.createCard(movie);
      container.appendChild(card);
    });
  },

  createCard(movie, showProgress = false) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = movie.id;
    
    const progressBar = showProgress && movie.progress && movie.duration ? 
      `<div class="progress-bar"><div class="progress-fill" style="width:${(movie.progress / movie.duration * 100)}%"></div></div>` : '';
    
    card.innerHTML = `
      <img src="${movie.poster || ''}" alt="${this.sanitize(movie.title)}" loading="lazy" 
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22420%22%3E%3Crect fill=%22%23141414%22 width=%22280%22 height=%22420%22/%3E%3Ctext fill=%22666%22 x=%22140%22 y=%22210%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
      ${progressBar}
      <div class="card-overlay">
        <h3>${this.sanitize(movie.title)}</h3>
        <div class="card-meta">
          <span>${this.sanitize(movie.year)}</span>
          <span>·</span>
          <span>⭐ ${this.sanitize(movie.rating)}</span>
          <span>·</span>
          <span>${this.sanitize(movie.quality)}</span>
        </div>
      </div>
      <button class="watch-btn" data-id="${movie.id}">▶</button>
    `;
    
    card.querySelector('.watch-btn').onclick = (e) => {
      e.stopPropagation();
      this.openPlayer(movie);
    };
    card.onclick = () => this.openDetail(movie);
    
    return card;
  },

  renderTrending(list) { this.createMovieRow(list, 'trendingRow'); },
  renderPopular() { 
    const list = movies.list.filter(m => m.isPopular && !m.hideMovie).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 12);
    this.createMovieRow(list, 'popularRow'); 
  },
  renderNewReleases() { 
    const list = movies.list.filter(m => m.isNewRelease && !m.hideMovie).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 12);
    this.createMovieRow(list, 'newReleasesRow'); 
  },
  renderTopRated() { 
    const list = movies.list.filter(m => m.isTopRated && !m.hideMovie).sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0)).slice(0, 12);
    this.createMovieRow(list, 'topRatedRow'); 
  },
  renderContinueWatching(list) { this.createMovieRow(list, 'continueRow', true); },
  renderRecommended(list) { this.createMovieRow(list, 'recommendedRow'); },

  openDetail(movie) {
    if (!movie) return;
    this.currentMovieId = movie.id;
    
    const detailSection = document.getElementById('movie-details');
    detailSection.style.display = 'block';
    
    document.getElementById('movieTitle').textContent = this.sanitize(movie.title);
    document.getElementById('movieOriginalTitle').textContent = movie.originalTitle ? `(${this.sanitize(movie.originalTitle)})` : '';
    document.getElementById('movieYear').textContent = this.sanitize(movie.year);
    document.getElementById('movieQuality').textContent = this.sanitize(movie.quality);
    document.getElementById('movieRuntime').textContent = this.sanitize(movie.runtime) + ' min';
    document.getElementById('movieRating').textContent = '⭐ ' + this.sanitize(movie.rating);
    document.getElementById('movieLanguage').textContent = this.sanitize(movie.language);
    document.getElementById('movieStory').textContent = this.sanitize(movie.story);
    document.getElementById('movieDirector').textContent = this.sanitize(movie.director);
    document.getElementById('movieGenres').textContent = (movie.genres && movie.genres.length) ? movie.genres.join(', ') : 'N/A';
    document.getElementById('movieCast').textContent = (movie.cast && movie.cast.length) ? movie.cast.slice(0, 5).join(', ') : 'N/A';
    document.getElementById('movieWriter').textContent = this.sanitize(movie.writer);
    
    document.getElementById('detailPoster').src = movie.poster || 'data:image/svg+xml,...';
    
    document.getElementById('playBtn').onclick = () => this.openPlayer(movie);
    document.getElementById('trailerBtn').onclick = () => this.playTrailer(movie);
    document.getElementById('streamBtn').onclick = () => this.showSources(movie);
    
    detailSection.scrollIntoView({ behavior: 'smooth' });
  },

  openPlayer(movie) {
    if (!movie) { 
      showToast('No movie selected.', 'error');
      return; 
    }
    
    if (!movie.driveLink || movie.driveLink.trim() === '') {
      showToast('No Drive link available for this movie.', 'error', 4000);
      return;
    }

    const detected = detectSource(movie.driveLink);
    
    if (detected.type === 'drive') {
      showToast('Opening movie player...', 'info');
      setTimeout(() => {
        window.location.href = `stream.html?movie=${movie.id}`;
      }, 500);
    } else {
      showToast('Invalid Drive link format', 'error', 4000);
    }
  },

  playTrailer(movie) {
    if (!movie.trailerURL) {
      showToast('No trailer available', 'warning');
      return;
    }
    showToast('Loading trailer...', 'info');
    setTimeout(() => {
      window.location.href = `stream.html?movie=${movie.id}&trailer=1`;
    }, 500);
  },

  showSources(movie) {
    const list = document.getElementById('sourcesList');
    list.innerHTML = '';
    if (movie.driveLink) { 
      const detected = detectSource(movie.driveLink); 
      const btn = document.createElement('button');
      btn.className = 'source-btn';
      btn.textContent = `Google Drive (${detected.type.toUpperCase()})`;
      btn.onclick = () => {
        this.loadDriveSource(detected);
      };
      list.appendChild(btn);
    }
    
    if (list.children.length === 0) {
      list.innerHTML = '<p>No sources available</p>';
    }
    
    document.getElementById('sourcesModal').style.display = 'flex';
    document.querySelector('#sourcesModal .modal-close').onclick = () => document.getElementById('sourcesModal').style.display = 'none';
  },

  loadDriveSource(driveInfo) {
    const iframe = document.getElementById('drivePlayer');
    iframe.src = driveInfo.previewUrl;
    this.currentDriveInfo = driveInfo;
    showToast('Drive source loaded', 'success');
  },

  toggleWatchlist(movie) {
    if (!movie) return;
    if (this.watchlist.includes(movie.id)) {
      this.watchlist = this.watchlist.filter(id => id !== movie.id);
      showToast('Removed from watchlist', 'info');
    } else {
      this.watchlist.push(movie.id);
      showToast('Added to watchlist', 'success');
    }
    localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
  },

  copyLink(movie) {
    const url = window.location.href.split('#')[0] + '?movie=' + movie.id;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  },

  getMovieById(id) { return movies.list.find(m => m.id === id) || null; },

  searchMovies() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const results = movies.list.filter(m => 
      !m.hideMovie && (m.title + ' ' + (m.genres || []).join(' ')).toLowerCase().includes(q)
    );
    
    const resultsRow = document.createElement('div');
    resultsRow.className = 'section';
    resultsRow.id = 'searchResultsSection';
    resultsRow.innerHTML = `
      <div class="container">
        <h2 class="section-title">Search Results for "${q}"</h2>
        <div class="cards-row" id="searchResults"></div>
      </div>
    `;
    
    const previousResults = document.getElementById('searchResultsSection');
    if (previousResults) {
      previousResults.remove();
    }
    
    document.body.appendChild(resultsRow);
    const searchContainer = document.getElementById('searchResults');
    results.forEach(m => searchContainer.appendChild(this.createCard(m)));
    
    showToast(`Found ${results.length} movies`, 'success');
    
    resultsRow.scrollIntoView({ behavior: 'smooth' });
  },

  setupEventListeners() {
    window.onscroll = () => {
      const header = document.getElementById('header');
      const backToTop = document.getElementById('backToTop');
      
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      
      if (backToTop) {
        backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
      }
    };

    document.getElementById('backToTop').onclick = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    document.getElementById('searchBtn').onclick = () => this.searchMovies();
    document.getElementById('searchInput').onkeypress = (e) => { 
      if (e.key === 'Enter') this.searchMovies(); 
    };

    document.getElementById('backToList').onclick = () => {
      document.getElementById('movie-details').style.display = 'none';
    };

    document.getElementById('watchlistBtn').onclick = () => {
      const list = this.watchlist.map(id => { 
        const m = this.getMovieById(id); 
        return m ? m.title : id; 
      });
      showToast(list.length > 0 ? 'Watchlist: ' + list.join(', ') : 'Watchlist is empty', 'info', 5000);
    };

    document.getElementById('themeToggle').onclick = () => { 
      document.body.classList.toggle('light-theme'); 
    };
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('movie-details').style.display = 'none';
      }
    });
  }
};

let movies = { list: [], featured: null, settings: {} };

async function loadMovies() {
  try {
    showToast('Loading movies...', 'loading');
    const response = await fetch('movies.json');
    if (!response.ok) throw new Error('Failed to load movies.json');
    const data = await response.json();
    movies = data;
    console.log(`%c✅ Loaded ${movies.list.length} movies`, 'color: #00d4ff; font-weight: bold;');
    showToast(`Welcome! ${movies.list.length} movies loaded`, 'success');
    return true;
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to load movies: ' + error.message, 'error', 5000);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('%c🎬 StreamHub - Premium Streaming', 'color: #e50914; font-weight: bold; font-size: 20px;');
  
  const loaded = await loadMovies();
  
  if (loaded) {
    MovieManager.init();
  } else {
    showToast('Failed to load movies. Please refresh.', 'error', 8000);
  }
});
