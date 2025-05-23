import PetService from '../services/petService.js';
const petService = new PetService();

export async function fetchPets() {
  try {
    console.log('Attempting to fetch pets from API...');
    return await petService.getAllPets();
  } catch (error) {
    console.error('Error in fetchPets:', error);
    throw error;
  }
}

export function renderPets(pets, containerId = 'pets-grid') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id '${containerId}' not found`);
    return;
  }

  container.innerHTML = '';
  
  if (!pets || pets.length === 0) {
    const noResultsMessage = window.languageManager?.translate('noResults', 'No pets available for adoption at this time.');
    container.innerHTML = `<div class="no-pets-message">${noResultsMessage}</div>`;
    return;
  }

  pets.forEach(pet => {
    const petCard = createPetCard(pet);
    container.appendChild(petCard);
  });
}

function createPetCard(pet) {
  const card = document.createElement('div');
  card.className = 'pet-card';
  card.setAttribute('data-pet-id', pet.id);
  
  const imagePath = pet.imagePath || '../assets/default-pet.jpg';
  
  const description = pet.description && pet.description.length > 100 
    ? pet.description.substring(0, 100) + '...' 
    : pet.description || 'No description available';
  
  // Get translations with fallbacks
  const lm = window.languageManager;
  const speciesText = pet.species ? 
    (lm?.translate(`species.${pet.species.toLowerCase()}`, pet.species)) : 
    lm?.translate('petInfo.species', 'Unknown');
    
  const healthText = pet.healthStatus ? 
    (lm?.translate(`healthStatus.${pet.healthStatus.toLowerCase().replace(/\s+/g, '')}`, pet.healthStatus)) : 
    lm?.translate('petInfo.healthStatus', 'Status unknown');
    
  const viewDetailsText = lm?.translate('viewDetails', 'View Details');
  
  card.innerHTML = `
    <img src="${imagePath}" alt="${pet.name}" class="pet-image">
    <div class="pet-info">
      <h3 class="pet-name">${pet.name}</h3>
      <p class="pet-description">${description}</p>
      <div class="pet-tags">
        <span class="tag">${speciesText}</span>
        <span class="tag">${healthText}</span>
      </div>
      <a href="./pet-details.html?id=${pet.id}" class="btn btn-primary">${viewDetailsText}</a>
    </div>
  `;
  
  return card;
}

export function showPetLoadError(error, containerId = 'pets-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const lm = window.languageManager;
  const errorTitle = lm?.translate('errorMessage.title', 'Sorry, there was a problem loading pets.');
  const retryButtonText = lm?.translate('errorMessage.retryButton', 'Try Again');
  
  container.innerHTML = `
    <div class="error-message">
      <p>${errorTitle}</p>
      <p class="error-details">${error.message}</p>
      <button class="btn btn-primary retry-btn">${retryButtonText}</button>
    </div>
  `;
  
  const retryBtn = container.querySelector('.retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      const loadingText = lm?.translate('loading', 'Loading pets...');
      container.innerHTML = `<div class="loading-spinner">${loadingText}</div>`;
      try {
        const pets = await fetchPets();
        renderPets(pets, containerId);
      } catch (err) {
        showPetLoadError(err, containerId);
      }
    });
  }
}