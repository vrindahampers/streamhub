// ============================================================
// STREAMHUB - Streaming Page JavaScript
// ============================================================

window.onerror = function(message, source, lineno, colno, error) {
  console.error('❌ JavaScript Error:', message);
  showToast('An error occurred: ' + message, 'error', 5000);
  return false;
};

function $(selector) { return document.querySelector(selector); }

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

  if (trimmed.includes('telegram.org') || trimmed.includes('t.me/')) {
    return { type: 'telegram', player: 'video', url: trimmed };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { type: 'unknown', player: 'video', url: trimmed };
  }

  return { type: 'none', player: 'none', url: '' };
}

let movies = { list: [], featured: null, settings: {} };
let currentMovie = null;
let currentDriveInfo = null;

function sanitize(str) {
  return (str && String(str).trim()) ? String(str).trim() : 'N/A';
}

async function loadMovies() {
  try {
    showToast('Loading movies...', 'loading');
    const response = await fetch('movies.json');
    if (!response.ok) throw new Error('Failed to load movies.json');
    const data = await response.json();
    movies = data;
    console.log(`%c✅ Loaded ${movies.list.length} movies`, 'color: #00d4ff; font-weight: bold;');
    showToast('Movies loaded successfully!', 'success');
    return true;
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to load movies.json: ' + error.message, 'error', 5000);
    return false;
  }
}

function loadMovieInPlayer(movieId) {
  const movie = movies.list.find(m => m.id === movieId);
  if (!movie) {
    showToast('Movie not found!', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  currentMovie = movie;

  // Update UI
  document.getElementById('playerMovieTitle').textContent = movie.title;
  document.getElementById('playerMovieMeta').textContent = 
    `${sanitize(movie.year)} · ${sanitize(movie.language)} · ${sanitize(movie.quality)} · ${sanitize(movie.runtime)} min · ⭐ ${sanitize(movie.rating)}`;
  
  document.getElementById('playerTitle').textContent = movie.title;
  document.getElementById('playerStory').textContent = sanitize(movie.story);
  document.getElementById('playerPoster').src = movie.poster || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect fill="%23252540" width="200" height="300"/><text fill="%23666" x="100" y="150" text-anchor="middle">No Poster</text></svg>';
  document.getElementById('playerYear').textContent = sanitize(movie.year);
  document.getElementById('playerQuality').textContent = sanitize(movie.quality);
  document.getElementById('playerRuntime').textContent = sanitize(movie.runtime) + ' min';
  document.getElementById('playerRating').textContent = '⭐ ' + sanitize(movie.rating);
  document.getElementById('playerLanguage').textContent = sanitize(movie.language);
  document.getElementById('playerDirector').textContent = sanitize(movie.director);
  document.getElementById('playerGenres').textContent = movie.genres ? movie.genres.join(', ') : 'N/A';
  document.getElementById('playerCast').textContent = movie.cast ? movie.cast.slice(0, 5).join(', ') : 'N/A';

  // Check for Drive link
  if (!movie.driveLink || movie.driveLink.trim() === '') {
    showToast('No Drive link available for this movie', 'error', 4000);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3000);
    return;
  }

  const detected = detectSource(movie.driveLink);
  
  if (detected.type === 'drive') {
    showToast('Loading Drive video...', 'info');
    
    // Hide spinner, show iframe
    document.getElementById('loadingSpinner').style.display = 'none';
    const iframe = document.getElementById('drivePlayer');
    const video = document.getElementById('mainPlayer');
    
    iframe.style.display = 'block';
    video.style.display = 'none';
    iframe.src = detected.previewUrl;
    
    currentDriveInfo = detected;
    showToast('Video loaded! 🎬', 'success');
  } else {
    showToast('Invalid Drive link format', 'error', 4000);
  }
}

function getMovieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const movieId = params.get('movie');
  return movieId ? parseInt(movieId) : null;
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('%c🎬 Stream Page Loaded', 'color: #00d4ff; font-weight: bold;');
  
  const loaded = await loadMovies();
  
  if (loaded) {
    const movieId = getMovieIdFromUrl();
    
    if (movieId) {
      setTimeout(() => {
        loadMovieInPlayer(movieId);
      }, 500);
    } else {
      showToast('No movie specified. Redirecting...', 'warning');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  } else {
    showToast('Failed to load movies. Redirecting...', 'error', 5000);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3000);
  }
});

document.getElementById('drivePlayer').addEventListener('error', function() {
  showToast('Failed to load video. Please try again.', 'error');
});
