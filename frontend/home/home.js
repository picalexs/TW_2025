import languageManager from '../js/language.js';

function initHomePage() {
  setupLanguageButtons();
  renderHeader();
  renderHeroSection();
  fetchAndRenderUsers();
  renderAboutSection();
  renderFooter();
  addEventListeners();
}

function setupLanguageButtons() {
  const enButton = document.getElementById('lang-en');
  const roButton = document.getElementById('lang-ro');
  
  if (!enButton || !roButton) {
    console.error('Language buttons not found');
    return;
  }
  
  if (languageManager.currentLanguage === 'en') {
    enButton.classList.add('active');
  } else {
    roButton.classList.add('active');
  }
  
  enButton.addEventListener('click', async () => {
    console.log('English button clicked');
    enButton.classList.add('active');
    roButton.classList.remove('active');
    await languageManager.changeLanguage('en');
    console.log('Language changed to English');
  });
  
  roButton.addEventListener('click', async () => {
    console.log('Romanian button clicked');
    roButton.classList.add('active');
    enButton.classList.remove('active');
    await languageManager.changeLanguage('ro');
    console.log('Language changed to Romanian');
  });
}

function renderHeader() {
  const header = document.getElementById('main-header');
  if (!header) return;
  
  header.innerHTML = `
    <div class="header-container">
      <div class="logo">
        <h1>Pet Adoption Center</h1>
      </div>
      <ul class="nav-menu">
        <li class="nav-item"><a href="#" class="nav-link" data-page="home">Home</a></li>
        <li class="nav-item"><a href="#" class="nav-link" data-page="pets">Pets</a></li>
        <li class="nav-item"><a href="#" class="nav-link" data-page="about">About Us</a></li>
      </ul>
      <div class="auth-buttons">
        <a href="#" class="btn btn-outline" data-page="login">Login</a>
        <a href="#" class="btn btn-primary" data-page="signup">Sign Up</a>
      </div>
    </div>
  `;
}

function renderHeroSection() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;
  
  const heroSection = document.createElement('section');
  heroSection.className = 'hero';
  heroSection.innerHTML = `
    <div class="hero-content">
      <h1 class="hero-title">Find Your Perfect Companion</h1>
      <p class="hero-subtitle">Adopt a pet and change both your lives forever</p>
      <a href="#" class="btn btn-primary" data-page="pets">Browse Pets</a>
    </div>
  `;
  contentContainer.appendChild(heroSection);
}

function renderAboutSection() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;
  
  const aboutSection = document.createElement('section');
  aboutSection.className = 'about';
  aboutSection.innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">About Our Center</h2>
        <p>We're dedicated to finding loving homes for pets in need</p>
      </div>
      <div class="about-content">
        <p>Our pet adoption center strives to connect animals with loving families. We believe every pet deserves a caring home.</p>
      </div>
    </div>
  `;
  contentContainer.appendChild(aboutSection);
}

function renderFooter() {
  const footer = document.getElementById('main-footer');
  if (!footer) return;
  
  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-section">
        <h3>Pet Adoption Center</h3>
        <p>Finding forever homes for pets in need</p>
      </div>
      <div class="footer-section">
        <h3>Links</h3>
        <ul class="footer-links">
          <li class="footer-link"><a href="#" data-page="home">Home</a></li>
          <li class="footer-link"><a href="#" data-page="pets">Pets</a></li>
          <li class="footer-link"><a href="#" data-page="about">About Us</a></li>
        </ul>
      </div>
    </div>
    <div class="copyright">
      <p>&copy; 2025 Pet Adoption Center. All rights reserved.</p>
    </div>
  `;
}

async function fetchAndRenderUsers() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;
  
  const usersSection = document.createElement('section');
  usersSection.className = 'featured-pets';
  
  try {
    const response = await fetch('http://localhost:3000/api/users');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const users = await response.json();
    
    usersSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">Featured Users</h2>
          <p>Meet some of our registered users</p>
        </div>
        <div class="pets-grid">
          ${users.map(user => `
            <div class="pet-card" data-user-id="${user.id}">
              <div class="pet-info">
                <h3 class="pet-name">${user.username}</h3>
                <p class="pet-description">${user.email}</p>
                <p>Joined: ${new Date(user.createdAt).toLocaleDateString()}</p>
                <div class="pet-tags">
                  <span class="tag">User</span>
                </div>
                <a href="#" class="btn btn-outline view-user-btn" data-user-id="${user.id}">View Profile</a>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="text-center" style="margin-top: 2rem; text-align: center;">
          <a href="#" class="btn btn-primary" data-page="users">View All Users</a>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error fetching users:', error);
    usersSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">Featured Users</h2>
          <p>Error loading users: ${error.message}</p>
        </div>
      </div>
    `;
  }
  
  contentContainer.appendChild(usersSection);
}

function addEventListeners() {
  document.querySelectorAll('[data-page]').forEach(element => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      const page = event.currentTarget.getAttribute('data-page');
      console.log(`Navigating to: ${page}`);
      window.loadPage(page);
    });
  });
  
  document.querySelectorAll('.view-user-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const userId = event.currentTarget.getAttribute('data-user-id');
      console.log(`Viewing user details for user ID: ${userId}`);
      window.loadPage(`user-details?id=${userId}`);
    });
  });
}


document.addEventListener('DOMContentLoaded', initHomePage);