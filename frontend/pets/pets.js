export async function fetchPets() {
  try {
    console.log('Attempting to fetch pets from API...');

    try {
      const response = await fetch('http://localhost:3000/api/pets');
      
      if (!response.ok) {
        console.warn(`API returned status: ${response.status}`);
        if (response.status === 500) {
          console.log('Server error detected, using fallback data');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const pets = await response.json();
      return pets;
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      if (fetchError.message.includes('Failed to fetch') || 
          fetchError.message.includes('500') ||
          fetchError.message.includes('NetworkError')) {
        return;
      }
      
      throw fetchError;
    }
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
    container.innerHTML = '<div class="no-pets-message">No pets available for adoption at this time.</div>';
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
  
  card.innerHTML = `
    <img src="${imagePath}" alt="${pet.name}" class="pet-image">
    <div class="pet-info">
      <h3 class="pet-name">${pet.name}</h3>
      <p class="pet-description">${description}</p>
      <div class="pet-tags">
        <span class="tag">${pet.species || 'Unknown'}</span>
        <span class="tag">${pet.healthStatus || 'Status unknown'}</span>
      </div>
      <a href="./pet-details.html?id=${pet.id}" class="btn btn-primary">View Details</a>
    </div>
  `;
  
  return card;
}

export function showPetLoadError(error, containerId = 'pets-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-message">
      <p>Sorry, there was a problem loading pets.</p>
      <p class="error-details">${error.message}</p>
      <button class="btn btn-primary retry-btn">Try Again</button>
    </div>
  `;
  
  const retryBtn = container.querySelector('.retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      container.innerHTML = '<div class="loading-spinner">Loading pets...</div>';
      try {
        const pets = await fetchPets();
        renderPets(pets, containerId);
      } catch (err) {
        showPetLoadError(err, containerId);
      }
    });
  }
}