class CardRenderer {
  constructor() {
    this.imagePathHandler = window.ImagePathHandler;
    this.languageManager = window.languageManager;
  }

  createPetCard(pet, options = {}) {
    const {
      format = 'element',
      variant = 'default',
      showFullDescription = false,
      clickAction = 'navigate'
    } = options;

    const imagePath = this.imagePathHandler.processPetImagePath(
      pet.imagePath || pet.media?.[0]?.filePath
    );
    
    const defaultPetImage = this.imagePathHandler?.DEFAULTS?.PET || '/assets/default-pet-profile.webp';
    
    const description = this._formatDescription(pet.description, showFullDescription);
    const petInfo = this._formatPetInfo(pet, variant);
    const clickHandler = this._getClickHandler(clickAction, 'pet', pet.id);

    const cardHTML = `
      <div class="pet-card" ${clickHandler.attr}>        
      <img src="${imagePath}" 
             alt="${pet.name || 'Pet'}" 
             class="pet-image" 
             onerror="this.src='${defaultPetImage}'">
        <div class="pet-info">
          ${petInfo}
          ${this._renderPetTags(pet, variant)}
          ${this._renderPetActions(pet, variant, clickAction)}
        </div>
      </div>
    `;

    return format === 'element' ? this._createElementFromHTML(cardHTML) : cardHTML;
  }

  createUserCard(user, options = {}) {
    const {
      format = 'element',
      variant = 'default',
      showStats = true,
      clickAction = 'navigate'
    } = options;    
    
    const imagePath = this.imagePathHandler.processUserImagePath(
      user.imagePath || user.profile_picture
    );
    
    const defaultUserImage = this.imagePathHandler?.DEFAULTS?.USER || '/assets/default-user-profile.webp';
    
    const userInfo = this._formatUserInfo(user, variant);
    const userStats = showStats ? this._formatUserStats(user, variant) : '';
    const clickHandler = this._getClickHandler(clickAction, 'user', user.id);

    const cardHTML = `
      <div class="user-card" data-user-id="${user.id || ''}" ${clickHandler.attr}>        
      <img src="${imagePath}" 
             alt="${userInfo.displayName}" 
             class="user-image" 
             onerror="this.src='${defaultUserImage}'">
        <div class="user-info">
          <div class="user-name-section">
            <h3 class="user-name">${userInfo.displayName}</h3>
            <span class="username-tag">@${user.username || 'unknown'}</span>
          </div>
          <p class="user-description">${userInfo.description}</p>
          ${userStats}
          ${this._renderUserActions(user, variant, clickAction)}
        </div>
      </div>
    `;

    return format === 'element' ? this._createElementFromHTML(cardHTML) : cardHTML;
  }

  createTestimonialCard(testimonial, options = {}) {
    const {
      format = 'element',
      variant = 'default',
      showAuthor = true,
      clickAction = 'navigate'
    } = options;

    const rating = this._formatRating(testimonial.rating);
    const authorInfo = showAuthor ? this._formatAuthorInfo(testimonial, variant) : '';
    const clickHandler = this._getClickHandler(clickAction, 'user', testimonial.userId);

    const cardHTML = variant === 'profile' ? `
      <div class="review-card">
        <div class="review-header">
          <div class="review-rating">
            <span class="stars">${rating.stars}</span>
            <span class="rating-number">${rating.number}/5</span>
          </div>
          <span class="review-date">${this._formatDate(testimonial.created_at)}</span>
        </div>
        <p class="review-text">${testimonial.testimonial_text || testimonial.text || 'No review text available'}</p>
        ${testimonial.location ? `<p class="review-location">${testimonial.location}</p>` : ''}
        ${authorInfo}
      </div>
    ` : `
      <div class="testimonial-card">
        <div class="testimonial-content">
          <div class="testimonial-rating">
            <div class="stars">${rating.starsHTML}</div>
            <span class="rating-number">${rating.number}/5</span>
          </div>
          <blockquote class="testimonial-text">
            ${testimonial.text || testimonial.testimonial_text || 'No testimonial text available'}
          </blockquote>
        </div>
        ${authorInfo}
      </div>
    `;

    return format === 'element' ? this._createElementFromHTML(cardHTML) : cardHTML;
  }

