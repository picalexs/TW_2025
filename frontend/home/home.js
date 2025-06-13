import { fetchPets, renderPets, showPetLoadError } from '../pets/pets.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../global/global.js';
import ApiService from '../services/api.js';
import UserService from '../services/userService.js';
const apiService = new ApiService();

function initHomePage() {
  initHeroSection();
  
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons()
  
  loadPets();
  addTestimonialsSection();
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
    console.log('Not enough slides for rotation');
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

async function addTestimonialsSection() {
  // This will be called after the featured pets section is loaded
  // We'll insert testimonials into the dynamic sections container
  const dynamicSectionsContainer = document.getElementById('dynamic-sections-container');
  if (!dynamicSectionsContainer) {
    console.error("Dynamic sections container not found");
    return;
  }
  
  // Create testimonials section
  const testimonialsSection = document.createElement('section');
  testimonialsSection.className = 'testimonials-section';
  testimonialsSection.id = 'testimonials';
  
  try {
    // Fetch testimonials from API
    const testimonials = await fetchTestimonials(3);
    
    testimonialsSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title" data-i18n="testimonials.title">What Our Community Says</h2>
          <p data-i18n="testimonials.subtitle">Real stories from pet adopters and shelter partners</p>
        </div>
        <div class="testimonials-grid">
          ${testimonials.map(testimonial => createTestimonialHTML(testimonial)).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading testimonials:', error);
    testimonialsSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title" data-i18n="testimonials.title">What Our Community Says</h2>
          <p data-i18n="testimonials.subtitle">Real stories from pet adopters and shelter partners</p>
        </div>
        <div class="error-message">
          <p>Unable to load testimonials at this time.</p>
        </div>
      </div>
    `;
  }
  
  // Add testimonials section to dynamic container (it will appear before users section)
  dynamicSectionsContainer.appendChild(testimonialsSection);
  
  console.log('Testimonials section added to dynamic container');
}

async function fetchTestimonials(count = 3) {
  try {
    const response = await apiService.get(`/api/testimonials/random`, { count });
    return response;
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw error;
  }
}

function createTestimonialHTML(testimonial) {
  const stars = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating);
  
  return `
    <div class="testimonial-card">
      <div class="testimonial-content">
        <div class="testimonial-rating">
          <span class="stars">${stars}</span>
        </div>
        <blockquote class="testimonial-text">
          "${testimonial.text}"
        </blockquote>
      </div>
      <div class="testimonial-author">
        <div class="author-info">
          <h4 class="author-name">${testimonial.userName}</h4>
          <p class="author-role">${testimonial.userRole === 'shelter' ? 'Partner Shelter' : 'Pet Adopter'}</p>
          <p class="author-location">${testimonial.location}</p>
        </div>
      </div>
    </div>
  `;
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
    const userService = new UserService({ debug: true });
    const users = await userService.getAllUsersWithAdoptions();
    const featuredUsers = users.slice(0, 6);
    
    usersSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title" data-i18n="featuredUsers.title">Our Community</h2>
          <p data-i18n="featuredUsers.subtitle">Meet some of our registered users</p>
        </div>          
        <div class="users-grid">
          ${featuredUsers.map(user => createUserCardHTML(user)).join('')}
        </div>
      </div>`;
    
    dynamicSectionsContainer.appendChild(usersSection);
    
    addEventListeners();
  } catch (error) {
    console.error('Error fetching users:', error);
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

function createUserCardHTML(user) {
  let imagePath = user.profile_picture;
  if (!imagePath) {
    imagePath = '../assets/default-profile.jpg';
  } else if (!imagePath.startsWith('http') && !imagePath.startsWith('/server/')) {
    imagePath = `/server/${imagePath}`;
  }
    const displayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user.first_name || user.username;
  
  // Show role-based description
  const userDescription = user.role === 'shelter' ? 'Shelter' : 'Community Member';
  
  const adoptionCount = user.adoption_count || 0;
  const adoptionText = adoptionCount === 1 ? 'adoption' : 'adoptions';
  
  return `
    <div class="user-card" data-user-id="${user.id}">
      <img src="${imagePath}" alt="${displayName}" class="user-image" onerror="this.src='../assets/default-profile.jpg'">
      <div class="user-info">
        <div class="user-name-section">
          <h3 class="user-name">${displayName}</h3>
          <span class="username-tag">@${user.username}</span>
        </div>
        <p class="user-description">${userDescription}</p>
        <div class="user-stats">
          <span class="adoption-count">${adoptionCount} ${adoptionText}</span>
        </div>
        <a href="#" class="btn btn-outline view-user-btn" data-user-id="${user.id}" data-i18n="featuredUsers.viewProfile">View Profile</a>
      </div>
    </div>
  `;
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
  document.body.classList.add('home_page');
  ensureDynamicSectionsContainer();
  initHomePage();
});