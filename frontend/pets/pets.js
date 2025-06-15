import PetService from '../services/petService.js';
const petService = new PetService();

let allPets = [];

export async function fetchPets() {
  try {
    console.log('Attempting to fetch pets from API...');
    const pets = await petService.getAllPets();
    allPets = pets;
    return pets;
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
  
  updateResultsCount(pets.length);
}

function updateResultsCount(count) {
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    const lm = window.languageManager;
    if (count === allPets.length) {
      resultsCount.textContent = lm?.translate('showingResults', 'Showing all pets');
    } else {
      resultsCount.textContent = lm?.translate('showingFilteredResults', 'Showing {0} of {1} pets', [count, allPets.length])
        .replace('{0}', count).replace('{1}', allPets.length);
    }
  }
}

function createPetCard(pet) {  const card = document.createElement('div');
  card.className = 'pet-card';
  card.setAttribute('data-pet-id', pet.id);

  const imagePath = window.ImagePathHandler.processPetImagePath(pet.imagePath);
  
  const description = pet.description && pet.description.length > 100 
    ? pet.description.substring(0, 100) + '...' 
    : pet.description || 'No description available';
  
  const lm = window.languageManager;
  const speciesText = pet.species ? 
    (lm?.translate(`species.${pet.species.toLowerCase()}`, pet.species)) : 
    lm?.translate('petInfo.species', 'Unknown');
    
  const healthText = pet.healthStatus ? 
    (lm?.translate(`healthStatus.${pet.healthStatus.toLowerCase().replace(/\s+/g, '')}`, pet.healthStatus)) : 
    lm?.translate('petInfo.healthStatus', 'Status unknown');
    
  const viewDetailsText = lm?.translate('viewDetails', 'View Details');
  
  card.innerHTML = `
    <img src="${imagePath}" alt="${pet.name}" class="pet-image" onerror="this.src='../assets/default-pet-profile.jpg'">
    <div class="pet-info">
      <h3 class="pet-name">${pet.name}</h3>
      <p class="pet-description">${description}</p>
      <div class="pet-tags">
        <span class="tag">${speciesText}</span>
        <span class="tag">${healthText}</span>
      </div>
      <a href="/frontend/pets/pet-details.html?id=${pet.id}" class="btn btn-primary">${viewDetailsText}</a>
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

export function filterPets() {
  if (!allPets.length) return [];
  
  const species = document.getElementById('species-filter')?.value;
  const age = document.getElementById('age-filter')?.value;
  const size = document.getElementById('size-filter')?.value;
  const healthStatus = document.getElementById('health-filter')?.value;
  const nameSearch = document.getElementById('name-search')?.value.toLowerCase();
  const goodWithKids = document.getElementById('kids-filter')?.value;
  const goodWithPets = document.getElementById('pets-filter')?.value;
  const energyLevel = document.getElementById('energy-filter')?.value;
  
  return allPets.filter(pet => {
    if (species && pet.species && pet.species.toLowerCase() !== species.toLowerCase()) return false;
    
    if (age) {
      const petAge = parseFloat(pet.age);
      if (isNaN(petAge)) return false;
      
      const [minAge, maxAge] = age.includes('-') 
        ? age.split('-').map(a => parseFloat(a)) 
        : [parseFloat(age.replace('+', '')), Infinity];
      
      if (petAge < minAge || petAge > maxAge) return false;
    }
    
    if (size && pet.sizeCategory && pet.sizeCategory.toLowerCase() !== size.toLowerCase()) return false;
    
    if (healthStatus && pet.healthStatus && 
        pet.healthStatus.toLowerCase().replace(/\s+/g, '') !== healthStatus.toLowerCase()) return false;
    
    if (nameSearch && (!pet.name || !pet.name.toLowerCase().includes(nameSearch))) return false;
    
    if (goodWithKids === 'yes' && pet.relationWithOthers && 
        !pet.relationWithOthers.toLowerCase().includes('kid')) return false;
    
    if (goodWithKids === 'no' && pet.relationWithOthers && 
        pet.relationWithOthers.toLowerCase().includes('not good with kids')) return true;
    
    if (goodWithPets === 'yes' && pet.relationWithOthers && 
        !pet.relationWithOthers.toLowerCase().includes('pet')) return false;
    
    if (goodWithPets === 'no' && pet.relationWithOthers && 
        pet.relationWithOthers.toLowerCase().includes('not good with other pets')) return true;
    
    if (energyLevel && pet.description) {
      const hasEnergyLevel = pet.description.toLowerCase().includes(energyLevel.toLowerCase());
      if (!hasEnergyLevel) return false;
    }
    return true;
  });
}

export function sortPets(pets) {
  const sortBy = document.getElementById('sort-filter')?.value || 'newest';
  
  return [...pets].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'oldest':
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'popularity':
        return (b.metrics?.viewsCount || 0) - (a.metrics?.viewsCount || 0);
      default:
        return 0;
    }
  });
}

export function initializeViewToggle() {
  const gridViewBtn = document.getElementById('grid-view');
  const listViewBtn = document.getElementById('list-view');
  const petsGrid = document.getElementById('pets-grid');
  
  if (gridViewBtn && listViewBtn && petsGrid) {
    gridViewBtn.addEventListener('click', () => {
      petsGrid.classList.remove('list-view');
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    });
    
    listViewBtn.addEventListener('click', () => {
      petsGrid.classList.add('list-view');
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
    });
  }
}

export function initializeAdvancedFilters() {
  const toggleBtn = document.getElementById('toggle-advanced-filters');
  const advancedPanel = document.getElementById('advanced-filters-panel');
  
  if (toggleBtn && advancedPanel) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = advancedPanel.style.display === 'none';
      advancedPanel.style.display = isHidden ? 'block' : 'none';
      const lm = window.languageManager;
      toggleBtn.textContent = isHidden 
        ? lm?.translate('hideAdvancedFilters', 'Hide Advanced Filters') 
        : lm?.translate('advancedFilters', 'Advanced Filters');
    });
  }
}

export function initializeFilterButtons() {
  const applyBtn = document.getElementById('apply-filters');
  const resetBtn = document.getElementById('reset-filters');
  const addPetBtn = document.getElementById('add-pet-btn');
  
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const filteredPets = filterPets();
      const sortedPets = sortPets(filteredPets);
      renderPets(sortedPets);
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('.filter-select').forEach(select => {
        select.selectedIndex = 0;
      });
      
      document.querySelectorAll('.filter-input').forEach(input => {
        input.value = '';
      });
      
      renderPets(allPets);
    });
  }

  if (addPetBtn) {
    addPetBtn.addEventListener('click', () => {
      window.location.href = 'add-pet.html';
    });
  }
}

window.testFilters = () => {
  console.log('Current pets:', allPets);
  console.log('Filter results:', filterPets());
  console.log('Sorted results:', sortPets(filterPets()));
};