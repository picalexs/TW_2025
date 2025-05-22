import languageManager from '../languages/language.js';

function setupLanguageDropdown() {
  const currentLangButton = document.querySelector('.language-current');
  const dropdownArrow = document.querySelector('.dropdown-arrow');
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

      if (languageManager) {
        languageManager.changeLanguage(lang);
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
    
    if (!flagSpan || !textSpan) return;

    if (lang === 'en') {
      flagSpan.textContent = '🇬🇧';
      textSpan.textContent = 'EN';
    } else if (lang === 'ro') {
      flagSpan.textContent = '🇷🇴';
      textSpan.textContent = 'RO';
    }
  }
}

function setupMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const container = document.querySelector('.mobile-menu-container');
  const overlay = document.querySelector('.mobile-overlay');
  const options = document.querySelectorAll('.mobile-language-option');
  
  if (!toggle) {
    console.error("Mobile menu toggle button not found!");
    return;
  }
  
  if (!container) {
    console.error("Mobile menu container not found!");
    return;
  }
  
  if (!overlay) {
    console.error("Mobile overlay not found!");
    return;
  }

  const currentLang = localStorage.getItem('language') || 'en';
  setActiveMobileLanguage(currentLang);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Mobile menu toggle clicked!');
    
    toggle.classList.toggle('active');
    container.classList.toggle('active');
    overlay.classList.toggle('active');
    
    const isMenuOpen = container.classList.contains('active');
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    console.log("Menu is now:", isMenuOpen ? "OPEN" : "CLOSED");
    
    console.log("Menu toggle classes:", toggle.className);
    console.log("Menu container classes:", container.className);
    console.log("Overlay classes:", overlay.className);
  });

  overlay.addEventListener('click', () => {
    console.log('Overlay clicked - closing menu');
    toggle.classList.remove('active');
    container.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  });

  options.forEach(option => {
    const lang = option.getAttribute('data-lang');
    if (lang === currentLang) {
      option.classList.add('active');
    }

    option.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveMobileLanguage(lang);

      if (languageManager) {
        languageManager.changeLanguage(lang);
      } else {
        localStorage.setItem('language', lang);
        window.location.reload();
      }

      toggle.classList.remove('active');
      container.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
  
  function setActiveMobileLanguage(lang) {
    options.forEach(opt => opt.classList.remove('active'));
    const activeOption = document.querySelector(`.mobile-language-option[data-lang="${lang}"]`);
    if (activeOption) {
      activeOption.classList.add('active');
      console.log(`Active language set to: ${lang}`);
    } else {
      console.warn(`No language option found for: ${lang}`);
    }
  }
}

function createSlideshow(options = {}) {
  const defaults = {
    containerSelector: '.hero-slideshow, .login-slideshow',
    slideClass: 'hero-slide',
    images: [
      '../assets/hero-bg.jpg',
      '../assets/hero-bg1.jpg',  
      '../assets/hero-bg2.jpg',
      '../assets/hero-bg3.jpg',
      '../assets/hero-bg4.jpg',
      '../assets/hero-bg5.jpg',
      '../assets/hero-bg6.jpg',
      '../assets/hero-bg7.jpg'
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
    
    if (container.querySelectorAll(`.${settings.slideClass}`).length === 0) {
      const defaultSlide = document.createElement('div');
      defaultSlide.className = settings.slideClass + ' active';
      defaultSlide.style.backgroundImage = `linear-gradient(${settings.overlay}, ${settings.overlay}), url('${settings.images[0]}')`;
      container.appendChild(defaultSlide);
    }
    
    settings.images.forEach((imageUrl, index) => {
      if (index === 0 && container.querySelectorAll(`.${settings.slideClass}`).length > 0) {
        return;
      }
      
      const img = new Image();
      img.src = imageUrl;

      img.onload = () => {
        const slide = document.createElement('div');
        slide.className = settings.slideClass;
        slide.style.backgroundImage = `linear-gradient(${settings.overlay}, ${settings.overlay}), url('${imageUrl}')`;
        container.appendChild(slide);
        
        if (container.querySelectorAll(`.${settings.slideClass}`).length === 1) {
          slide.classList.add('active');
        }
      };
      img.onerror = () => {
        console.warn(`Could not load slide image: ${imageUrl}`);
      };
    });
    
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

function initSlideshow(options = {}) {
  console.log('Initializing slideshow with options:', options);
  const slideshowContainer = document.querySelector(options.containerSelector || '.hero-slideshow');
  
  if (!slideshowContainer) {
    console.warn('No slideshow container found with selector:', options.containerSelector || '.hero-slideshow');
    return;
  }
  
  const existingSlides = slideshowContainer.querySelectorAll('.hero-slide');
  existingSlides.forEach(slide => slide.remove());
  
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
  
  slideshowContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  
  const staticSlide = document.createElement('div');
  staticSlide.className = 'hero-slide initial active';
  staticSlide.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${slideImages[0]}')`;
  slideshowContainer.appendChild(staticSlide);
  
  const preloadedImages = [];
  const preloadPromises = slideImages.slice(1).map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        preloadedImages.push(src);
        resolve(src);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  });
  
  Promise.all(preloadPromises.slice(0, 2))
    .then(() => {
      console.log('First batch of images loaded for slideshow');
      preloadedImages.forEach(imgPath => {
        const slide = document.createElement('div');
        slide.className = 'hero-slide';
        slide.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${imgPath}')`;
        slideshowContainer.appendChild(slide);
      });
      
      setTimeout(() => {
        staticSlide.classList.remove('initial');
        let activeIndex = 0;
        const slides = slideshowContainer.querySelectorAll('.hero-slide');
        
        const intervalId = setInterval(() => {
          slides[activeIndex].classList.remove('active');
          activeIndex = (activeIndex + 1) % slides.length;
          slides[activeIndex].classList.add('active');
        }, 5000);
        
        window.addEventListener('beforeunload', () => clearInterval(intervalId));
      }, 100);
    })
    .catch(error => {
      console.error('Error in slideshow setup:', error);
    });
    
  Promise.all(preloadPromises)
    .then(() => console.log('All slideshow images loaded'))
    .catch(err => console.warn('Some slideshow images failed to load:', err));
}

function initializePageLanguage() {
  if (document.body.classList.contains('language-initialized')) {
    return;
  }
  document.body.classList.add('language-initialized');
  
  const currentPath = window.location.pathname;
  const pageName = currentPath.split('/').pop().replace('.html', '');
  console.log(`Initializing language for page: ${pageName}`);
  
  if (languageManager) {
    languageManager.updateContent();
  } else {
    console.warn('Language manager not available');
  }
}

function initBasicFunctionality() {
  console.log("Initializing basic functionality");
  
  if (document.querySelector('[data-component]')) {
    console.log("Components detected, waiting for components to load");
    document.addEventListener('componentsLoaded', () => {
      console.log("Components loaded, now setting up language and menu");
      setupLanguageDropdown();
      setupMobileMenu();
      initSlideshow();
    });
  } else {
    setupLanguageDropdown();
    setupMobileMenu();
    initSlideshow();
  }
  
  console.log("Basic initialization complete");
}

document.addEventListener('DOMContentLoaded', () => {
  const navbarContainer = document.getElementById('global-navbar');
  const footerContainer = document.getElementById('global-footer');

  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('/login/');
  const isSignupPage = currentPath.includes('/signup/');
  
  if (isLoginPage) {
    document.body.setAttribute('data-page', 'loginPage');
  } else if (isSignupPage) {
    document.body.setAttribute('data-page', 'signupPage');
  }

  if (document.querySelector('[data-component="header"]') || document.querySelector('[data-component="footer"]')) {
    initBasicFunctionality();
  }

  if (navbarContainer || footerContainer) {
    fetch('../global/global.html')
      .then(res => res.text())
      .then(html => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const header = tempDiv.querySelector('header');
        const footer = tempDiv.querySelector('footer');

        if (header && navbarContainer) {
          navbarContainer.appendChild(header);
        }

        if (footer && footerContainer) {
          footerContainer.appendChild(footer);
        }

        initBasicFunctionality();
        
        if (languageManager) {
          languageManager.updateContent();
        }
      })
      .catch(err => console.error('Error loading header/footer:', err));
  }
});

export { setupLanguageDropdown, setupMobileMenu, initSlideshow, createSlideshow, initializePageLanguage };
