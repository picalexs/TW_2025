export function setupLanguageDropdown() {
  const currentLangButton = document.querySelector('.language-current');
  const languageOptions = document.querySelectorAll('.language-option');
  
  if (!currentLangButton || !languageOptions.length) {
    console.warn('Language dropdown elements not found');
    return;
  }
  
  console.log('Setting up language dropdown with options:', languageOptions.length);
  
  const currentLang = localStorage.getItem('language') || 'en';
  updateCurrentLanguage(currentLang);
  
  languageOptions.forEach(option => {
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);
    
    const lang = newOption.getAttribute('data-lang');
    if (lang === currentLang) {
      newOption.classList.add('active');
    }
    
    newOption.addEventListener('click', (e) => {
      e.preventDefault();
      console.log(`Language option clicked: ${lang}`);
      
      updateCurrentLanguage(lang);
      
      document.querySelectorAll('.language-option').forEach(opt => {
        opt.classList.remove('active');
      });
      newOption.classList.add('active');
      
      if (window.languageManager) {
        window.languageManager.changeLanguage(lang);
      } else {
        console.warn('languageManager not found, falling back to localStorage');
        localStorage.setItem('language', lang);
        window.location.reload();
      }
    });
  });
  
  function updateCurrentLanguage(lang) {
    const flagSpan = currentLangButton.querySelector('.flag-icon');
    const textSpan = currentLangButton.querySelector('span:not(.flag-icon):not(.dropdown-arrow)');
    
    console.log(`Updating language UI to ${lang}`);
    
    if (lang === 'en') {
      flagSpan.textContent = '🇬🇧';
      flagSpan.className = 'flag-icon flag-en';
      textSpan.textContent = '';
    } else if (lang === 'ro') {
      flagSpan.textContent = '🇷🇴';
      flagSpan.className = 'flag-icon flag-ro';
      textSpan.textContent = '';
    }
  }
}

export function setupMobileMenu() {
  console.log("Setting up mobile menu");
  
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenuContainer = document.querySelector('.mobile-menu-container');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  const mobileLanguageOptions = document.querySelectorAll('.mobile-language-option');
  
  if (!mobileMenuToggle) {
    console.error("Mobile menu toggle button not found!");
    return;
  }
  
  if (!mobileMenuContainer) {
    console.error("Mobile menu container not found!");
    return;
  }
  
  if (!mobileOverlay) {
    console.error("Mobile overlay not found!");
    return;
  }
  const currentLang = localStorage.getItem('language') || 'en';
  console.log("Current language:", currentLang);

  
  setActiveMobileLanguage(currentLang);
  
  // Toggle mobile menu on hamburger click - KEEP ONLY THIS ONE
  mobileMenuToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop event bubbling
    console.log('Mobile menu toggle clicked!'); // Enhanced log
    
    // Toggle active classes
    mobileMenuToggle.classList.toggle('active');
    mobileMenuContainer.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
    
    // Toggle body scroll
    const isMenuOpen = mobileMenuContainer.classList.contains('active');
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    console.log("Menu is now:", isMenuOpen ? "OPEN" : "CLOSED");
    
    // Log the menu's current state
    console.log("Menu toggle classes:", mobileMenuToggle.className);
    console.log("Menu container classes:", mobileMenuContainer.className);
    console.log("Overlay classes:", mobileOverlay.className);
  });
  
  // Close mobile menu on overlay click
  mobileOverlay.addEventListener('click', () => {
    console.log('Overlay clicked - closing menu');
    mobileMenuToggle.classList.remove('active');
    mobileMenuContainer.classList.remove('active');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
  
  // Language switching in mobile menu
  mobileLanguageOptions.forEach(option => {
    const lang = option.getAttribute('data-lang');
    
    if (lang === currentLang) {
      option.classList.add('active');
    }
    
    option.addEventListener('click', (e) => {
      e.preventDefault();
      console.log(`Language option clicked: ${lang}`);
      
      setActiveMobileLanguage(lang);
      
      if (typeof languageManager !== 'undefined') {
        languageManager.changeLanguage(lang);
      } else {
        localStorage.setItem('language', lang);
        window.location.reload();
      }
      
      mobileMenuToggle.classList.remove('active');
      mobileMenuContainer.classList.remove('active');
      mobileOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
  
  function setActiveMobileLanguage(lang) {
    mobileLanguageOptions.forEach(opt => opt.classList.remove('active'));
    const activeOption = document.querySelector(`.mobile-language-option[data-lang="${lang}"]`);
    if (activeOption) {
      activeOption.classList.add('active');
      console.log(`Active language set to: ${lang}`);
    } else {
      console.warn(`No language option found for: ${lang}`);
    }
  }
}

export function initSlideshow(options = {}) {
  const defaults = {
    containerSelector: '.hero-slideshow, .login-slideshow',
    slideClass: 'hero-slide',
    images: [
      '../assets/hero-bg.jpg',
      '../assets/hero-bg2.jpg',
      '../assets/hero-bg3.jpg', 
      '../assets/hero-bg4.jpg',
      '../assets/hero-bg5.jpg'
    ],
    interval: 5000,
    overlay: 'rgba(0, 0, 0, 0.5)'
  };
  
  const settings = { ...defaults, ...options };
  
  const slideshowContainers = document.querySelectorAll(settings.containerSelector);
  if (!slideshowContainers.length) {
    console.warn(`No slideshow containers found with selector: ${settings.containerSelector}`);
    return;
  }
  
  slideshowContainers.forEach(container => {
    console.log(`Setting up slideshow for container:`, container);
    
    // Clear existing slides
    container.querySelectorAll(`.${settings.slideClass}`).forEach(slide => slide.remove());
    
    // Load new slides
    settings.images.forEach(imageUrl => {
      const img = new Image();
      img.src = imageUrl;

      img.onload = () => {
        const slide = document.createElement('div');
        slide.className = settings.slideClass;
        slide.style.backgroundImage = `linear-gradient(${settings.overlay}, ${settings.overlay}), url('${imageUrl}')`;
        container.appendChild(slide);
        
        // Activate first slide
        if (container.querySelectorAll(`.${settings.slideClass}`).length === 1) {
          slide.classList.add('active');
        }
      };
      img.onerror = () => {
        console.warn(`Could not load slide image: ${imageUrl}`);
      };
    });
    
    // Setup rotation
    let currentSlide = 0;
    const rotateSlides = () => {
      const slides = container.querySelectorAll(`.${settings.slideClass}`);
      if (slides.length <= 1) return;
      
      slides.forEach(slide => slide.classList.remove('active'));
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    };
    
    setInterval(rotateSlides, settings.interval);
  });
}

// Initialize when DOM is loaded
function initBasicFunctionality() {
  console.log("Initializing basic functionality");
  
  // Check if we're using component loader
  if (document.querySelector('[data-component]')) {
    console.log("Components detected, waiting for components to load");
    document.addEventListener('componentsLoaded', () => {
      console.log("Components loaded, now setting up language and menu");
      setupLanguageDropdown();
      setupMobileMenu();
    });
  } else {
    // Direct initialization for pages without components
    setupLanguageDropdown();
    setupMobileMenu();
  }
  
  console.log("Basic initialization complete");
}

document.addEventListener('DOMContentLoaded', initBasicFunctionality);