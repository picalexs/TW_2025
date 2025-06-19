import PetService from '../services/petService.min.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../global/global.min.js';

class PetDetailsPage {
  constructor() {
    this.petService = new PetService();
    this.currentPet = null;
    this.currentImageIndex = 0;
    this.init();
  }

  async init() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get('id');

      if (!petId) {
        this.showError('No pet ID provided');
        return;
      }

      await this.loadPetDetails(petId);
      this.initEventListeners();
      this.initTabs();

    } catch (error) {
      console.error('Error initializing pet details page:', error);
      this.showError('Failed to load pet details');
    }
  }

  async loadPetDetails(petId) {
    try {
      this.showLoading();
      const pet = await this.petService.getPetById(petId);
      
      if (!pet) {
        this.showError('Pet not found');
        return;
      }

      this.currentPet = pet;
      this.renderPetDetails(pet);
      this.hideLoading();

    } catch (error) {
      console.error('Error loading pet details:', error);
      this.showError('Failed to load pet details');
    }
  }

  renderPetDetails(pet) {
    document.title = `${pet.name} - Pet Details`;
    this.renderPetHeader(pet);
    this.renderOverviewTab(pet);
    this.renderHealthTab(pet);
    this.renderBehaviorTab(pet);
    this.renderLocationTab(pet);
    this.renderAdoptionTab(pet);
  }  
  
  renderPetHeader(pet) {
    const mainImage = document.getElementById('main-pet-image');
    const imagePath = window.ImagePathHandler.processPetImagePath(pet.imagePath);
    
    mainImage.src = imagePath;
    mainImage.alt = pet.name;

    this.renderImageGallery(pet);

    const statusElement = document.getElementById('adoption-status');
    statusElement.textContent = pet.adoptionStatus || 'Available';
    statusElement.className = `status-badge ${(pet.adoptionStatus || 'available').toLowerCase()}`;

    document.getElementById('pet-name').textContent = pet.name;
    document.getElementById('pet-species').textContent = pet.species || 'Unknown';
    document.getElementById('pet-breed').textContent = pet.breed || 'Mixed Breed';
    document.getElementById('pet-age').textContent = pet.age ? `${pet.age} years` : 'Unknown';
    document.getElementById('pet-gender').textContent = this.capitalizeFirst(pet.gender) || 'Unknown';
  }

  renderImageGallery(pet) {
    const thumbnailsContainer = document.getElementById('image-thumbnails');
    thumbnailsContainer.innerHTML = '';

    const allImages = [];
    
    if (pet.imagePath) {
      allImages.push({
        filePath: pet.imagePath,
        isProfile: true
      });
    }
    
    if (pet.media && pet.media.length > 0) {
      const mediaImages = pet.media.filter(media => media.type === 'image' || !media.type);
      allImages.push(...mediaImages.map(media => ({
        filePath: media.filePath,
        isProfile: false
      })));
    }

    const imagesToShow = allImages.slice(0, 5);
    
    imagesToShow.forEach((image, index) => {
      const thumbnail = document.createElement('img');
      const imagePath = window.ImagePathHandler.processPetImagePath(image.filePath);
      
      thumbnail.src = imagePath;
      thumbnail.alt = `${pet.name} photo ${index + 1}`;
      thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
      thumbnail.addEventListener('click', () => this.switchMainImage(image.filePath, index));
      thumbnailsContainer.appendChild(thumbnail);
    });
  }
  
  switchMainImage(imagePath, index) {
    const mainImage = document.getElementById('main-pet-image');
    const processedPath = window.ImagePathHandler.processPetImagePath(imagePath);
    
    mainImage.src = processedPath;
    
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
    
    this.currentImageIndex = index;
  }

  renderOverviewTab(pet) {
    document.getElementById('pet-description').textContent = pet.description || 'No description available';
    document.getElementById('pet-size').textContent = this.capitalizeFirst(pet.sizeCategory) || 'Unknown';
    document.getElementById('pet-weight').textContent = pet.weightKg ? `${pet.weightKg} kg` : 'Unknown';
    document.getElementById('pet-color').textContent = pet.color || 'Unknown';
    document.getElementById('pet-health-status').textContent = pet.healthStatus || 'Unknown';
    this.renderTags(pet.tags);
  }

  renderTags(tags) {
    const tagsContainer = document.getElementById('pet-tags');
    tagsContainer.innerHTML = '';

    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'pet-tag';
        tagElement.textContent = tag.name;
        tagsContainer.appendChild(tagElement);
      });
    } else {
      tagsContainer.innerHTML = '<p>No tags available</p>';
    }
  }

  renderHealthTab(pet) {
    this.renderMedicalHistory(pet.medicalHistory);
    this.renderCareSchedule(pet.careSchedule);
    this.renderCareResources(pet.careResources);
  }

  renderMedicalHistory(medicalHistory) {
    const container = document.getElementById('medical-history');
    container.innerHTML = '';

    if (medicalHistory && medicalHistory.length > 0) {
      medicalHistory.forEach(record => {
        const recordElement = document.createElement('div');
        recordElement.className = 'medical-record';
        
        const date = new Date(record.recordDate).toLocaleDateString();
        recordElement.innerHTML = `
          <div class="record-date">${date}</div>
          <div class="record-description">${record.description}</div>
        `;
        
        container.appendChild(recordElement);
      });
    } else {
      container.innerHTML = '<p>No medical history available</p>';
    }
  }

  renderCareSchedule(careSchedule) {
    const container = document.getElementById('care-schedule');
    container.innerHTML = '';

    if (careSchedule && careSchedule.length > 0) {
      careSchedule.forEach(care => {
        const careElement = document.createElement('div');
        careElement.className = 'care-item';
        careElement.innerHTML = `
          <div class="care-time">${care.hour}</div>
          <div class="care-activity">${care.activity}</div>
          <div class="care-frequency">${care.frequency}</div>
        `;
        container.appendChild(careElement);
      });
    } else {
      container.innerHTML = '<p>No care schedule available</p>';
    }
  }

  renderCareResources(careResources) {
    const container = document.getElementById('care-resources');
    container.innerHTML = '';

    if (careResources && careResources.length > 0) {
      careResources.forEach(resource => {
        const resourceElement = document.createElement('div');
        resourceElement.className = 'care-resource';
        resourceElement.innerHTML = `
          <div class="resource-type">${resource.resourceType}</div>
          <div class="resource-title">${resource.title}</div>
          <div class="resource-content">${resource.content}</div>
        `;
        container.appendChild(resourceElement);
      });
    } else {
      container.innerHTML = '<p>No care resources available</p>';
    }
  }

  renderBehaviorTab(pet) {
    const relationsElement = document.getElementById('pet-relations');
    relationsElement.textContent = pet.relationWithOthers || 'No information about relationships with others available';
  }

  renderLocationTab(pet) {
    this.renderAddress(pet.address);
    this.renderShelterInfo(pet.shelter);
  }

  renderAddress(address) {
    const container = document.getElementById('pet-address');
    
    if (address && (address.street || address.city)) {
      const addressParts = [];
      if (address.street) addressParts.push(address.street);
      if (address.city) addressParts.push(address.city);
      if (address.country) addressParts.push(address.country);
      if (address.postalCode) addressParts.push(address.postalCode);
      
      container.innerHTML = `<p>${addressParts.join(', ')}</p>`;
    } else {
      container.innerHTML = '<p>Address information not available</p>';
    }
  }

  renderShelterInfo(shelter) {
    const container = document.getElementById('shelter-info');
      if (shelter && (shelter.firstName || shelter.email)) {
      const name = [shelter.firstName, shelter.lastName].filter(Boolean).join(' ') || 'Shelter Contact';
      const profilePic = window.ImagePathHandler.processUserImagePath(shelter.profilePicture);
      
      container.innerHTML = `
        <div class="shelter-contact">
          <img src="${profilePic}" alt="${name}" class="shelter-avatar">
          <div class="shelter-details">
            <h4>${name}</h4>
            ${shelter.email ? `<p>Email: ${shelter.email}</p>` : ''}
            ${shelter.phone ? `<p>Phone: ${shelter.phone}</p>` : ''}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '<p>Shelter information not available</p>';
    }
  }

  renderAdoptionTab(pet) {
    const feeElement = document.getElementById('adoption-fee');
    feeElement.textContent = pet.adoptionFee ? `$${pet.adoptionFee}` : 'Contact shelter';

    const availableElement = document.getElementById('available-since');
    if (pet.createdAt) {
      const date = new Date(pet.createdAt).toLocaleDateString();
      availableElement.textContent = date;
    } else {
      availableElement.textContent = 'Unknown';
    }

    this.renderMetrics(pet.metrics);
    this.renderAdoptionHistory(pet.adoptionRequests);
  }

  renderMetrics(metrics) {
    const container = document.getElementById('pet-metrics');
    container.innerHTML = '';

    if (metrics) {
      const metricsData = [
        { label: 'Favorites', value: metrics.favoritesCount || 0 },
        { label: 'Views', value: metrics.viewsCount || 0 },
        { label: 'Adoption Requests', value: metrics.adoptionRequestsCount || 0 }
      ];

      metricsData.forEach(metric => {
        const metricElement = document.createElement('div');
        metricElement.className = 'metric-item';
        metricElement.innerHTML = `
          <span class="metric-value">${metric.value}</span>
          <span class="metric-label">${metric.label}</span>
        `;
        container.appendChild(metricElement);
      });
    } else {
      container.innerHTML = '<p>No metrics available</p>';
    }
  }

  renderAdoptionHistory(adoptionRequests) {
    const container = document.getElementById('adoption-history');
    container.innerHTML = '';

    if (adoptionRequests && adoptionRequests.length > 0) {
      adoptionRequests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'adoption-record';
        
        const date = new Date(request.requestDate).toLocaleDateString();
        requestElement.innerHTML = `
          <div class="adoption-status">${this.capitalizeFirst(request.status)}</div>
          <div class="adoption-date">${date}</div>
        `;
        
        container.appendChild(requestElement);
      });
    } else {
      container.innerHTML = '<p>No adoption history available</p>';
    }
  }

  initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
  }
  
  initEventListeners() {
    const favoriteBtn = document.getElementById('favorite-btn');
    favoriteBtn.addEventListener('click', () => this.toggleFavorite());

    const contactBtn = document.getElementById('contact-shelter-btn');
    contactBtn.addEventListener('click', () => this.showContactModal());

    this.initModalEvents();
  }

  initModalEvents() {
    const modal = document.getElementById('contact-modal');
    const closeButtons = modal.querySelectorAll('.modal-close');
    const contactForm = document.getElementById('contact-form');

    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.hideContactModal());
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideContactModal();
      }
    });

    contactForm.addEventListener('submit', (e) => this.handleContactSubmission(e));
  }

  toggleFavorite() {
    const favoriteBtn = document.getElementById('favorite-btn');
    const heartIcon = favoriteBtn.querySelector('.heart-icon');
    favoriteBtn.classList.toggle('favorited');
    if (favoriteBtn.classList.contains('favorited')) {
      heartIcon.textContent = '♥';
    } else {
      heartIcon.textContent = '♡';
    }
    console.log('Toggle favorite for pet:', this.currentPet.id);
  }

  showContactModal() {
    const modal = document.getElementById('contact-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  hideContactModal() {
    const modal = document.getElementById('contact-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  handleContactSubmission(e) {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('contact-name').value,
      email: document.getElementById('contact-email').value,
      message: document.getElementById('contact-message').value,
      petId: this.currentPet.id
    };

    console.log('Contact form submission:', formData);
    alert('Message sent successfully! The shelter will contact you soon.');
    this.hideContactModal();
    
    document.getElementById('contact-form').reset();
  }

  showLoading() {
    document.getElementById('loading-state').style.display = 'flex';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('pet-details-content').style.display = 'none';
  }

  hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('pet-details-content').style.display = 'block';
  }

  showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('pet-details-content').style.display = 'none';
    
    const errorState = document.getElementById('error-state');
    const errorMessage = errorState.querySelector('[data-i18n="errorMessage"]');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    errorState.style.display = 'flex';
  }

  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new PetDetailsPage();
});
