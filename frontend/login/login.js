import languageManager from '../languages/language.js';
import { setupMobileMenu, createSlideshow, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../global/global.min.js';
import UserService from '../services/userService.js';

const API_BASE_URL = window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', function() {
  initLoginPage();
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  
  createSlideshow({
    containerSelector: '.login-slideshow',
    slideClass: 'login-slide',
    overlay: 'rgba(0, 0, 0, 0.6)'
  });
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('registered')) {
    showMessage('Registration successful! Please log in with your credentials.');
  }
});

function initLoginPage() {
  const form = document.querySelector('.login-box');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
  
  document.body.classList.add('login-page');
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  //const rememberMe = document.querySelector('.form-options input[type="checkbox"]').checked;
  
  console.log('Login attempt:', { email, password: '****'});

   try {
      const userService = new UserService({ baseURL: API_BASE_URL });
      const response = await userService.login(email, password);

    if (response.success) {
      localStorage.setItem('isLoggedIn', 'true');      
      showMessage('Login successful! Redirecting...', 'success');
      window.location.href = '../home/home.html';
    } else {
      showMessage(`Login failed: ${response.message || 'Invalid credentials.'}`, 'error');
    }
  } catch (error) {
    console.error("Error during login API call:", error);
    showMessage(`Login failed: ${error.message || 'An unexpected error occurred.'}`, 'error');
  }
}

function showMessage(message, type = 'info') {
  const messageArea = document.getElementById('loginMessageArea');
  if (messageArea) {
    messageArea.textContent = message;
    messageArea.className = `message ${type}`; 
    messageArea.style.display = 'block';
    setTimeout(() => {
      messageArea.style.display = 'none';
    }, 5000);
  } else {
    alert(message);
  }
}