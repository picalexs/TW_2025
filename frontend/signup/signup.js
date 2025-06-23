import { setupMobileMenu, initializePageLanguage } from '../global/global.min.js';

document.addEventListener('DOMContentLoaded', function () {
  initSignupPage();
  setupMobileMenu();
  initializePageLanguage();

  const googleLoginButton = document.querySelector('.btn-google-login');
  if (googleLoginButton) {
    googleLoginButton.addEventListener('click', async () => {
      try {
        const apiBaseUrl = window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080';
        const configResponse = await fetch(`${apiBaseUrl}/api/config`);
        const config = await configResponse.json();
        
        const clientId = config.googleAuth.clientId;
        const redirectUri = config.googleAuth.redirectUri;
        const scope = 'openid profile email';
        const responseType = 'code';
        const accessType = 'offline';
        const prompt = 'select_account';
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&access_type=${accessType}&prompt=${prompt}`;
        window.location.href = googleAuthUrl;
      } catch (error) {
        console.error('Error loading Google Auth config:', error);
        alert('Google login is currently unavailable. Please try again later.');
      }
    });
  }
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
  }  try {
    const apiBaseUrl = window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080';
    const response = await fetch(`${apiBaseUrl}/api/users/register`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
    } else {
      alert('This email or username is already in use.');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    alert('An error occurred during signup. Please try again.');
  }
}
