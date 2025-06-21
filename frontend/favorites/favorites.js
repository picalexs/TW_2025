import FavoritesService from '../services/favoritesService.js';

function getCurrentUserId() {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const userId = userData.id;
  const authToken = localStorage.getItem('authToken');
  return (userId && authToken) ? userId : null;
}

async function renderFavorites() {
  const favoritesService = new FavoritesService({ baseURL: window.APP_CONFIG?.api?.baseURL });
  favoritesService.apiService._refreshAuthToken(); // asigură tokenul la fiecare request
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
    container.innerHTML = '<p>Error loading favorites.</p>';
    return;
  }
  if (!pets || pets.length === 0) {
    container.innerHTML = '<p>You have no favorite pets.</p>';
    return;
  }
  pets.forEach(pet => {
    const petDiv = document.createElement('div');
    petDiv.className = 'favorite-pet-card';
    petDiv.innerHTML = `
      <h3>${pet.name}</h3>
      <img src="${pet.imagePath}" alt="${pet.name}" width="120">
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
        favoritesService.apiService._refreshAuthToken();
        await favoritesService.removeFavorite(petId);
        renderFavorites();
      } catch (err) {
        alert('Error removing favorite.');
      }
    }
  });
  console.log('[DEBUG] authToken in localStorage:', localStorage.getItem('authToken'));
});
