import FavoritesService from '../services/favoritesService.js';

function getCurrentUserId() {
  const userId = localStorage.getItem('userId');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return (userId && isLoggedIn) ? userId : null;
}

const favoritesService = new FavoritesService();

async function renderFavorites() {
  const container = document.getElementById('favorites-list');
  container.innerHTML = '';
  const userId = getCurrentUserId();
  if (!userId) {
    const missing = [];
    if (!localStorage.getItem('userId')) missing.push('userId');
    if (localStorage.getItem('isLoggedIn') !== 'true') missing.push('isLoggedIn');
    container.innerHTML = `<p>Trebuie să fii autentificat pentru a vedea favoritele.<br>Missing: ${missing.join(', ')}</p>`;
    return;
  }
  let pets = [];
  try {
    pets = await favoritesService.getFavorites(userId);
  } catch (e) {
    container.innerHTML = '<p>Eroare la încărcarea favoritelor.</p>';
    return;
  }
  if (!pets || pets.length === 0) {
    container.innerHTML = '<p>Nu ai animale favorite.</p>';
    return;
  }
  pets.forEach(pet => {
    const petDiv = document.createElement('div');
    petDiv.className = 'favorite-pet-card';
    petDiv.innerHTML = `
      <h3>${pet.name}</h3>
      <img src="${pet.imagePath}" alt="${pet.name}" width="120">
      <button class="remove-favorite" data-pet-id="${pet.id}">Șterge</button>
    `;
    container.appendChild(petDiv);
  });
  document.querySelectorAll('.remove-favorite').forEach(btn => {
    btn.addEventListener('click', async function() {
      const petId = this.dataset.petId;
      await favoritesService.removeFavorite(userId, petId);
      renderFavorites();
    });
  });
}

document.addEventListener('DOMContentLoaded', renderFavorites);
