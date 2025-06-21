import UserService from "../services/userService.min.js";
import PetService from "../services/petService.min.js";
import { OwnerReviewService } from "../services/ownerReviewService.min.js";
import {
  setupMobileMenu,
  initializePageLanguage,
  checkLoginStatusAndToggleNavButtons,
  navigateToProfile,
} from "../global/global.min.js";

window.navigateToProfile = navigateToProfile;

class ProfilePage {
  constructor() {
    this.userService = new UserService({ debug: true });
    this.petService = new PetService();
    this.ownerReviewService = new OwnerReviewService();
    this.currentUser = null;
    this.currentUserId = null;
    this.currentAvailablePets = null;
    this.originalReviewsData = null;
    this.currentFilters = {
      sortBy: 'date-desc',
      minRating: 0,
      recommendation: 'all',
      animalType: 'all',
      communicationRating: 0,
      petConditionRating: 0,
      processRating: 0
    };
    this.init();
  }

  async init() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("id");

      if (!userId) {
        this.showError("No user ID provided");
        return;
      }

      this.currentUserId = userId;
      await this.loadUserProfile(userId);
      this.initEventListeners();
    } catch (error) {
      console.error("Error initializing profile page:", error);
      this.showError("Failed to load user profile");
    }
  }

  async loadUserProfile(userId) {
    try {
      this.showLoading();
      const user = await this.userService.getUserById(userId);

      if (!user) {
        this.showError("User not found");
        return;
      }

      this.currentUser = user;
      this.renderUserProfile(user);
      this.hideLoading();
    } catch (error) {
      console.error("Error loading user profile:", error);
      this.showError("Failed to load user profile");
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
    const profileImage = document.getElementById("profile-image");
    const imagePath = window.ImagePathHandler.processUserImagePath(
      user.imagePath || user.profile_picture
    );

    profileImage.src = imagePath;
    profileImage.alt = this.getDisplayName(user);    const roleBadge = document.getElementById("user-role");
    const roleKey = user.role === "shelter" ? "shelter" : "user";
    const roleText = this.translateRole(roleKey);
    
    const words = roleText.split(' ');
    if (words.length > 1) {
      roleBadge.innerHTML = `
        <span class="badge-word">${words[0]}</span>
        <span class="badge-word">${words.slice(1).join(' ')}</span>
      `;
    } else {
      roleBadge.textContent = roleText;
    }
    
    roleBadge.className = `role-badge ${roleKey}`;
    document.getElementById("user-name").textContent =
      this.getDisplayName(user);
    document.getElementById("username").textContent = user.username;

    const adoptionCount = user.adoption_count || 0;
    const petsHelpedCount = user.pets_helped_count || 0;
    document.getElementById("adoption-count").textContent = adoptionCount;
    document.getElementById("pets-helped").textContent = petsHelpedCount;
  }

  renderOverviewSection(user) {
    const memberSince = document.getElementById("member-since");
    if (user.created_at) {
      const date = new Date(user.created_at);
      memberSince.textContent = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else {
      memberSince.textContent = "Unknown";
    }
  }

  async loadAndRenderReviews(userId) {
    try {
      const reviewsContainer = document.getElementById("reviews-container");
      reviewsContainer.innerHTML =
        CardRenderer.createPlaceholderCard("review") +
        CardRenderer.createPlaceholderCard("review") +
        CardRenderer.createPlaceholderCard("review");

      const ownerReviewsData = await this.ownerReviewService.getReviewsForOwner(
        userId
      );

      if (
        ownerReviewsData &&
        ownerReviewsData.reviews &&
        ownerReviewsData.reviews.length > 0
      ) {
        this.originalReviewsData = ownerReviewsData;
        this.applyFiltersAndRender();
      } else {
        this.renderNoReviews(reviewsContainer);
      }
    } catch (error) {
      console.error("Error loading owner reviews:", error);
      this.renderNoReviews(document.getElementById("reviews-container"));
    }
  }

  renderNoReviews(container) {
    container.innerHTML = `
      <div class="no-reviews" style="text-align: center; padding: 2rem; background: var(--background-color); border-radius: 8px; margin: 1rem 0;">
        <p style="color: #888; margin: 0;">This user hasn't received any reviews from adopters yet.</p>
      </div>
    `;
  }

  async loadAndRenderPets(userId) {
    try {
      const petsContainer = document.getElementById("pets-container");
      petsContainer.innerHTML = this.createPetsLoadingState();      
      if (this.currentUser.role === "shelter") {
        try {
          const allPets = await this.petService.getPetsByShelter(userId);
          
          if (allPets && allPets.length > 0) {
            const availablePets = allPets.filter(
              (pet) => pet.adoptionStatus === "available"
            );
            
            if (availablePets && availablePets.length > 0) {
              this.currentAvailablePets = availablePets;
              petsContainer.innerHTML = this.renderPetsList(availablePets);
            } else {
              petsContainer.innerHTML = this.createEmptyPetsState();
            }
          } else {
            petsContainer.innerHTML = this.createEmptyPetsState();
          }
        } catch (fetchError) {
          console.error("Error fetching shelter pets:", fetchError);
          petsContainer.innerHTML = this.createErrorPetsState();
        }
      } else {
        const adoptionCount = this.currentUser.adoption_count || 0;
        const petsHelpedCount = this.currentUser.pets_helped_count || 0;

        if (adoptionCount > 0 || petsHelpedCount > 0) {
          petsContainer.innerHTML = `
            <div class="adoption-info">
              <h4>Community Contributions</h4>
              ${
                adoptionCount > 0
                  ? `<p>✓ Adopted ${adoptionCount} pet${
                      adoptionCount === 1 ? "" : "s"
                    }</p>`
                  : ""
              }
              ${
                petsHelpedCount > 0
                  ? `<p>✓ Helped ${petsHelpedCount} pet${
                      petsHelpedCount === 1 ? "" : "s"
                    } find homes</p>`
                  : ""
              }
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
      console.error("Error loading pets:", error);
      document.getElementById("pets-container").innerHTML =
        this.createErrorPetsState();
    }
  }

  createPetsLoadingState() {
    return `
      <div class="pets-grid">
        ${CardRenderer.createPlaceholderCard("pet")}
        ${CardRenderer.createPlaceholderCard("pet")}
        ${CardRenderer.createPlaceholderCard("pet")}
      </div>
    `;
  }

  createEmptyPetsState() {
    return `
      <div class="pets-grid">
        ${CardRenderer.createPlaceholderCard("pet")}
      </div>
    `;
  }

  createErrorPetsState() {
    return `
      <div class="no-pets">
        <p>Error loading pets</p>
      </div>
    `;
  }  
    renderPetsList(pets) {
    if (!pets || pets.length === 0) {
      return `
        <div class="pets-grid">
          <div class="no-pets">
            <p>No pets currently listed by this shelter.</p>
          </div>
        </div>
      `;    
    }
    
    const petCards = pets.map(pet => this.createPetCardHTML(pet)).join('');
    return `
      <div class="pets-grid">
        <div class="pets-simple-grid">
          ${petCards}
        </div>
      </div>
    `;
  }
  createReviewHTML(review) {
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    const reviewDate = new Date(review.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
    <div class="review-card">
        <div class="review-header">
          <span class="review-author">${review.author}</span>
          <div class="review-rating">
            ${stars
              .split("")
              .map((star) => `<span class="star">${star}</span>`)
              .join("")}
          </div>
        </div>
        <p class="review-text">${review.text}</p>
        <div class="review-date">${reviewDate}</div>
      </div>`;
  }

  createOwnerReviewHTML(review) {
    let date = "Unknown date";
    if (review.created_at) {
      try {
        const dateObj = new Date(review.created_at);
        if (!isNaN(dateObj.getTime())) {
          date = dateObj.toLocaleDateString();
        }
      } catch (e) {
        console.warn("Error parsing review date:", review.created_at);
      }
    }

    const rating = review.rating || 5;
    const stars =
      "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));

    const reviewerFirstName = review.reviewer?.first_name || "";
    const reviewerLastName = review.reviewer?.last_name || "";
    const reviewerName =
      reviewerFirstName && reviewerLastName
        ? `${reviewerFirstName} ${reviewerLastName}`
        : reviewerFirstName || reviewerLastName || "Anonymous";

    const isClickable =
      review.reviewer?.id &&
      review.reviewer.id !== parseInt(this.currentUserId);
    const detailedRatings = [];
    if (review.communication_rating) {
      detailedRatings.push(
        `<span class="rating-category"><span class="rating-category-label">Communication:</span> <span class="rating-stars">${"★".repeat(
          Math.floor(review.communication_rating)
        )}${"☆".repeat(
          5 - Math.floor(review.communication_rating)
        )}</span></span>`
      );
    }
    if (review.pet_condition_rating) {
      detailedRatings.push(
        `<span class="rating-category">Pet Condition: <span class="rating-stars">${"★".repeat(
          Math.floor(review.pet_condition_rating)
        )}${"☆".repeat(
          5 - Math.floor(review.pet_condition_rating)
        )}</span></span>`
      );
    }
    if (review.process_rating) {
      detailedRatings.push(
        `<span class="rating-category">Process: <span class="rating-stars">${"★".repeat(
          Math.floor(review.process_rating)
        )}${"☆".repeat(5 - Math.floor(review.process_rating))}</span></span>`
      );
    }
    const animalName = review.animal?.name || "Unknown pet";
    const animalSpecies = review.animal?.species || "Unknown species";
    const animalId = review.animal?.id;

    const petImagePath = animalId
      ? window.ImagePathHandler.processPetImagePath(
          `images/${animalSpecies?.toLowerCase() || "cat"}/${animalId}.jpg`
        )
      : window.ImagePathHandler.processPetImagePath(null);

    const reviewerProfilePic = window.ImagePathHandler.processUserImagePath(
      review.reviewer?.profile_picture
    );

    return `
      <div class="review-card owner-review">
        <div class="review-header">
          <div class="review-rating">
            <span class="stars">${stars}</span>
            <span class="rating-number" style="white-space:nowrap">${rating % 1 === 0 ? parseInt(rating) : rating}/5</span>
            ${
              review.would_recommend
                ? '<span class="recommendation-badge">Recommended</span>'
                : ""
            }
          </div>
          <span class="review-date">${date}</span>
        </div>
        ${
          review.review_text
            ? `<p class="review-text">${review.review_text}</p>`
            : ""
        }        
        ${
          detailedRatings.length > 0
            ? `
          <div class="detailed-ratings">
            <div class="ratings-inline">${detailedRatings.join("")}</div>
          </div>` : ""
        }        
        
        <div class="adoption-context">
          <div class="adoption-info-container">
            <div class="pet-image-container">
              <img src="${petImagePath}" alt="${animalName}" class="pet-avatar">
            </div>
            <div class="adoption-details">
              <h4 class="pet-name">${animalName}</h4>
              <p class="adoption-label">${animalSpecies} Adoption</p>
            </div>            
            <div class="adopter-info${
              isClickable ? " clickable-adopter" : ""
            }"${isClickable
              ? ` onclick="window.navigateToProfile(${review.reviewer.id})" style="cursor: pointer;"`
              : ""}>
              <p class="adopter-name">${reviewerName}</p>
              <p class="adopter-role">Pet Adopter</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createReviewStatsHTML(statistics) {
    if (!statistics || statistics.total_reviews === 0) {
      return "";
    }

    const avgRating = parseFloat(statistics.average_rating) || 0;
    const stars =
      "★".repeat(Math.floor(avgRating)) +
      (avgRating % 1 >= 0.5 ? "☆" : "") +
      "☆".repeat(5 - Math.ceil(avgRating));

    const statsItems = [];
    
    if (statistics.average_communication) {
      statsItems.push({
        label: "Communication:",
        value: `${parseFloat(statistics.average_communication) % 1 === 0 ? parseInt(statistics.average_communication) : parseFloat(statistics.average_communication).toFixed(1)}/5`
      });
    }
    
    if (statistics.average_pet_condition) {
      statsItems.push({
        label: "Pet Condition:",
        value: `${parseFloat(statistics.average_pet_condition).toFixed(1)}/5`
      });
    }
    
    if (statistics.average_process) {
      statsItems.push({
        label: "Process:",
        value: `${parseFloat(statistics.average_process).toFixed(1)}/5`
      });
    }
    
    if (statistics.recommendation_percentage !== undefined) {
      statsItems.push({
        label: "Would Recommend:",
        value: `${statistics.recommendation_percentage}%`
      });
    }

    const statsHTML = statsItems.map(item => 
      `<div class="stat-detail">
        <span class="stat-label">${item.label}</span>
        <span class="stat-value" style="white-space:nowrap">${item.value}</span>
      </div>`
    ).join("");

    return `
      <div class="review-statistics">
        <div class="stats-header">
          <h4>Review Summary</h4>
          <div class="overall-rating">
            <span class="stats-stars">${stars}</span>
            <span class="stats-rating">${avgRating.toFixed(1)}/5</span>
            <span class="stats-count">(${statistics.total_reviews} review${
      statistics.total_reviews !== 1 ? "s" : ""})</span>
          </div>
        </div>
        
        <div class="stats-details" data-stats-count="${statsItems.length}">
          ${statsHTML}
        </div>
      </div>
    `;
  }

  createPetCardHTML(pet) {
    return window.CardRenderer.createPetCard(pet, {
      format: "html",
      variant: "profile",
      clickAction: "navigate",
    });
  }

  capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  initEventListeners() {
    const contactBtn = document.getElementById("contact-user-btn");
    if (contactBtn) {
      contactBtn.addEventListener("click", () => this.showContactModal());
    }

    const modal = document.getElementById("contact-modal");
    const closeButtons = modal.querySelectorAll(".modal-close");

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => this.hideContactModal());
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideContactModal();
      }
    });    
    
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) =>
        this.handleContactSubmit(e)
      );
    }    this.initStatItemScrolling();
    
    this.initReviewsFilter();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showContactModal() {
    document.getElementById("contact-modal").style.display = "block";
    document.body.style.overflow = "hidden";
  }

  hideContactModal() {
    document.getElementById("contact-modal").style.display = "none";
    document.body.style.overflow = "auto";

    const form = document.getElementById("contact-form");
    if (form) {
      form.reset();
    }
  }

  handleContactSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("contact-name").value;
    const email = document.getElementById("contact-email").value;
    const message = document.getElementById("contact-message").value;

    alert("Message sent successfully! The user will be notified.");
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
      return window.languageManager.translate(
        `featuredUsers.roles.${roleKey}`,
        roleKey === "shelter" ? "Shelter Partner" : "Community Member"
      );
    }
    return roleKey === "shelter" ? "Shelter Partner" : "Community Member";
  }

  showLoading() {
    document.getElementById("loading-state").style.display = "flex";
    document.getElementById("error-state").style.display = "none";
    document.getElementById("profile-content").style.display = "none";
  }

  hideLoading() {
    document.getElementById("loading-state").style.display = "none";
    document.getElementById("profile-content").style.display = "block";
  }

  showError(message) {
    document.getElementById("loading-state").style.display = "none";
    document.getElementById("profile-content").style.display = "none";

    const errorState = document.getElementById("error-state");
    const errorMessage = errorState.querySelector('[data-i18n="errorMessage"]');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    errorState.style.display = "flex";
  }
  initStatItemScrolling() {
    const statItems = document.querySelectorAll('.stat-item[data-scroll-target]');
    
    statItems.forEach(statItem => {
      statItem.addEventListener('click', (e) => {
        this.scrollToSection(statItem);
      });

      statItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.scrollToSection(statItem);
        }
      });
    });
  }

  scrollToSection(statItem) {
    const targetId = statItem.getAttribute('data-scroll-target');
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }  applyFiltersAndRender() {
    if (!this.originalReviewsData || !this.originalReviewsData.reviews) {
      return;
    }

    let filteredReviews = [...this.originalReviewsData.reviews];
    filteredReviews = this.filterReviews(filteredReviews);
    filteredReviews = this.sortReviews(filteredReviews);
    const reviewsContainer = document.getElementById("reviews-container");
    const reviewsHTML = filteredReviews
      .map((review) => this.createOwnerReviewHTML(review))
      .join("");
    const statsHTML = this.createReviewStatsHTML(
      this.originalReviewsData.statistics
    );

    const totalReviews = this.originalReviewsData.reviews.length;
    const filteredCount = filteredReviews.length;
    let filterResultsInfo = '';
    
    if (filteredCount !== totalReviews) {
      filterResultsInfo = `
        <div class="filter-results-info">
          <p>Showing ${filteredCount} of ${totalReviews} reviews</p>
        </div>
      `;
    }

    reviewsContainer.innerHTML = `
      ${statsHTML}
      ${filterResultsInfo}
      <div class="reviews-list">
        ${reviewsHTML}
      </div>
    `;

    this.updateActiveFiltersIndicator();
  }

  filterReviews(reviews) {
    return reviews.filter(review => {
      if (this.currentFilters.minRating > 0 && (review.rating || 0) < this.currentFilters.minRating) {
        return false;
      }

      if (this.currentFilters.recommendation === 'recommended' && !review.would_recommend) {
        return false;
      }
      if (this.currentFilters.recommendation === 'not-recommended' && review.would_recommend) {
        return false;
      }

      if (this.currentFilters.animalType !== 'all') {
        const animalSpecies = review.animal?.species?.toLowerCase() || 'unknown';
        if (this.currentFilters.animalType === 'other') {
          if (animalSpecies === 'dog' || animalSpecies === 'cat') {
            return false;
          }
        } else if (animalSpecies !== this.currentFilters.animalType) {
          return false;
        }
      }

      if (this.currentFilters.communicationRating > 0 && 
          (review.communication_rating || 0) < this.currentFilters.communicationRating) {
        return false;
      }
      if (this.currentFilters.petConditionRating > 0 && 
          (review.pet_condition_rating || 0) < this.currentFilters.petConditionRating) {
        return false;
      }
      if (this.currentFilters.processRating > 0 && 
          (review.process_rating || 0) < this.currentFilters.processRating) {
        return false;
      }

      return true;
    });
  }

  sortReviews(reviews) {
    return reviews.sort((a, b) => {
      switch (this.currentFilters.sortBy) {
        case 'date-desc':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'date-asc':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        default:
          return 0;
      }
    });
  }

  initReviewsFilter() {
    const filterBtn = document.getElementById('filter-reviews-btn');
    const filterModal = document.getElementById('reviews-filter-modal');
    const filterForm = document.getElementById('reviews-filter-form');
    const resetBtn = document.getElementById('reset-filters-btn');
    const closeButtons = filterModal.querySelectorAll('.modal-close');

    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        this.showFilterModal();
      });
    }

    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.hideFilterModal();
      });
    });

    filterModal.addEventListener('click', (e) => {
      if (e.target === filterModal) {
        this.hideFilterModal();
      }
    });

    if (filterForm) {
      filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  }

  showFilterModal() {
    const modal = document.getElementById('reviews-filter-modal');
    if (modal) {
      this.populateFilterForm();
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  hideFilterModal() {
    const modal = document.getElementById('reviews-filter-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  populateFilterForm() {
    document.getElementById('sort-by').value = this.currentFilters.sortBy;
    document.getElementById('min-rating').value = this.currentFilters.minRating;
    document.getElementById('recommendation-filter').value = this.currentFilters.recommendation;
    document.getElementById('animal-type-filter').value = this.currentFilters.animalType;
    document.getElementById('communication-rating').value = this.currentFilters.communicationRating;
    document.getElementById('pet-condition-rating').value = this.currentFilters.petConditionRating;
    document.getElementById('process-rating').value = this.currentFilters.processRating;
  }
  applyFilters() {
    this.currentFilters.sortBy = document.getElementById('sort-by').value;
    this.currentFilters.minRating = parseInt(document.getElementById('min-rating').value);
    this.currentFilters.recommendation = document.getElementById('recommendation-filter').value;
    this.currentFilters.animalType = document.getElementById('animal-type-filter').value;
    this.currentFilters.communicationRating = parseInt(document.getElementById('communication-rating').value);
    this.currentFilters.petConditionRating = parseInt(document.getElementById('pet-condition-rating').value);
    this.currentFilters.processRating = parseInt(document.getElementById('process-rating').value);

    this.applyFiltersAndRender();
    this.updateActiveFiltersIndicator();
    this.hideFilterModal();
  }
  resetFilters() {
    this.currentFilters = {
      sortBy: 'date-desc',
      minRating: 0,
      recommendation: 'all',
      animalType: 'all',
      communicationRating: 0,
      petConditionRating: 0,
      processRating: 0
    };

    this.populateFilterForm();
    this.applyFiltersAndRender();
    this.updateActiveFiltersIndicator();
  }

  updateActiveFiltersIndicator() {
    const indicator = document.getElementById('active-filters-indicator');
    if (!indicator) return;

    const hasActiveFilters = 
      this.currentFilters.sortBy !== 'date-desc' ||
      this.currentFilters.minRating > 0 ||
      this.currentFilters.recommendation !== 'all' ||
      this.currentFilters.animalType !== 'all' ||
      this.currentFilters.communicationRating > 0 ||
      this.currentFilters.petConditionRating > 0 ||
      this.currentFilters.processRating > 0;

    indicator.style.display = hasActiveFilters ? 'inline' : 'none';  
  }
  petsCarousel = null;
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new ProfilePage();
});
