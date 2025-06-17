import { fetchPets, renderPets, showPetLoadError, showPetPlaceholders } from '../pets/pets.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons, navigateToProfile } from '../global/global.js';
import ApiService from '../services/api.js';
import UserService from '../services/userService.js';
const apiService = new ApiService();

window.navigateToProfile = navigateToProfile;

function initHomePage() {
  initHeroSection();
  
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons()
  
  loadPets();
  addTestimonialsSection();
  fetchAndRenderUsers();
  addEventListeners();
  
  document.addEventListener('languageChanged', () => {
    console.log('Language changed, re-rendering user cards');
    fetchAndRenderUsers();
  });
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
}

async function addTestimonialsSection() {
  const testimonialsSection = document.getElementById('testimonials');
  if (!testimonialsSection) {
    console.error("Testimonials section not found in HTML");
    return;
  }
  
  const loadTestimonialsWithRetry = async () => {
    try {
      const testimonials = await fetchTestimonials();
      if (testimonials && testimonials.length > 0) {
        window.currentTestimonials = testimonials;
        testimonialsSection.innerHTML = createTestimonialsCarousel(testimonials);
        initTestimonialsCarousel();
        
        if (window.languageManager) {
          window.languageManager.updateContent();
        }
      } else {
        console.log("No testimonials received, retrying in 5 seconds...");
        setTimeout(() => loadTestimonialsWithRetry(), 5000);
      }
    } catch (error) {
      console.log("Failed to load testimonials, retrying in 5 seconds...", error);
      setTimeout(() => loadTestimonialsWithRetry(), 5000);
    }
  };
  
  loadTestimonialsWithRetry();
}

function createPlaceholderCard() {
  return window.CardRenderer.createPlaceholderCard('testimonial');
}

function createTestimonialsCarousel(testimonials) {
  return window.CarouselHelpers.generateTestimonialsCarouselHTML(
    testimonials,
    createTestimonialHTML
  );
}

function createEmptyTestimonialsState() {
  return `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title" data-i18n="testimonials.title">What Our Community Says</h2>
        <p data-i18n="testimonials.subtitle">Real stories from pet adopters and shelter partners</p>
      </div>
      <div class="no-pets-message">
        <p>No testimonials available at this time.</p>
        <p>Be the first to share your adoption story!</p>
      </div>
    </div>
  `;
}

function createErrorTestimonialsState() {
  return `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title" data-i18n="testimonials.title">What Our Community Says</h2>
        <p data-i18n="testimonials.subtitle">Real stories from pet adopters and shelter partners</p>
      </div>
      <div class="error-message">
        <p>Unable to load testimonials at this time.</p>
        <p>Please try refreshing the page.</p>
      </div>
    </div>
  `;
}

function getCardsPerSlide() {
  return window.CarouselHelpers.getResponsiveItemsPerSlide();
}

function createSlides(testimonials, cardsPerSlide) {
  return window.CarouselHelpers.createCarouselSlides(testimonials, () => cardsPerSlide);
}

let testimonialsCarousel = null;

function initTestimonialsCarousel() {
  if (testimonialsCarousel) {
    testimonialsCarousel.destroy();
  }
  
  const config = window.CarouselHelpers.createTestimonialsCarouselConfig('.testimonials-carousel');
  
  config.onSlideChange = (currentSlide, previousSlide, carousel) => {
    console.log(`Testimonials carousel moved from slide ${previousSlide} to ${currentSlide}`);
  };
  
  config.onInit = (carousel) => {
    console.log('Testimonials carousel initialized successfully');
  };
  
  testimonialsCarousel = new window.Carousel(config);
}

window.addEventListener('beforeunload', () => {
  if (testimonialsCarousel) {
    testimonialsCarousel.destroy();
  }
});

async function fetchTestimonials(count) {
  try {
    const endpoint = count ? `/api/testimonials/random?count=${count}` : '/api/testimonials';
    const response = await apiService.get(endpoint);
    return response;
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw error;
  }
}

