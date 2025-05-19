import languageManager from '../languages/language.js';
import { setupMobileMenu, initSlideshow } from '../global.js';

document.addEventListener('DOMContentLoaded', function() {
  initLoginPage();
  setupLanguageDropdown();
  setupMobileMenu();
  
  initSlideshow({
    containerSelector: '.login-slideshow',
    slideClass: 'login-slide',
    overlay: 'rgba(0, 0, 0, 0.6)'
  });
});

function initLoginPage() {
  const elements = {
    'h2': 'login.title',
    'label[for="email"]': 'login.email',
    'label[for="password"]': 'login.password',
    '.form-options label': 'login.rememberMe',
    '.btn-submit': 'login.loginButton',
    '.redirect-link': 'login.noAccount'
  };

  for (const [selector, key] of Object.entries(elements)) {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute('data-i18n', key);
    }
  }

  const registerLink = document.querySelector('.redirect-link a');
  if (registerLink) {
    registerLink.setAttribute('data-i18n', 'login.register');
  }

  languageManager.updateContent();

  const form = document.querySelector('.login-box');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
  
  document.body.classList.add('login-page');
}

function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.querySelector('.form-options input[type="checkbox"]').checked;
  
  console.log('Login attempt:', { email, password: '****', rememberMe });
  
  // TODO: Add actual login API call when backend is ready
  // For now just simulate a login
  setTimeout(() => {
    // Redirect to home page after "login"
    window.location.href = '../home/home.html';
  }, 1000);
}

function setupLanguageDropdown() {
  const languageOptions = document.querySelectorAll('.language-option');
  const currentLangButton = document.querySelector('.language-current');
  
  if (!languageOptions.length || !currentLangButton) return;
  
  const currentLang = localStorage.getItem('language') || 'en';
  updateCurrentLanguageUI(currentLang);
  
  languageOptions.forEach(option => {
    const lang = option.getAttribute('data-lang');
    
    if (lang === currentLang) {
      option.classList.add('active');
    }
    
    option.addEventListener('click', (e) => {
      e.preventDefault();
      
      languageOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      updateCurrentLanguageUI(lang);
      languageManager.changeLanguage(lang);
    });
  });
}

function updateCurrentLanguageUI(lang) {
  const currentLangButton = document.querySelector('.language-current');
  if (!currentLangButton) return;
  
  const flagSpan = currentLangButton.querySelector('.flag-icon');
  const textSpan = currentLangButton.querySelector('span:not(.flag-icon):not(.dropdown-arrow)');
  
  if (lang === 'en') {
    flagSpan.textContent = 'GB';
    flagSpan.className = 'flag-icon flag-en';
    textSpan.textContent = 'EN';
  } else if (lang === 'ro') {
    flagSpan.textContent = 'RO';
    flagSpan.className = 'flag-icon flag-ro';
    textSpan.textContent = 'RO';
  }
}

// Add mobile menu setup function
function setupMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenuContainer = document.querySelector('.mobile-menu-container');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  
  if (!mobileMenuToggle || !mobileMenuContainer || !mobileOverlay) return;
  
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenuToggle.classList.toggle('active');
    mobileMenuContainer.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
    document.body.style.overflow = mobileMenuContainer.classList.contains('active') ? 'hidden' : '';
  });
  
  mobileOverlay.addEventListener('click', () => {
    mobileMenuToggle.classList.remove('active');
    mobileMenuContainer.classList.remove('active');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
}
