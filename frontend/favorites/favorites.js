import FavoritesService from '../services/favoritesService.js';

function getCurrentUserId() {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const userId = userData.id;
  const authToken = localStorage.getItem('authToken');
  return (userId && authToken) ? userId : null;
}

async function renderFavorites() {
  const favoritesService = new FavoritesService({ baseURL: window.APP_CONFIG?.api?.baseURL });
  const container = document.getElementById('favorites-list');
  container.innerHTML = '';
  const userId = getCurrentUserId();
  if (!userId) {
    const missing = [];
    if (!localStorage.getItem('authToken')) missing.push('authToken');
    if (!localStorage.getItem('userData')) missing.push('userData');
    container.innerHTML = `<p>You must be logged in to view your favorites.<br>Missing: ${missing.join(', ')}</p>`;
    return;
  }
  let pets = [];
  try {
    pets = await favoritesService.getFavorites();
  } catch (e) {
    console.error('Error fetching favorites:', e); // Debug log
    container.innerHTML = `<p>Error loading favorites: ${e.message}</p>`;
    return;
  }
  if (!pets || pets.length === 0) {
    container.innerHTML = '<p>You have no favorite pets.</p>';
    return;
  }
  pets.forEach(pet => {
    const petDiv = document.createElement('div');
    petDiv.className = 'favorite-pet-card';
    const imagePath = window.ImagePathHandler ? 
      window.ImagePathHandler.processPetImagePath(pet.imagePath) :
      (pet.imagePath || '/frontend/assets/default-pet-profile.jpg');
    
    petDiv.innerHTML = `
      <a href="../pets/pet-details/pet-details.html?id=${pet.id}" class="favorite-pet-link">
        <div class="favorite-pet-image-wrapper">
          <img src="${imagePath}" alt="${pet.name || 'Pet'}" class="favorite-pet-image" onerror="this.src='/frontend/assets/default-pet-profile.jpg'">
        </div>
        <div class="favorite-pet-info">
          <h3 class="favorite-pet-name">${pet.name || 'Unknown Pet'}</h3>
          <div class="favorite-pet-fields">
            <span><strong>Species:</strong> ${pet.species || 'Unknown'}</span>
            <span><strong>Age:</strong> ${pet.age ? pet.age + ' years' : 'Unknown'}</span>
            <span><strong>Location:</strong> ${pet.city || 'Unknown'}, ${pet.country || ''}</span>
          </div>
        </div>
      </a>
      <button class="remove-favorite" data-pet-id="${pet.id}">Remove</button>
    `;
    container.appendChild(petDiv);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderFavorites();
  document.getElementById('favorites-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-favorite')) {
      const petId = e.target.getAttribute('data-pet-id');
      try {
        const favoritesService = new FavoritesService({ baseURL: window.APP_CONFIG?.api?.baseURL });
        await favoritesService.removeFavorite(petId);
        renderFavorites();
      } catch (err) {
        alert('Error removing favorite.');
      }
    }
  });
  console.log('[DEBUG] authToken in localStorage:', localStorage.getItem('authToken'));
});
