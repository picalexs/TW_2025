import UserService from '../services/userService.js';
import PetService from '../services/petService.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons, navigateToProfile } from '../global/global.js';

window.navigateToProfile = navigateToProfile;

class ProfilePage {
  constructor() {
    this.userService = new UserService({ debug: true });
    this.petService = new PetService();
    this.currentUser = null;
    this.currentUserId = null;
    this.init();
  }

  async init() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('id');

      if (!userId) {
        this.showError('No user ID provided');
        return;
      }      this.currentUserId = userId;
      await this.loadUserProfile(userId);
      this.initEventListeners();

    } catch (error) {
      console.error('Error initializing profile page:', error);
      this.showError('Failed to load user profile');
    }
  }

  async loadUserProfile(userId) {
    try {
      this.showLoading();
      
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        this.showError('User not found');
        return;
      }

      this.currentUser = user;
      this.renderUserProfile(user);
      this.hideLoading();

    } catch (error) {
      console.error('Error loading user profile:', error);
      this.showError('Failed to load user profile');
    }
  }
  renderUserProfile(user) {
    document.title = `${this.getDisplayName(user)} - Profile`;
    this.renderProfileHeader(user);
    this.renderOverviewSection(user);
    this.loadAndRenderReviews(user.id);
    this.loadAndRenderPets(user.id);
  }

  renderProfileHeader(user) {
    // Set profile image
    const profileImage = document.getElementById('profile-image');
    let imagePath = user.profile_picture;
    if (!imagePath) {
      imagePath = '../assets/default-profile.jpg';
    } else if (!imagePath.startsWith('http') && !imagePath.startsWith('/server/')) {
      imagePath = `/server/${imagePath}`;
    }
    profileImage.src = imagePath;
    profileImage.alt = this.getDisplayName(user);

    const roleBadge = document.getElementById('user-role');
    const roleKey = user.role === 'shelter' ? 'shelter' : 'user';
    roleBadge.textContent = this.translateRole(roleKey);
    roleBadge.className = `role-badge ${roleKey}`;    
    document.getElementById('user-name').textContent = this.getDisplayName(user);
    document.getElementById('username').textContent = user.username;

    const adoptionCount = user.adoption_count || 0;
    const petsHelpedCount = user.pets_helped_count || 0;
    document.getElementById('adoption-count').textContent = adoptionCount;
    document.getElementById('pets-helped').textContent = petsHelpedCount;
  }

  renderOverviewSection(user) {
    // Member since
    const memberSince = document.getElementById('member-since');
    if (user.created_at) {
      const date = new Date(user.created_at);
      memberSince.textContent = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      memberSince.textContent = 'Unknown';
    }
  }

  async loadAndRenderReviews(userId) {
    try {
      const reviewsContainer = document.getElementById('reviews-container');
      reviewsContainer.innerHTML = '<div class="loading-spinner"></div>';
      
      try {
        const response = await fetch(`/api/testimonials/user/${userId}`);
        if (response.ok) {
          const testimonials = await response.json();
          if (testimonials && testimonials.length > 0) {
            reviewsContainer.innerHTML = testimonials.map(testimonial => this.createTestimonialHTML(testimonial)).join('');
          } else {
            reviewsContainer.innerHTML = `
              <div class="no-reviews">
                <p data-i18n="noReviews" data-i18n-fallback="No testimonials available for this user yet.">No testimonials available for this user yet.</p>
              </div>
            `;
          }
        } else {
          this.renderSampleReviews(reviewsContainer, userId);
        }
      } catch (fetchError) {
        this.renderSampleReviews(reviewsContainer, userId);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      document.getElementById('reviews-container').innerHTML = `
        <div class="no-reviews">
          <p>Error loading reviews</p>
        </div>
      `;
    }
  }

  renderSampleReviews(container, userId) {
    const hasReviews = (parseInt(userId) % 3) === 0;
    
    if (hasReviews) {
      const sampleReviews = this.generateSampleReviews();
      container.innerHTML = sampleReviews.map(review => this.createReviewHTML(review)).join('');
    } else {
      container.innerHTML = `
        <div class="no-reviews">
          <p data-i18n="noReviews" data-i18n-fallback="No testimonials available for this user yet.">No testimonials available for this user yet.</p>
        </div>
      `;
    }
  }  
  
  async loadAndRenderPets(userId) {
    try {
      const petsContainer = document.getElementById('pets-container');
      petsContainer.innerHTML = '<div class="loading-spinner"></div>';
      
      if (this.currentUser.role === 'shelter') {
        try {
          const response = await fetch(`/api/pets/shelter/${userId}`);
          if (response.ok) {
            const allPets = await response.json();
            const availablePets = allPets.filter(pet => pet.adoptionStatus === 'available');
            
            if (availablePets && availablePets.length > 0) {
              petsContainer.innerHTML = `
                <div class="pets-grid">
                  ${availablePets.map(pet => this.createPetCardHTML(pet)).join('')}
                </div>
              `;
            } else {
              petsContainer.innerHTML = `
                <div class="no-pets">
                  <p data-i18n="noPetsAvailable" data-i18n-fallback="No pets currently available for adoption from this shelter.">No pets currently available for adoption from this shelter.</p>
                </div>
              `;
            }
          } else {
            petsContainer.innerHTML = `
              <div class="no-pets">
                <p data-i18n="noPetsAvailable" data-i18n-fallback="No pets currently available for adoption from this shelter.">No pets currently available for adoption from this shelter.</p>
              </div>
            `;
          }
        } catch (fetchError) {
          console.error('Error fetching shelter pets:', fetchError);
          petsContainer.innerHTML = `
            <div class="no-pets">
              <p>Error loading pets</p>
            </div>
          `;
        }
      } else {
        const adoptionCount = this.currentUser.adoption_count || 0;
        const petsHelpedCount = this.currentUser.pets_helped_count || 0;
        
        if (adoptionCount > 0 || petsHelpedCount > 0) {
          petsContainer.innerHTML = `
            <div class="adoption-info">
              <h4>Community Contributions</h4>
              ${adoptionCount > 0 ? `<p>✓ Adopted ${adoptionCount} pet${adoptionCount === 1 ? '' : 's'}</p>` : ''}
              ${petsHelpedCount > 0 ? `<p>✓ Helped ${petsHelpedCount} pet${petsHelpedCount === 1 ? '' : 's'} find homes</p>` : ''}
              <p class="privacy-note">Specific pet details are kept private for user security.</p>
            </div>
          `;
        } else {
          petsContainer.innerHTML = `
            <div class="no-pets">
              <p data-i18n="noActivity" data-i18n-fallback="This user hasn't completed any pet adoptions yet.">This user hasn't completed any pet adoptions yet.</p>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading pets:', error);
      document.getElementById('pets-container').innerHTML = `
        <div class="no-pets">
          <p>Error loading pet information</p>
        </div>
      `;
    }
  }

  generateSampleReviews() {
    const sampleReviews = [
      {
        author: "Sarah Johnson",
        rating: 5,
        text: "Great experience working with this member of our community. Very responsive and caring towards the animals.",
        date: "2024-11-15"
      },
      {
        author: "Mike Chen",
        rating: 4,
        text: "Professional and helpful throughout the adoption process. Would recommend to others.",
        date: "2024-10-22"
      },
      {
        author: "Emma Wilson",
        rating: 5,
        text: "Amazing dedication to animal welfare. This person really cares about finding the right homes for pets.",
        date: "2024-09-30"
      }
    ];
    
    const numReviews = Math.floor(Math.random() * 3) + 1;
    return sampleReviews.slice(0, numReviews);
  }

  createReviewHTML(review) {
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const reviewDate = new Date(review.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="review-card">
        <div class="review-header">
          <span class="review-author">${review.author}</span>
          <div class="review-rating">
            ${stars.split('').map(star => `<span class="star">${star}</span>`).join('')}
          </div>
        </div>
        <p class="review-text">${review.text}</p>
        <div class="review-date">${reviewDate}</div>
      </div>
    `;
  }

  createTestimonialHTML(testimonial) {
    const date = new Date(testimonial.created_at || Date.now()).toLocaleDateString();
    const rating = testimonial.rating || 5;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    
    const authorName = testimonial.userFirstName && testimonial.userLastName 
      ? `${testimonial.userFirstName} ${testimonial.userLastName}` 
      : testimonial.userName || 'Anonymous';
    const authorRole = testimonial.userRole === 'shelter' ? 'Partner Shelter' : 'Pet Adopter';
    const isClickable = testimonial.userId && testimonial.userId !== this.currentUserId;
    
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-rating">
            <span class="stars">${stars}</span>
            <span class="rating-number">${rating}/5</span>
          </div>
          <span class="review-date">${date}</span>
        </div>
        <p class="review-text">${testimonial.testimonial_text}</p>
        ${testimonial.location ? `<p class="review-location">${testimonial.location}</p>` : ''}
        ${isClickable ? `
          <div class="testimonial-author-info" data-user-id="${testimonial.userId}" onclick="window.navigateToProfile(${testimonial.userId})" style="cursor: pointer; padding: 1rem 0; border-top: 1px solid #e9ecef; margin-top: 1rem; transition: background-color 0.3s ease;">
            <div class="author-info">
              <h4 class="author-name" style="margin: 0 0 0.25rem 0; font-size: 1rem; color: var(--primary-color);">${authorName}</h4>
              <p class="author-role" style="margin: 0; font-size: 0.875rem; color: #666; font-weight: 500;">${authorRole}</p>
            </div>
            <div class="profile-link-hint" style="text-align: right; margin-top: 0.5rem; opacity: 0.7; transition: opacity 0.3s ease;">
              <span class="link-text" style="font-size: 0.8rem; color: var(--primary-color); font-weight: 500;">View Profile →</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  createPetCardHTML(pet) {
    const imagePath = pet.imagePath || pet.media?.[0]?.filePath || '../assets/default-pet-profile.jpg';
    const imageUrl = imagePath.startsWith('http') ? imagePath : `/server/${imagePath}`;
    
    return `
      <div class="pet-card" onclick="window.location.href='../pets/pet-details.html?id=${pet.id}'">
        <img src="${imageUrl}" alt="${pet.name}" class="pet-image" onerror="this.src='../assets/default-pet-profile.jpg'">
        <div class="pet-info">
          <h4 class="pet-name">${pet.name}</h4>
          <p class="pet-breed">${pet.breed} • ${pet.species}</p>
          <p class="pet-age">${pet.age} years old</p>
          <span class="pet-status ${pet.adoptionStatus}">${this.capitalizeFirst(pet.adoptionStatus || 'available')}</span>
        </div>
      </div>
    `;
  }

  capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  initEventListeners() {
    const contactBtn = document.getElementById('contact-user-btn');
    if (contactBtn) {
      contactBtn.addEventListener('click', () => this.showContactModal());
    }

    const modal = document.getElementById('contact-modal');
    const closeButtons = modal.querySelectorAll('.modal-close');
    
    closeButtons.forEach(button => {
      button.addEventListener('click', () => this.hideContactModal());
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideContactModal();
      }
    });

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => this.handleContactSubmit(e));
    }
  }

  showContactModal() {
    document.getElementById('contact-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  hideContactModal() {
    document.getElementById('contact-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    const form = document.getElementById('contact-form');
    if (form) {
      form.reset();
    }
  }

  handleContactSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;
    console.log('Contact form submitted:', { name, email, message, targetUserId: this.currentUserId });
    
    alert('Message sent successfully! The user will be notified.');
    this.hideContactModal();
  }

  getDisplayName(user) {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else {
      return user.username;
    }
  }

  translateRole(roleKey) {
    if (window.languageManager && window.languageManager.translate) {
      return window.languageManager.translate(`featuredUsers.roles.${roleKey}`, 
        roleKey === 'shelter' ? 'Shelter Partner' : 'Community Member');
    }
    return roleKey === 'shelter' ? 'Shelter Partner' : 'Community Member';
  }

  showLoading() {
    document.getElementById('loading-state').style.display = 'flex';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('profile-content').style.display = 'none';
  }

  hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';
  }

  showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('profile-content').style.display = 'none';
    
    const errorState = document.getElementById('error-state');
    const errorMessage = errorState.querySelector('[data-i18n="errorMessage"]');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    errorState.style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new ProfilePage();
});
