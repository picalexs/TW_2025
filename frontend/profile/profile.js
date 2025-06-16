import UserService from '../services/userService.js';
import PetService from '../services/petService.js';
import { OwnerReviewService } from '../services/ownerReviewService.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons, navigateToProfile } from '../global/global.js';

window.navigateToProfile = navigateToProfile;

class ProfilePage {
  constructor() {
    this.userService = new UserService({ debug: true });
    this.petService = new PetService();
    this.ownerReviewService = new OwnerReviewService();
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
      }      
      
      this.currentUserId = userId;
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
    const profileImage = document.getElementById('profile-image');
    const imagePath = window.ImagePathHandler.processUserImagePath(user.imagePath || user.profile_picture);
    
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
      reviewsContainer.innerHTML =
        CardRenderer.createPlaceholderCard('review') +
        CardRenderer.createPlaceholderCard('review') +
        CardRenderer.createPlaceholderCard('review');
      
      const ownerReviewsData = await this.ownerReviewService.getReviewsForOwner(userId);
        
      if (ownerReviewsData && ownerReviewsData.reviews && ownerReviewsData.reviews.length > 0) {
        const reviewsHTML = ownerReviewsData.reviews.map(review => this.createOwnerReviewHTML(review)).join('');
        const statsHTML = this.createReviewStatsHTML(ownerReviewsData.statistics);
          
        reviewsContainer.innerHTML = `
          ${statsHTML}
          <div class="reviews-list">
            ${reviewsHTML}
          </div>
        `;
      } else {
        this.renderNoReviews(reviewsContainer);
      }
    } catch (error) {
      console.error('Error loading owner reviews:', error);
      this.renderNoReviews(document.getElementById('reviews-container'));
    }
  }

  renderNoReviews(container) {
    container.innerHTML = `
      <div class="no-reviews" style="text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; margin: 1rem 0;">
        <p style="color: #888; margin: 0;">This user hasn't received any reviews from adopters yet.</p>
      </div>
    `;
  }
  
  async loadAndRenderPets(userId) {
    try {
      const petsContainer = document.getElementById('pets-container');
      petsContainer.innerHTML =
        CardRenderer.createPlaceholderCard('pet') +
        CardRenderer.createPlaceholderCard('pet') +
        CardRenderer.createPlaceholderCard('pet');
      if (this.currentUser.role === 'shelter') {
        try {
          const allPets = await this.petService.getPetsByShelter(userId);
          if (allPets && allPets.length > 0) {
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
    return window.CardRenderer.createTestimonialCard(testimonial, {
      format: 'html',
      variant: 'profile',
      showAuthor: testimonial.userId && testimonial.userId !== this.currentUserId,
      clickAction: 'navigate'
    });
  }

  createOwnerReviewHTML(review) {
    let date = 'Unknown date';
    if (review.created_at) {
      try {
        const dateObj = new Date(review.created_at);
        if (!isNaN(dateObj.getTime())) {
          date = dateObj.toLocaleDateString();
        }
      } catch (e) {
        console.warn('Error parsing review date:', review.created_at);
      }
    }
    
    const rating = review.rating || 5;
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    
    const reviewerFirstName = review.reviewer?.first_name || '';
    const reviewerLastName = review.reviewer?.last_name || '';
    const reviewerName = reviewerFirstName && reviewerLastName 
      ? `${reviewerFirstName} ${reviewerLastName}` 
      : (reviewerFirstName || reviewerLastName || 'Anonymous');
    
    const isClickable = review.reviewer?.id && review.reviewer.id !== parseInt(this.currentUserId);
    
    const detailedRatings = [];
    if (review.communication_rating) {
      detailedRatings.push(`Communication: ${'★'.repeat(Math.floor(review.communication_rating))}${'☆'.repeat(5 - Math.floor(review.communication_rating))}`);
    }
    if (review.pet_condition_rating) {
      detailedRatings.push(`Pet Condition: ${'★'.repeat(Math.floor(review.pet_condition_rating))}${'☆'.repeat(5 - Math.floor(review.pet_condition_rating))}`);
    }
    if (review.process_rating) {
      detailedRatings.push(`Process: ${'★'.repeat(Math.floor(review.process_rating))}${'☆'.repeat(5 - Math.floor(review.process_rating))}`);
    }
    
    const animalName = review.animal?.name || 'Unknown pet';
    const animalSpecies = review.animal?.species || 'Unknown species';
    
    return `
      <div class="review-card owner-review">
        <div class="review-header">
          <div class="review-rating">
            <span class="stars">${stars}</span>
            <span class="rating-number">${rating}/5</span>
            ${review.would_recommend ? '<span class="recommendation-badge">Recommended</span>' : ''}
          </div>
          <span class="review-date">${date}</span>
        </div>
        ${review.review_text ? `<p class="review-text">${review.review_text}</p>` : ''}
        ${detailedRatings.length > 0 ? `
          <div class="detailed-ratings">
            ${detailedRatings.map(rating => `<div class="rating-item">${rating}</div>`).join('')}
          </div>
        ` : ''}
        <div class="adoption-context">
          <span class="adoption-info">Adoption: ${animalName} (${animalSpecies})</span>
        </div>
        ${isClickable ? `
          <div class="review-author-info" data-user-id="${review.reviewer.id}" onclick="window.navigateToProfile(${review.reviewer.id})" style="cursor: pointer; padding: 1rem 0; border-top: 1px solid #e9ecef; margin-top: 1rem; transition: background-color 0.3s ease;">
            <div class="author-info">
              <h4 class="author-name" style="margin: 0 0 0.25rem 0; font-size: 1rem; color: var(--primary-color);">${reviewerName}</h4>
              <p class="author-role" style="margin: 0; font-size: 0.875rem; color: #666; font-weight: 500;">Pet Adopter</p>
            </div>
            <div class="profile-link-hint" style="text-align: right; margin-top: 0.5rem; opacity: 0.7; transition: opacity 0.3s ease;">
              <span class="link-text" style="font-size: 0.8rem; color: var(--primary-color); font-weight: 500;">View Profile →</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  createReviewStatsHTML(statistics) {
    if (!statistics || statistics.total_reviews === 0) {
      return '';
    }

    const avgRating = parseFloat(statistics.average_rating) || 0;
    const stars = '★'.repeat(Math.floor(avgRating)) + (avgRating % 1 >= 0.5 ? '☆' : '') + '☆'.repeat(5 - Math.ceil(avgRating));
    
    return `
      <div class="review-statistics">
        <div class="stats-header">
          <h4>Review Summary</h4>
          <div class="overall-rating">
            <span class="stats-stars">${stars}</span>
            <span class="stats-rating">${avgRating.toFixed(1)}/5</span>
            <span class="stats-count">(${statistics.total_reviews} review${statistics.total_reviews !== 1 ? 's' : ''})</span>
          </div>
        </div>
        <div class="stats-details">
          ${statistics.average_communication ? `
            <div class="stat-detail">
              <span class="stat-label">Communication:</span>
              <span class="stat-value">${parseFloat(statistics.average_communication).toFixed(1)}/5</span>
            </div>
          ` : ''}
          ${statistics.average_pet_condition ? `
            <div class="stat-detail">
              <span class="stat-label">Pet Condition:</span>
              <span class="stat-value">${parseFloat(statistics.average_pet_condition).toFixed(1)}/5</span>
            </div>
          ` : ''}
          ${statistics.average_process ? `
            <div class="stat-detail">
              <span class="stat-label">Process:</span>
              <span class="stat-value">${parseFloat(statistics.average_process).toFixed(1)}/5</span>
            </div>
          ` : ''}
          ${statistics.recommendation_percentage !== undefined ? `
            <div class="stat-detail">
              <span class="stat-label">Would Recommend:</span>
              <span class="stat-value">${statistics.recommendation_percentage}%</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  createPetCardHTML(pet) {
    return window.CardRenderer.createPetCard(pet, {
      format: 'html',
      variant: 'profile',
      clickAction: 'navigate'
    });
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