function createStarsHTML(rating) {
  const numRating = parseFloat(rating) || 5;
  
  const fullStars = Math.floor(numRating);
  const hasHalfStar = (numRating % 1) >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHTML = '';
  
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<span class="star star-full">★</span>';
  }
  
  if (hasHalfStar) {
    starsHTML += '<span class="star star-half">★</span>';
  }
  
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<span class="star star-empty">☆</span>';
  }
  
  return starsHTML;
}

function createTestimonialHTML(testimonial) {
  return window.CardRenderer.createTestimonialCard(testimonial, {
    format: 'html',
    variant: 'default',
    showAuthor: true,
    clickAction: 'navigate'
  });
}

async function loadPets() {
  const petsGrid = document.getElementById('pets-grid');
  if (!petsGrid) {
    console.error("Pets grid container not found");
    return;
  }
  
  const loadPetsWithRetry = async () => {
    try {
      console.log("Fetching pets data from API service...");
      const pets = await fetchPets();
      if (pets && pets.length > 0) {
        renderPets(pets, 'pets-grid');
      } else {
        console.log("No pets received, retrying in 5 seconds...");
        setTimeout(() => loadPetsWithRetry(), 5000);
      }
    } catch (error) {
      console.log("Failed to load pets, retrying in 5 seconds...", error);
      setTimeout(() => loadPetsWithRetry(), 5000);
    }
  };
  
  loadPetsWithRetry();
}

async function fetchAndRenderUsers() {
  const usersSection = document.getElementById('featured-users');
  if (!usersSection) {
    console.error("Featured users section not found in HTML");
    return;
  }
  
  // Keep trying to load users without timeout
  const loadUsersWithRetry = async () => {
    try {
      const userService = new UserService({ debug: true });
      const allUsers = await userService.getAllUsersWithAdoptions();
      
      const usersWithAdoptions = allUsers.filter(user => 
        user.adoption_count && user.adoption_count > 0
      );
      
      if (usersWithAdoptions.length > 0) {
        const shuffledUsers = [...usersWithAdoptions].sort(() => Math.random() - 0.5);
        
        const maxUsersPerRow = 4;
        const availableUsers = shuffledUsers.length;
        
        let usersToShow;
        if (availableUsers >= maxUsersPerRow * 2) {
          usersToShow = maxUsersPerRow * 2;
        } else if (availableUsers >= maxUsersPerRow) {
          usersToShow = maxUsersPerRow;
        } else {
          usersToShow = availableUsers;
        }
        
        const featuredUsers = shuffledUsers.slice(0, usersToShow);
        const usersGrid = usersSection.querySelector('.users-grid');
        if (usersGrid) {
          usersGrid.innerHTML = '';
          
          featuredUsers.forEach(user => {
            const userCard = window.CardRenderer.createUserCard(user, {
              format: 'element',
              variant: 'featured',
              showStats: true,
              clickAction: 'navigate'
            });
            
            // Mark as loaded card for smooth animation
            userCard.classList.add('loaded');
            usersGrid.appendChild(userCard);
          });
        }
        
        addEventListeners();
        
        if (window.languageManager) {
          window.languageManager.updateContent();
        }
      } else {
        console.log("No users with adoptions found, retrying in 5 seconds...");
        setTimeout(() => loadUsersWithRetry(), 5000);
      }
    } catch (error) {
      console.log("Failed to load users, retrying in 5 seconds...", error);
      setTimeout(() => loadUsersWithRetry(), 5000);
    }
  };
    loadUsersWithRetry();
}

function addEventListeners() {
  document.querySelectorAll('.view-user-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const userId = event.currentTarget.getAttribute('data-user-id');
      console.log(`Viewing user details for user ID: ${userId}`);
      window.location.href = `../profile/profile.html?id=${userId}`;
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
  initHomePage();
});