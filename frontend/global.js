export function setupLanguageDropdown() {
  const currentLangButton = document.querySelector('.language-current');
  const dropdownArrow = document.querySelector('.dropdown-arrow');
  const languageOptions = document.querySelectorAll('.language-option');
  
  if (!currentLangButton || !languageOptions.length) return;
  
  const currentLang = localStorage.getItem('language') || 'en';
  updateCurrentLanguage(currentLang);
  
  languageOptions.forEach(option => {
    const lang = option.getAttribute('data-lang');
    if (lang === currentLang) {
      option.classList.add('active');
    }
    
    option.addEventListener('click', (e) => {
      e.preventDefault();
    
      updateCurrentLanguage(lang);
      
      languageOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      if (typeof languageManager !== 'undefined') {
        languageManager.changeLanguage(lang);
      } else {
        localStorage.setItem('language', lang);
        window.location.reload();
      }
    });
  });
  
  function updateCurrentLanguage(lang) {
    const flagSpan = currentLangButton.querySelector('.flag-icon');
    const textSpan = currentLangButton.querySelector('span:not(.flag-icon):not(.dropdown-arrow)');
    
    if (lang === 'en') {
      flagSpan.textContent = '🇬🇧';
      flagSpan.className = 'flag-icon flag-en';
      textSpan.textContent = 'EN';
    } else if (lang === 'ro') {
      flagSpan.textContent = '🇷🇴';
      flagSpan.className = 'flag-icon flag-ro';
      textSpan.textContent = 'RO';
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

// Initialize when DOM is loaded
function initBasicFunctionality() {
  console.log("Initializing basic functionality");
  setupLanguageDropdown();
  setupMobileMenu();
  console.log("Initialization complete");
}

document.addEventListener('DOMContentLoaded', initBasicFunctionality);  