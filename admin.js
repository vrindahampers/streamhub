// ============================================================
// STREAMHUB - Admin Panel JavaScript
// ============================================================

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

let moviesData = { list: [], featured: null, settings: {} };
let editingId = null;

// Load movies from movies.json
async function loadMovies() {
  try {
    const response = await fetch('movies.json');
    if (!response.ok) throw new Error('Failed to load movies.json');
    const data = await response.json();
    moviesData = data;
    updateMovieCount();
    renderMovieList();
    return data;
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to load movies: ' + error.message, 'error', 5000);
    return null;
  }
}

// Update movie count
function updateMovieCount() {
  const count = moviesData.list ? moviesData.list.length : 0;
  const countElement = $('#movieCount');
  if (countElement) {
    countElement.textContent = count;
  }
}

// Generate JSON from form
function generateJSON() {
  const movie = {
    id: editingId || Date.now(),
    title: $('#title').value || 'Untitled',
    originalTitle: $('#originalTitle').value || $('#title').value,
    year: $('#year').value || '2024',
    language: $('#language').value || 'English',
    quality: $('#quality').value || '1080P',
    runtime: $('#runtime').value || '120',
    rating: parseFloat($('#rating').value) || 4.0,
    genres: $('#genres').value.split(',').map(g => g.trim()).filter(g => g),
    director: $('#director').value || 'Unknown',
    writer: $('#writer').value || '',
    cast: $('#cast').value.split(',').map(c => c.trim()).filter(c => c),
    story: $('#story').value || '',
    poster: $('#poster').value || '',
    banner: $('#banner').value || '',
    thumbnail: $('#thumbnail').value || '',
    screenshots: $('#screenshots').value.split(',').map(s => s.trim()).filter(s => s),
    driveLink: $('#driveLink').value || '',
    telegramLink: '',
    streamingLink: '',
    downloads: $('#downloads').value ? JSON.parse($('#downloads').value) : [],
    downloadCount: parseInt($('#downloadsCount').value) || 0,
    sources: [],
    trailerURL: $('#trailerURL').value || '',
    externalSubtitle: '',
    internalSubtitle: '',
    tags: $('#tags').value.split(',').map(t => t.trim()).filter(t => t),
    seoKeywords: $('#seoKeywords').value || '',
    related: $('#related').value.split(',').map(r => parseInt(r.trim())).filter(r => r),
    isFeatured: $('#isFeatured').checked,
    isTrending: $('#isTrending').checked,
    isPopular: $('#isPopular').checked,
    isNewRelease: $('#isNewRelease').checked,
    isTopRated: $('#isTopRated').checked,
    isRecommended: $('#isRecommended').checked,
    hideMovie: $('#hideMovie').checked,
    comingSoon: $('#comingSoon').checked,
    premiumOnly: $('#premiumOnly').checked,
    views: parseInt($('#views').value) || 0,
    country: $('#country').value || '',
    releaseDate: $('#releaseDate').value || '',
    production: $('#production').value || '',
    imdbId: $('#imdbId').value || '',
    tmdbId: $('#tmdbId').value ? parseInt($('#tmdbId').value) : null
  };

  const jsonOutput = $('#jsonOutput');
  jsonOutput.value = JSON.stringify(movie, null, 2);
  
  return movie;
}

// Save movie to JSON
async function saveMovie(movie) {
  try {
    if (editingId) {
      // Update existing movie
      const index = moviesData.list.findIndex(m => m.id === editingId);
      if (index !== -1) {
        moviesData.list[index] = movie;
      }
    } else {
      // Add new movie
      moviesData.list.push(movie);
    }

    // Update featured if needed
    if (movie.isFeatured && moviesData.list.length > 0) {
      moviesData.featured = movie.id;
    }

    // Download the file
    downloadJSON();
    
    // Reload movies
    await loadMovies();
    
    showToast(editingId ? 'Movie updated successfully!' : 'Movie added successfully!', 'success');
    resetForm();
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to save movie: ' + error.message, 'error', 5000);
  }
}

