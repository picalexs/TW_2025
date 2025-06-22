import { setupMobileMenu, createSlideshow, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../global/global.min.js';
import UserService from '../services/userService.min.js';
import ApiService from '../services/api.min.js';

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
  if (urlParams.has('message')) {
    showMessage(urlParams.get('message'), 'info');
  }
  if (urlParams.has('error')) {
    const error = urlParams.get('error');
    if (error === 'auth_failed') {
      showMessage('Authentication failed. Please try again.', 'error');
    }
  }

  const googleLoginButton = document.getElementById('google-login-button');
  const apiService = new ApiService();
    if (googleLoginButton) { 
    googleLoginButton.addEventListener('click', async () => {
      try {
        const config = await apiService.get('/api/config');
        
        const clientId = config.googleAuth?.clientId; 
        const redirectUri = config.googleAuth?.redirectUri;
        if (!clientId || !redirectUri) {
          showMessage('Google login is not configured. Please contact support.', 'error');
          return;
        }
        const scope = 'openid profile email';
        const responseType = 'code';
        const accessType = 'offline';
        const prompt = 'select_account';

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&access_type=${accessType}&prompt=${prompt}`;

        window.location.href = googleAuthUrl;      
      } catch (error) {
        console.error('Error getting Google auth config:', error);

        const scope = 'openid profile email';
        const responseType = 'code';
        const accessType = 'offline';
        const prompt = 'select_account';

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&access_type=${accessType}&prompt=${prompt}`;

        window.location.href = googleAuthUrl;
      }
    });
  } else {
    console.warn("Google Login button not found with ID 'google-login-button'.");
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
  
  console.log('Login attempt:', { email, password: '****'});

   try {
      const userService = new UserService({ baseURL: API_BASE_URL });
      const response = await userService.login(email, password);

    if (response && response.user) {
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole', data.user.role);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userData', JSON.stringify(response.user));
      localStorage.setItem('userId', response.user.id.toString());
      localStorage.setItem('currentUserId', response.user.id.toString());

      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
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