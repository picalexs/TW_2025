import { fetchPets, renderPets, showPetLoadError } from './pets.js';
import { initSlideshow } from '../global/global.js';

function initHomePage() {
  fetchAndRenderUsers();
  addEventListeners();
  loadPets();
  
  initSlideshow({
    containerSelector: '.hero-slideshow',
    images: [
      '../assets/hero-bg1.jpg',  
      '../assets/hero-bg2.jpg',
      '../assets/hero-bg3.jpg',
      '../assets/hero-bg4.jpg',
      '../assets/hero-bg5.jpg'
    ]
  });
}

async function loadPets() {
  try {
    const pets = await fetchPets();
    renderPets(pets);
  } catch (error) {
    showPetLoadError(error);
  }
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
          <h2 class="section-title" data-i18n="featuredUsers.title">Featured Users</h2>
          <p data-i18n="featuredUsers.subtitle">Meet some of our registered users</p>
        </div>
        <div class="pets-grid">
          ${users.map(user => `
            <div class="pet-card" data-user-id="${user.id}">
              <div class="pet-info">
                <h3 class="pet-name">${user.username}</h3>
                <p class="pet-description">${user.email}</p>
                <p><span data-i18n="featuredUsers.joined">Joined</span>: ${new Date(user.createdAt).toLocaleDateString()}</p>
                <div class="pet-tags">
                  <span class="tag">User</span>
                </div>
                <a href="#" class="btn btn-outline view-user-btn" data-user-id="${user.id}" data-i18n="featuredUsers.viewProfile">View Profile</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error fetching users:', error);
    usersSection.innerHTML = `
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title" data-i18n="featuredUsers.title">Featured Users</h2>
          <p>Error loading users: ${error.message}</p>
        </div>
      </div>
    `;
  }
  
  const heroSection = document.querySelector('.hero');
  if (heroSection && heroSection.nextElementSibling) {
    contentContainer.insertBefore(usersSection, heroSection.nextElementSibling);
  } else {
    contentContainer.appendChild(usersSection);
  }
  
  if (window.languageManager) {
    window.languageManager.updateContent();
  }
}

function addEventListeners() {
  document.querySelectorAll('.view-user-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const userId = event.currentTarget.getAttribute('data-user-id');
      console.log(`Viewing user details for user ID: ${userId}`);
    });
  });
}

document.addEventListener('DOMContentLoaded', initHomePage);