  createReviewCard(review, options = {}) {
    const {
      format = 'element',
      variant = 'default',
      showAuthor = true
    } = options;

    const rating = this._formatRating(review.rating);
    const date = this._formatDate(review.created_at);

    const cardHTML = `
      <div class="review-card">
        <div class="review-header">
          <div class="review-rating">
            <span class="stars">${rating.stars}</span>
            <span class="rating-number">${rating.number}/5</span>
          </div>
          <span class="review-date">${date}</span>
        </div>
        <div class="review-content">
          <p class="review-text">${review.review_text || review.text || 'No review text available'}</p>
          ${review.location ? `<p class="review-location">${review.location}</p>` : ''}
        </div>
      </div>
    `;

    return format === 'element' ? this._createElementFromHTML(cardHTML) : cardHTML;
  }

  static createPlaceholderCard(type = 'review') {
    let content = '';
    switch(type) {
      case 'pet':
        content = `
          <div class="pet-card pet-placeholder-simple">
          </div>
        `;
        break;
      case 'user':
        content = `
          <div class="user-card placeholder card-placeholder">
            <div class="placeholder-author"></div>
            <div class="placeholder-content"></div>
            <div class="placeholder-location"></div>
          </div>
        `;
        break;
      case 'testimonial':
        content = `
          <div class="testimonial-card placeholder card-placeholder">
            <div class="placeholder-stars"></div>
            <div class="placeholder-content"></div>
            <div class="placeholder-author"></div>
          </div>
        `;
        break;
      default:
        content = `
          <div class="review-card placeholder card-placeholder">
            <div class="placeholder-stars"></div>
            <div class="placeholder-content"></div>
            <div class="placeholder-author"></div>
          </div>
        `;
    }
    return content;
  }

  _formatDescription(description, showFull = false) {
    if (!description || description === 'undefined' || description === 'null') return 'No description available';
    if (showFull || description.length <= 100) return description;
    return description.substring(0, 100) + '...';
  }
  _formatPetInfo(pet, variant) {
    const lm = this.languageManager;
    
    //Name • Gender • Age
    const genderText = pet.gender ? this._capitalizeFirst(pet.gender) : 'Unknown';
    const ageText = pet.age ? `${pet.age} years old` : 'Age unknown';
    switch (variant) {
      case 'profile':
        return `
          <span class="pet-status ${(pet.adoptionStatus || 'available').toLowerCase()}">${this._capitalizeFirst(pet.adoptionStatus || 'available')}</span>
          <div class="pet-info-line">
            <h4 class="pet-name">${pet.name || 'Unknown Pet'}</h4>
            <span class="pet-meta">• ${genderText} • ${ageText}</span>
          </div>
          ${pet.description ? `<p class="pet-description">${pet.description}</p>` : ''}
        `;
      
      case 'compact':
        return `
          <h4 class="pet-name">${pet.name || 'Unknown Pet'}</h4>
          <p class="pet-brief">${pet.species || 'Pet'} • ${this._capitalizeFirst(pet.adoptionStatus || 'Available')}</p>
        `;
      
      default:
        return `
          <h3 class="pet-name">${pet.name || 'Unknown Pet'}</h3>
          <p class="pet-description">${this._formatDescription(pet.description)}</p>
        `;
    }
  }

