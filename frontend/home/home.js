import { fetchPets, renderPets, showPetLoadError } from '../pets/pets.js';
import { initSlideshow, setupMobileMenu } from '../global/global.js';

import languageManager from '../languages/language.js';

function initHomePage() {
  console.log("Initializing home page...");
  initHeroSection();
  
  setupMobileMenu();
  initializePageLanguage(); // Add this line to ensure language is updated
  
  loadPets();
  fetchAndRenderUsers();
  addEventListeners();
}

// Add this function to ensure the dynamic sections container exists
function ensureDynamicSectionsContainer() {
  let container = document.getElementById('dynamic-sections-container');
  if (!container) {
    console.log('Creating dynamic sections container');
    container = document.createElement('div');
    container.id = 'dynamic-sections-container';
    container.style.order = '2';
    
    const contentContainer = document.getElementById('content-container');
    if (contentContainer) {
      // Insert after hero section
      const heroSection = document.querySelector('.hero');
      if (heroSection && heroSection.parentNode === contentContainer) {
        contentContainer.insertBefore(container, heroSection.nextSibling);
      } else {
        contentContainer.appendChild(container);
      }
    } else {
      console.error('Content container not found');
      document.body.appendChild(container);
    }
  }
}

function initHeroSection() {
  console.log("Initializing hero section...");
  
  const heroSection = document.querySelector('.hero');
  if (!heroSection) {
    console.error("Hero section not found");
    return;
  }
  
  heroSection.classList.add('hero-section');

  const heroTitle = heroSection.querySelector('.hero-title');
  const heroSubtitle = heroSection.querySelector('.hero-subtitle');
  const browseButton = heroSection.querySelector('.btn.btn-primary');
  
  if (heroTitle && !heroTitle.textContent.trim()) {
    heroTitle.textContent = 'Find Your Perfect Pet Companion';
  }
  
  if (heroSubtitle && !heroSubtitle.textContent.trim()) {
    heroSubtitle.textContent = 'Adopt a pet and change a life forever';
  }
  
  if (browseButton && !browseButton.textContent.trim()) {
    browseButton.textContent = 'Browse Pets';
  }
  
  // Initialize the slideshow with more logging
  console.log("Starting slideshow initialization");
  initSlideshow({
    containerSelector: '.hero-slideshow',
  });
}

async function loadPets() {
  const petsGrid = document.getElementById('pets-grid');
  if (!petsGrid) {
    console.error("Pets grid container not found");
    return;
  }
  
  petsGrid.innerHTML = '<div class="loading-spinner">Loading pets...</div>';
  
  try {
    console.log("Fetching pets data...");
    const pets = await fetchPets();
    
    if (!pets || pets.length === 0) {
      console.warn("No pets received from fetchPets");
      petsGrid.innerHTML = `
        <div class="no-pets-message">
          <p>No pets available for adoption at this time.</p>
          <p>Please check back later!</p>
        </div>
      `;
      return;
    }
    
    console.log(`Successfully fetched ${pets.length} pets`);
    renderPets(pets, 'pets-grid');
  } catch (error) {
    console.error("Error in loadPets:", error);
    showPetLoadError(error, 'pets-grid');
  }
}

