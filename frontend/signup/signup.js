import { setupMobileMenu, initializePageLanguage } from '../global/global.min.js';

document.addEventListener('DOMContentLoaded', function () {
  initSignupPage();
  setupMobileMenu();
  initializePageLanguage();

  // Google login button logic
  const googleLoginButton = document.querySelector('.btn-google-login');
  if (googleLoginButton) {
    googleLoginButton.addEventListener('click', () => {
      const clientId = '197013963962-ef5d59pddh6qounv5iph66cjorr97s5f.apps.googleusercontent.com';
      const redirectUri = 'http://localhost:8080/api/auth/google/callback';
      const scope = 'openid profile email';
      const responseType = 'code';
      const accessType = 'offline';
      const prompt = 'select_account';
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&access_type=${accessType}&prompt=${prompt}`;
      window.location.href = googleAuthUrl;
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
  }
  try {
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
      alert(data.message || data.error || 'Signup failed.');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    alert('An error occurred during signup. Please try again.');
  }
}
