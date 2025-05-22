import { setupMobileMenu, initializePageLanguage } from '../global/global.js';

document.addEventListener('DOMContentLoaded', function() {
  initSignupPage();
  setupMobileMenu();
  initializePageLanguage();
});

function initSignupPage() {
  const form = document.querySelector('.signup-box');
  if (form) {
    form.addEventListener('submit', handleSignup);
  }
  
  document.body.classList.add('signup-page');
}

function handleSignup(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value;
  
  console.log('Signup attempt:', { email, username, password: '****' });
  
  // TODO: Add actual signup API call when backend is ready
  // For now just simulate a signup
  setTimeout(() => {
    // Redirect to home page after "signup"
    window.location.href = '../home/home.html';
  }, 1000);
}