async function fetchAndRenderUsers() {
  const dynamicSectionsContainer = document.getElementById('dynamic-sections-container');
  if (!dynamicSectionsContainer) {
    console.error("Dynamic sections container not found");
    return;
  }
  
  const usersSection = document.createElement('section');
  usersSection.className = 'featured-users';
  usersSection.id = 'featured-users';
  
  try {
    //temporary mock data
    const users = [
      { id: 1, username: 'JohnDoe', email: 'john@example.com', createdAt: new Date().toISOString() },
      { id: 2, username: 'JaneSmith', email: 'jane@example.com', createdAt: new Date().toISOString() },
      { id: 3, username: 'BobJohnson', email: 'bob@example.com', createdAt: new Date().toISOString() }
    ];
    
    usersSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title" data-i18n="featuredUsers.title">Our Community</h2>
          <p data-i18n="featuredUsers.subtitle">Meet some of our registered users</p>
        </div>
        <div class="users-grid pets-grid">
          ${users.map(user => `
            <div class="pet-card" data-user-id="${user.id}">
              <div class="pet-info">
                <h3 class="pet-name">${user.username}</h3>
                <p class="pet-description">${user.email}</p>
                <p><span data-i18n="featuredUsers.joined">Joined</span>: ${new Date(user.createdAt).toLocaleDateString()}</p>
                <div class="pet-tags">
                  <span class="tag">User</span>
                </div>
                <a href="#" class="btn btn-outline view-user-btn" data-user-id="${user.id}" data-i18n="featuredUsers.viewProfile">View Profile</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    dynamicSectionsContainer.appendChild(usersSection);
    
    console.log("Community section added to dynamic container");
    
  } catch (error) {
    console.error('Error handling users section:', error);
    usersSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title" data-i18n="featuredUsers.title">Our Community</h2>
          <p>Error loading users: ${error.message}</p>
        </div>
      </div>
    `;
    dynamicSectionsContainer.appendChild(usersSection);
  }
  
  if (window.languageManager) {
    window.languageManager.updateContent();
  }
}

function addEventListeners() {
  document.querySelectorAll('.view-user-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const userId = event.currentTarget.getAttribute('data-user-id');
      console.log(`Viewing user details for user ID: ${userId}`);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded - starting home page initialization");
  
  if (document.body.classList.contains('home-initialized')) {
    console.log('Home page already initialized');
    return;
  }
  
  document.body.classList.add('home-initialized');
  document.body.classList.add('home-page');
  
  // Attempt to set up mobile menu immediately
  try {
    setupMobileMenu();
  } catch (e) {
    console.warn("Mobile menu setup failed on initial try:", e);
  }
  
  // Create a more robust initialization approach with multiple fallbacks
  const componentsLoaded = new Promise((resolve) => {
    const headerComponent = document.querySelector('[data-component="header"]');
    const footerComponent = document.querySelector('[data-component="footer"]');
    
    if (headerComponent && footerComponent) {
      // Listen for componentsLoaded event
      document.addEventListener('componentsLoaded', function() {
        console.log('Components loaded event fired');
        resolve();
      }, { once: true });
      
      // Fallback if event never fires
      setTimeout(resolve, 2000);
    } else {
      resolve(); // No components to wait for
    }
  });
  
  componentsLoaded.then(() => {
    console.log('Starting home page initialization now');
    
    // Try setting up mobile menu again after components load
    try {
      setupMobileMenu();
    } catch (e) {
      console.warn("Mobile menu setup failed after components loaded:", e);
    }
    
    setTimeout(() => {
      initHomePage();
    }, 100);
  });
});

function loadFeaturedPets() {
  const petsGrid = document.getElementById('pets-grid');
  if (!petsGrid) return;
  
  petsGrid.innerHTML = '<div class="loading-spinner">Loading pets...</div>';
  
  fetch('/api/pets?featured=true')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(pets => {
      if (pets.length === 0) {
        petsGrid.innerHTML = '<div class="no-pets-message">No featured pets available at the moment.</div>';
        return;
      }
      
      petsGrid.innerHTML = '';
      
      pets.forEach(pet => {
        const petCard = createPetCard(pet);
        petsGrid.appendChild(petCard);
      });
    })
    .catch(error => {
      console.error('Error fetching pets:', error);
      petsGrid.innerHTML = `
        <div class="error-message">
          <p>Failed to load pets.</p>
          <p class="error-details">${error.message}</p>
          <button class="btn btn-primary" onclick="loadFeaturedPets()">Try Again</button>
        </div>
      `;
    });
}

function createPetCard(pet) {
  const card = document.createElement('div');
  card.className = 'pet-card';
  
  card.innerHTML = `
    <img class="pet-image" src="${pet.imageUrl || '../assets/pet-placeholder.jpg'}" alt="${pet.name}">
    <div class="pet-info">
      <h3 class="pet-name">${pet.name}</h3>
      <p class="pet-description">${pet.breed}, ${pet.age} years</p>
      <div class="pet-tags">
        ${pet.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <a href="../pet-details/pet-details.html?id=${pet.id}" class="btn btn-primary">View Details</a>
    </div>
  `;
  
  return card;
}