  _formatUserInfo(user, variant) {
    let displayName = 'Unknown User';
    if (user.first_name && user.last_name && 
        user.first_name !== 'undefined' && user.last_name !== 'undefined') {
      displayName = `${user.first_name} ${user.last_name}`;
    } else if (user.first_name && user.first_name !== 'undefined') {
      displayName = user.first_name;
    } else if (user.username && user.username !== 'undefined') {
      displayName = user.username;
    }
    
    const roleKey = (user.role === 'shelter') ? 'shelter' : 'user';
    let description = user.role === 'shelter' ? 'Shelter Partner' : 'Community Member';
    
    if (this.languageManager?.translate) {
      const translated = this.languageManager.translate(`featuredUsers.roles.${roleKey}`, description);
      if (translated && typeof translated === 'string' && translated !== 'undefined') {
        description = translated;
      }
    }

    return { displayName, description };
  }

  _formatUserStats(user, variant) {
    const adoptionCount = user.adoption_count || 0;
    if (adoptionCount === 0) return '';

    const roleKey = user.role === 'shelter' ? 'shelter' : 'user';
    let adoptionImpact = '';
    if (user.role === 'shelter') {
      adoptionImpact = adoptionCount === 1 
        ? 'Helped 1 pet find a home' 
        : `Helped ${adoptionCount} pets find homes`;
    } else {
      adoptionImpact = adoptionCount === 1 
        ? 'Adopted 1 pet' 
        : `Adopted ${adoptionCount} pets`;
    }
    
    if (this.languageManager?.translate) {
      const impactKey = adoptionCount === 1 ? 'single' : 'multiple';
      const translationKey = `featuredUsers.adoptionImpact.${roleKey}.${impactKey}`;
      
      try {
        const translated = this.languageManager.translate(translationKey, adoptionImpact);
        if (translated && typeof translated === 'string' && translated !== 'undefined') {
          if (translated.includes('{{count}}')) {
            adoptionImpact = translated.replace('{{count}}', adoptionCount);
          } else {
            adoptionImpact = translated;
          }
        }
      } catch (error) {
        console.warn('Translation error for user stats:', error);
      }
    }

    return `
      <div class="user-stats">
        <span class="adoption-impact">${adoptionImpact}</span>
      </div>
    `;
  }

  _formatRating(rating) {
    const numRating = parseFloat(rating) || 5;
    const fullStars = Math.floor(numRating);
    const emptyStars = 5 - fullStars;
    
    return {
      number: numRating,
      stars: '★'.repeat(fullStars) + '☆'.repeat(emptyStars),
      starsHTML: this._createStarsHTML(numRating)
    };
  }

