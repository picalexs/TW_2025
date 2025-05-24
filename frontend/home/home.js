import { fetchPets, renderPets, showPetLoadError } from '../pets/pets.js';
import { initSlideshow, setupMobileMenu, initializePageLanguage } from '../global/global.js';

function initHomePage() {
  initHeroSection();
  
  setupMobileMenu();
  initializePageLanguage();
  
  loadPets();
  fetchAndRenderUsers();
  addEventListeners();
}

function ensureDynamicSectionsContainer() {
  let container = document.getElementById('dynamic-sections-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dynamic-sections-container';
    container.style.order = '2';
    
    const contentContainer = document.getElementById('content-container');
    if (contentContainer) {
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
  const heroSection = document.querySelector('.hero');
  if (!heroSection) {
    console.error("Hero section not found");
    return;
  }
  
  heroSection.classList.add('hero-section');
  
  let slideshowContainer = heroSection.querySelector('.hero-slideshow');
  if (!slideshowContainer) {
    console.log("Creating slideshow container as it was not found");
    slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'hero-slideshow';
    heroSection.insertBefore(slideshowContainer, heroSection.firstChild);
  }

  slideshowContainer.innerHTML = '';
  createManualSlideshow(slideshowContainer);
}

function createManualSlideshow(container) {
  const slideImages = [
    '../assets/hero-bg.jpg',
    '../assets/hero-bg2.jpg',
    '../assets/hero-bg3.jpg',
    '../assets/hero-bg4.jpg',
    '../assets/hero-bg5.jpg',
    '../assets/hero-bg6.jpg',
    '../assets/hero-bg7.jpg',
    '../assets/hero-bg8.jpg'
  ];
  
  const uniqueImages = [...new Set(slideImages)];
  console.log(`Loading ${uniqueImages.length} unique slideshow images`);
  
  const fallbackSlide = document.createElement('div');
  fallbackSlide.className = 'hero-slide initial active';
  fallbackSlide.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${uniqueImages[0]}')`;
  container.appendChild(fallbackSlide);
  
  const loadedSlides = [fallbackSlide];
  
  setTimeout(() => {
    for (let i = 1; i < uniqueImages.length; i++) {
      const imgPath = uniqueImages[i];
      const slide = document.createElement('div');
      slide.className = 'hero-slide';
      slide.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${imgPath}')`;
      container.appendChild(slide);
      loadedSlides.push(slide);
    }
    
    startSlideRotation(container);
    setTimeout(() => {
      fallbackSlide.classList.remove('initial');
    }, 2000);
  }, 100);
}

function startSlideRotation(container) {
  const slides = container.querySelectorAll('.hero-slide');
  if (slides.length <= 1) {
    console.log("Not enough slides for rotation");
    return;
  }
  
  let currentIndex = 0;
  const SLIDE_DURATION = 5000;
  
  const interval = setInterval(() => {
    slides[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('active');
  }, SLIDE_DURATION);
  
  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
  });
  
  console.log(`Started slideshow rotation with ${slides.length} slides`);
}

async function loadPets() {
  const petsGrid = document.getElementById('pets-grid');
  if (!petsGrid) {
    console.error("Pets grid container not found");
    return;
  }
  
  petsGrid.innerHTML = '<div class="loading-spinner">Loading pets...</div>';
  
  try {
    console.log("Fetching pets data from API service...");
    const pets = await fetchPets();
    
    if (!pets || pets.length === 0) {
      console.warn("No pets received from API");
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
              <img src="../server/images/profile/default.jpg" alt="${user.username}" class="progile-image">
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
  ensureDynamicSectionsContainer();
  initHomePage();
});