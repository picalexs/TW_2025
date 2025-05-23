import { setupMobileMenu, initializePageLanguage } from '../global/global.js';
import UserService from '../services/userService.js';

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

async function handleSignup(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value;
  
  if (!email || !password || !username) {
    alert('Please fill in all fields');
    return;
  }
  
  console.log('Signup attempt:', { email, username, password: '****' });
  
  // TODO: Add actual signup API call when backend is ready
  // For now just simulate a signup
  setTimeout(() => {
    // Redirect to home page after "signup"
    window.location.href = '../home/home.html';
  }, 1000);
}