  _createStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<span class="star star-full">★</span>';
    }
    if (halfStar) {
      starsHTML += '<span class="star star-half">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<span class="star star-empty">☆</span>';
    }
    
    return starsHTML;
  }

  _formatAuthorInfo(testimonial, variant) {
    const authorName = testimonial.userFirstName && testimonial.userLastName 
      ? `${testimonial.userFirstName} ${testimonial.userLastName}` 
      : testimonial.userName || 'Anonymous';
    const authorRole = testimonial.userRole === 'shelter' ? 'Partner Shelter' : 'Pet Adopter';
    const isClickable = testimonial.userId;

    if (variant === 'profile' && isClickable) {
      return `
        <div class="testimonial-author-info" data-user-id="${testimonial.userId}" onclick="window.navigateToProfile(${testimonial.userId})" style="cursor: pointer; padding: 1rem 0; border-top: 1px solid var(--accent-color); margin-top: 1rem; transition: background-color 0.3s ease;">
          <div class="author-info">
            <h4 class="author-name" style="margin: 0 0 0.25rem 0; font-size: 1rem; color: var(--primary-color);">${authorName}</h4>
            <p class="author-role" style="margin: 0; font-size: 0.875rem; color: var(--secondary-color); font-weight: 500;">${authorRole}</p>
          </div>
          <div class="profile-link-hint" style="text-align: right; margin-top: 0.5rem; opacity: 0.7; transition: opacity 0.3s ease;">
            <span class="link-text" style="font-size: 0.8rem; color: var(--primary-color); font-weight: 500;">View Profile →</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="testimonial-author" ${isClickable ? `data-user-id="${testimonial.userId}" onclick="window.navigateToProfile(${testimonial.userId})"` : ''}>
        <div class="author-info">
          <h4 class="author-name">${authorName}</h4>
          <p class="author-role">${authorRole}</p>
          ${testimonial.location ? `<p class="author-location">${testimonial.location}</p>` : ''}
        </div>
        ${isClickable ? `
          <div class="profile-link-hint">
            <span class="link-text">View Profile →</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  _formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  }  
    _renderPetTags(pet, variant) {
    const tags = [];
    
    if (pet.species) {
      tags.push(pet.species);
    }
    if (pet.breed && pet.breed !== 'Mixed') {
      tags.push(pet.breed);
    }
    
    if (pet.sizeCategory) {
      tags.push(pet.sizeCategory);
    }
    
    if (pet.tags && Array.isArray(pet.tags)) {
      pet.tags.forEach(tag => {
        if (typeof tag === 'object' && tag.name) {
          tags.push(tag.name);
        } else if (typeof tag === 'string') {
          tags.push(tag);
        }
      });
    }
    
    if (variant === 'profile' && pet.personality && Array.isArray(pet.personality)) {
      pet.personality.slice(0, 3).forEach(personalityTag => {
        if (typeof personalityTag === 'object' && personalityTag.name) {
          tags.push(personalityTag.name);
        } else if (typeof personalityTag === 'string') {
          tags.push(personalityTag);
        }
      });
    }
    
    if (pet.activity_level) {
      tags.push(`${pet.activity_level} Energy`);
    }
    
    if (variant !== 'profile' && pet.healthStatus) {
      tags.push(pet.healthStatus);
    }
    
    const uniqueTags = [...new Set(tags)].slice(0, 6);
    
    return uniqueTags.length > 0 ? `
      <div class="pet-tags">
        ${uniqueTags.map(tag => {
          const tagText = typeof tag === 'string' ? tag : String(tag);
          return `<span class="tag">${this._capitalizeFirst(tagText)}</span>`;
        }).join('')}
      </div>
    ` : '';
  }

  _renderPetActions(pet, variant, clickAction) {
    if (variant === 'profile' || clickAction === 'none') return '';
    
    let viewDetailsText = 'View Details';
    if (this.languageManager?.translate) {
      const translated = this.languageManager.translate('viewDetails', 'View Details');
      if (translated && typeof translated === 'string' && translated !== 'undefined') {
        viewDetailsText = translated;
      }
    }
    
    if (clickAction === 'custom') return '';
    
    let targetPath = '/frontend/pets/pet-details/pet-details.html';
    
    return `<a href="${targetPath}?id=${pet.id || ''}" class="btn btn-primary">${viewDetailsText}</a>`;
  }

  _renderUserActions(user, variant, clickAction) {
    if (clickAction === 'none' || clickAction === 'custom') return '';
    
    let viewProfileText = 'View Profile';
    if (this.languageManager?.translate) {
      const translated = this.languageManager.translate('featuredUsers.viewProfile', 'View Profile');
      if (translated && typeof translated === 'string' && translated !== 'undefined') {
        viewProfileText = translated;
      }
    }
    return `<a href="#" class="btn btn-outline-primary view-user-btn" data-user-id="${user.id || ''}">${viewProfileText}</a>`;
  }    
  
  _getClickHandler(clickAction, type, id) {
    switch (clickAction) {
      case 'navigate':
        if (type === 'pet') {
          const targetPath = '/frontend/pets/pet-details/pet-details.html';
          return { attr: `onclick="window.location.href='${targetPath}?id=${id}'"` };
        } else if (type === 'user') {
          return { attr: `onclick="window.navigateToProfile && window.navigateToProfile(${id})"` };
        }
        return { attr: '' };
      
      case 'custom':
        return { attr: `data-${type}-id="${id}"` };
      
      default:
        return { attr: '' };
    }
  }

  _createElementFromHTML(htmlString) {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
  }

  _capitalizeFirst(str) {
    if (!str || str === 'undefined' || str === 'null') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

window.CardRenderer = new CardRenderer();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardRenderer;
}
