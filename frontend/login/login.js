import languageManager from '../languages/language.js';
import { setupMobileMenu } from '../global/global.js';

document.addEventListener('DOMContentLoaded', function() {
  initLoginPage();
  setupMobileMenu();
  
  import('../global/global.js')
    .then(module => {
      if (module.initSlideshow) {
        module.initSlideshow({
          containerSelector: '.login-slideshow',
          slideClass: 'login-slide',
          overlay: 'rgba(0, 0, 0, 0.6)'
        });
      }
    })
    .catch(err => console.warn('Could not load slideshow:', err));
});

function initLoginPage() {
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