// Download movies.json
function downloadJSON() {
  const dataStr = JSON.stringify(moviesData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'movies.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('movies.json downloaded!', 'success');
}

// Copy JSON to clipboard
function copyJSON() {
  const jsonText = $('#jsonOutput').value;
  if (!jsonText) {
    showToast('No JSON to copy. Generate JSON first.', 'warning');
    return;
  }
  
  navigator.clipboard.writeText(jsonText).then(() => {
    showToast('JSON copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy JSON', 'error');
  });
}

// Reset form
function resetForm() {
  $('#movieForm').reset();
  $('#movieId').value = '';
  $('#jsonOutput').value = '';
  editingId = null;
  $('#formTitle').textContent = 'Add New Movie';
  
  // Uncheck all checkboxes
  $$('.checkbox-label input[type="checkbox"]').forEach(cb => cb.checked = false);
}

// Edit movie
function editMovie(id) {
  const movie = moviesData.list.find(m => m.id === id);
  if (!movie) return;
  
  editingId = id;
  $('#formTitle').textContent = 'Edit Movie';
  
  // Fill form
  $('#movieId').value = movie.id || '';
  $('#title').value = movie.title || '';
  $('#originalTitle').value = movie.originalTitle || '';
  $('#year').value = movie.year || '';
  $('#quality').value = movie.quality || '';
  $('#runtime').value = movie.runtime || '';
  $('#rating').value = movie.rating || '';
  $('#language').value = movie.language || '';
  $('#country').value = movie.country || '';
  $('#director').value = movie.director || '';
  $('#writer').value = movie.writer || '';
  $('#cast').value = (movie.cast || []).join(', ');
  $('#genres').value = (movie.genres || []).join(', ');
  $('#story').value = movie.story || '';
  $('#poster').value = movie.poster || '';
  $('#banner').value = movie.banner || '';
  $('#thumbnail').value = movie.thumbnail || '';
  $('#screenshots').value = (movie.screenshots || []).join(', ');
  $('#driveLink').value = movie.driveLink || '';
  $('#trailerURL').value = movie.trailerURL || '';
  $('#production').value = movie.production || '';
  $('#imdbId').value = movie.imdbId || '';
  $('#tmdbId').value = movie.tmdbId || '';
  $('#releaseDate').value = movie.releaseDate || '';
  $('#seoKeywords').value = movie.seoKeywords || '';
  $('#tags').value = (movie.tags || []).join(', ');
  $('#downloads').value = JSON.stringify(movie.downloads || [], null, 2);
  $('#views').value = movie.views || 0;
  $('#downloadsCount').value = movie.downloadCount || 0;
  $('#related').value = (movie.related || []).join(', ');
  
  // Checkboxes
  $('#isFeatured').checked = movie.isFeatured || false;
  $('#isTrending').checked = movie.isTrending || false;
  $('#isPopular').checked = movie.isPopular || false;
  $('#isNewRelease').checked = movie.isNewRelease || false;
  $('#isTopRated').checked = movie.isTopRated || false;
  $('#isRecommended').checked = movie.isRecommended || false;
  $('#hideMovie').checked = movie.hideMovie || false;
  $('#comingSoon').checked = movie.comingSoon || false;
  $('#premiumOnly').checked = movie.premiumOnly || false;
  
  // Generate JSON
  generateJSON();
  
  // Scroll to form
  $('#formTitle').scrollIntoView({ behavior: 'smooth' });
}

// Delete movie
async function deleteMovie(id) {
  if (!confirm('Are you sure you want to delete this movie?')) return;
  
  try {
    moviesData.list = moviesData.list.filter(m => m.id !== id);
    
    // Update featured if needed
    if (moviesData.featured === id) {
      moviesData.featured = moviesData.list.length > 0 ? moviesData.list[0].id : null;
    }
    
    // Download updated JSON
    downloadJSON();
    
    // Reload
    await loadMovies();
    
    showToast('Movie deleted successfully!', 'success');
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to delete movie: ' + error.message, 'error', 5000);
  }
}

// Render movie list
function renderMovieList() {
  const container = $('#adminMovieList');
  if (!container) return;
  
  if (!moviesData.list || moviesData.list.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); padding: 2rem;">No movies yet. Add your first movie above!</p>';
    return;
  }
  
  container.innerHTML = '';
  
  moviesData.list.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'admin-movie-card';
    card.innerHTML = `
      <img src="${movie.poster || 'data:image/svg+xml,...'}" alt="${movie.title}" />
      <div class="admin-movie-info">
        <h3>${movie.title}</h3>
        <p>${movie.year} · ${movie.quality} · ⭐ ${movie.rating}</p>
        <div class="admin-movie-actions">
          <button class="btn btn-secondary" onclick="editMovie(${movie.id})">✏️ Edit</button>
          <button class="btn btn-secondary" onclick="deleteMovie(${movie.id})">🗑️ Delete</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  console.log('%c🎬 Admin Panel Loaded', 'color: #e50914; font-weight: bold;');
  
  // Load movies
  await loadMovies();
  
  // Form submission
  $('#movieForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const movie = generateJSON();
    await saveMovie(movie);
  });
  
  // Reset button
  $('#resetBtn').addEventListener('click', resetForm);
  
  // Generate JSON button
  $('#generateJsonBtn').addEventListener('click', () => {
    generateJSON();
    showToast('JSON generated!', 'info');
  });
  
  // Copy JSON button
  $('#copyJsonBtn').addEventListener('click', copyJSON);
  
  // Download JSON button
  $('#downloadJsonBtn').addEventListener('click', downloadJSON);
  
  // Real-time JSON generation
  const formInputs = $('#movieForm').querySelectorAll('input, textarea, select');
  formInputs.forEach(input => {
    input.addEventListener('input', () => {
      if ($('#jsonOutput').value) {
        generateJSON();
      }
    });
  });
});
