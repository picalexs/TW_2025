import languageManager from '../languages/language.js';
import { setupMobileMenu, createSlideshow, initializePageLanguage } from '../global/global.js';

document.addEventListener('DOMContentLoaded', function() {
  initLoginPage();
  setupMobileMenu();
  initializePageLanguage(); // Add this line to ensure language is properly initialized
  
  createSlideshow({
    containerSelector: '.login-slideshow',
    slideClass: 'login-slide',
    overlay: 'rgba(0, 0, 0, 0.6)'
  });
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
