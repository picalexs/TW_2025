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
  const cardsPerSlide = getCardsPerSlide();
  const slides = createSlides(testimonials, cardsPerSlide);
  const totalSlides = slides.length;
  
  return `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title" data-i18n="testimonials.title">What Our Community Says</h2>
        <p data-i18n="testimonials.subtitle">Real stories from pet adopters and shelter partners</p>
      </div>
      <div class="testimonials-carousel" data-total-slides="${totalSlides}">
        ${totalSlides > 1 ? `
          <button class="carousel-arrow carousel-prev" aria-label="Previous testimonials">
            &lt;
          </button>
          <button class="carousel-arrow carousel-next" aria-label="Next testimonials">
            &gt;
          </button>
        ` : ''}
        <div class="testimonials-carousel-wrapper">
          <div class="testimonials-track">
            ${slides.map(slide => `
              <div class="testimonials-grid">
                ${slide.map(testimonial => createTestimonialHTML(testimonial)).join('')}
              </div>
            `).join('')}
          </div>
        </div>
        ${totalSlides > 1 ? `
          <div class="carousel-indicators">
            ${Array.from({ length: totalSlides }, (_, i) => 
              `<button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
            ).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
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
  const width = window.innerWidth;
  if (width <= 768) return 1;
  if (width <= 1024) return 2;
  return 3;
}

function createSlides(testimonials, cardsPerSlide) {
  const slides = [];
  for (let i = 0; i < testimonials.length; i += cardsPerSlide) {
    slides.push(testimonials.slice(i, i + cardsPerSlide));
  }
  return slides;
}

let currentSlide = 0;
let totalSlides = 0;
let carouselTrack = null;
let touchStartX = 0;
let touchEndX = 0;
let isDragging = false;
let startX = 0;
let currentX = 0;

function initTestimonialsCarousel() {
  const carousel = document.querySelector('.testimonials-carousel');
  if (!carousel) return;
  
  carouselTrack = carousel.querySelector('.testimonials-track');
  totalSlides = parseInt(carousel.dataset.totalSlides) || 0;
  
  if (totalSlides <= 1) return;
  
  const prevBtn = carousel.querySelector('.carousel-prev');
  const nextBtn = carousel.querySelector('.carousel-next');
  const indicators = carousel.querySelectorAll('.carousel-indicator');
  
  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
  
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => goToSlide(index));
  });

  carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
  carousel.addEventListener('touchmove', handleTouchMove, { passive: false });
  carousel.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  carousel.addEventListener('mousedown', handleMouseDown);
  carousel.addEventListener('mousemove', handleMouseMove);
  carousel.addEventListener('mouseup', handleMouseUp);
  carousel.addEventListener('mouseleave', handleMouseUp);
  
  carousel.addEventListener('keydown', handleKeydown);
  carousel.setAttribute('tabindex', '0');
  
  window.addEventListener('resize', debounce(handleResize, 250));
  
  updateCarousel();
}

function goToSlide(slideIndex) {
  if (slideIndex < 0) {
    currentSlide = totalSlides - 1;
  } else if (slideIndex >= totalSlides) {
    currentSlide = 0;
  } else {
    currentSlide = slideIndex;
  }
  updateCarousel();
}

function updateCarousel() {
  if (!carouselTrack || totalSlides <= 1) return;
  
  const slideWidth = 100;
  const gapInPercent = calculateGapAsPercentage();
  
  const translateX = -currentSlide * (slideWidth + gapInPercent);
  carouselTrack.style.transform = `translateX(${translateX}%)`;
  
  const indicators = document.querySelectorAll('.carousel-indicator');
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle('active', index === currentSlide);
  });
  
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  
  if (prevBtn && nextBtn) {
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }
}

function calculateGapAsPercentage() {
  const container = document.querySelector('.testimonials-carousel-wrapper');
  if (!container) return 0;
  
  const containerWidth = container.offsetWidth;
  const remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const gapInPixels = 2 * remInPixels;
  
  return (gapInPixels / containerWidth) * 100;
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  isDragging = true;
}

function handleTouchMove(e) {
  if (!isDragging) return;
  
  currentX = e.changedTouches[0].screenX;
  const diff = Math.abs(currentX - touchStartX);
  
  if (diff > 10) {
    e.preventDefault();
  }
}

function handleTouchEnd(e) {
  if (!isDragging) return;
  
  touchEndX = e.changedTouches[0].screenX;
  isDragging = false;
  handleSwipe();
}

function handleMouseDown(e) {
  if (e.button !== 0) return;
  
  startX = e.clientX;
  isDragging = true;
  e.preventDefault();
}

function handleMouseMove(e) {
  if (!isDragging) return;
  
  currentX = e.clientX;
  e.preventDefault();
}

function handleMouseUp(e) {
  if (!isDragging) return;
  
  const endX = e.clientX || currentX;
  isDragging = false;
  
  touchStartX = startX;
  touchEndX = endX;
  handleSwipe();
}

function handleSwipe() {
  const swipeThreshold = 50;
  const swipeDistance = touchEndX - touchStartX;
  
  if (Math.abs(swipeDistance) > swipeThreshold) {
    if (swipeDistance > 0) {
      goToSlide(currentSlide - 1);
    } else {
      goToSlide(currentSlide + 1);
    }
  }
}

function handleKeydown(e) {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      goToSlide(currentSlide - 1);
      break;
    case 'ArrowRight':
      e.preventDefault();
      goToSlide(currentSlide + 1);
      break;
    case 'Home':
      e.preventDefault();
      goToSlide(0);
      break;
    case 'End':
      e.preventDefault();
      goToSlide(totalSlides - 1);
      break;
  }
}

function handleResize() {
  const testimonialsSection = document.getElementById('testimonials');
  if (!testimonialsSection) return;
  
  const carousel = testimonialsSection.querySelector('.testimonials-carousel');
  if (!carousel || totalSlides <= 1) return;
  
  const newCardsPerSlide = getCardsPerSlide();
  
  const testimonialsGrid = carousel.querySelector('.testimonials-grid');
  if (!testimonialsGrid) return;
  
  const currentCardsPerSlide = testimonialsGrid.children.length;
  
  if (newCardsPerSlide !== currentCardsPerSlide) {
    const cachedTestimonials = window.currentTestimonials;
    if (!cachedTestimonials || cachedTestimonials.length === 0) return;
    
    const newSlides = createSlides(cachedTestimonials, newCardsPerSlide);
    const newTotalSlides = newSlides.length;
    
    if (currentSlide >= newTotalSlides) {
      currentSlide = 0;
    }
    
    totalSlides = newTotalSlides;
    carousel.setAttribute('data-total-slides', totalSlides);
    
    const track = carousel.querySelector('.testimonials-track');
    if (track) {
      track.innerHTML = newSlides.map(slide => `
        <div class="testimonials-grid">
          ${slide.map(testimonial => createTestimonialHTML(testimonial)).join('')}
        </div>
      `).join('');
    }
    
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    if (indicatorsContainer && totalSlides > 1) {
      indicatorsContainer.innerHTML = Array.from({ length: totalSlides }, (_, i) => 
        `<button class="carousel-indicator ${i === currentSlide ? 'active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
      ).join('');
      
      indicatorsContainer.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
        indicator.addEventListener('click', () => goToSlide(index));
      });
    }
    
    carouselTrack = track;
    updateCarousel();
    
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    
    if (prevBtn) {
      prevBtn.replaceWith(prevBtn.cloneNode(true));
      carousel.querySelector('.carousel-prev').addEventListener('click', () => goToSlide(currentSlide - 1));
    }
    if (nextBtn) {
      nextBtn.replaceWith(nextBtn.cloneNode(true));  
      carousel.querySelector('.carousel-next').addEventListener('click', () => goToSlide(currentSlide + 1));
    }
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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
  const hasHalfStar = (numRating % 1) >= 0.25;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHTML = '';
  
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<span class="star star-full">★</span>';
  }
  
  if (hasHalfStar) {
    starsHTML += '<span class="star star-half"><span class="star-half-fill">★</span><span class="star-half-empty">★</span></span>';
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