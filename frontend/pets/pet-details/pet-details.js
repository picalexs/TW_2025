import PetService from '../../services/petService.min.js';
import FavoritesService from '../../services/favoritesService.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../../global/global.min.js';

class PetDetailsPage {
  constructor() {
    this.petService = new PetService();
    this.favoritesService = new FavoritesService();
    this.currentPet = null;
    this.currentImageIndex = 0;
    this.map = null;
    this.mapInitialized = false;
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
    this.checkPetOwnership(pet);
    this.initializeFavoriteState(pet);
  }
  
  renderPetHeader(pet) {
    const mainImage = document.getElementById('main-pet-image');
    
    let profileImagePath;
    if (pet.media && pet.media.length > 0) {
      const imageMedia = pet.media.find(media => media.type === 'image' || !media.type);
      profileImagePath = imageMedia ? imageMedia.filePath : pet.imagePath;
    } else {
      profileImagePath = pet.imagePath;
    }
    
    const imagePath = window.ImagePathHandler.processPetImagePath(profileImagePath);
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
    
    if (pet.media && pet.media.length > 0) {
      const mediaImages = pet.media.filter(media => media.type === 'image' || !media.type);
      
      mediaImages.forEach((media, index) => {
        allImages.push({
          filePath: media.filePath,
          isProfile: index === 0
        });
      });
    }

    else if (pet.imagePath) {
      allImages.push({
        filePath: pet.imagePath,
        isProfile: true
      });
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
      
      // Use the shelter.id from the backend
      const shelterId = shelter.id;
      console.log('Shelter ID from backend:', shelterId);
      console.log('Full shelter object:', shelter);
      
      if (shelterId) {
        const profileLink = `../profile/profile.html?id=${shelterId}`;
        console.log('Generated profile link:', profileLink);
        
        container.innerHTML = `
          <div class="shelter-contact shelter-clickable" style="cursor:pointer;transition:all 0.3s;padding:0.75rem;border-radius:8px;border:1px solid transparent;">
            <img src="${profilePic}" alt="${name}" class="shelter-avatar">
            <div class="shelter-details">
              <h4>${name}</h4>
              ${shelter.email ? `<p>Email: ${shelter.email}</p>` : ''}
              ${shelter.phone ? `<p>Phone: ${shelter.phone}</p>` : ''}
            </div>
          </div>
        `;
        
        const shelterElement = container.querySelector('.shelter-clickable');
        if (shelterElement) {
          console.log('Adding click listener to shelter element');
          
          shelterElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Shelter clicked, navigating to:', profileLink);
            window.location.href = profileLink;
          });
          
          shelterElement.addEventListener('mouseenter', () => {
            shelterElement.style.backgroundColor = 'rgba(var(--primary-color-rgb), 0.1)';
            shelterElement.style.borderColor = 'var(--primary-color)';
            shelterElement.style.transform = 'translateY(-2px)';
          });
          
          shelterElement.addEventListener('mouseleave', () => {
            shelterElement.style.backgroundColor = 'transparent';
            shelterElement.style.borderColor = 'transparent';
            shelterElement.style.transform = 'translateY(0)';
          });
          
          console.log('Event listeners added successfully');
        } else {
          console.error('Could not find shelter clickable element');
        }
      } else {
        console.log('No shelter ID found, rendering non-clickable version');
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
      }
      
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
      btn.addEventListener('click', async () => {
        const targetTab = btn.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        if (targetTab === 'location' && !this.mapInitialized) {
          setTimeout(() => this.initMap(), 100);
        }
      });
    });
  }
  
  initEventListeners() {
    const favoriteBtn = document.getElementById('favorite-btn');
    favoriteBtn.addEventListener('click', () => this.toggleFavorite());

    const contactBtn = document.getElementById('contact-shelter-btn');
    contactBtn.addEventListener('click', () => this.showContactModal());

    const editBtn = document.getElementById('edit-pet-btn');
    editBtn.addEventListener('click', () => this.editPet());

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

  async toggleFavorite() {
    const favoriteBtn = document.getElementById('favorite-btn');
    const heartIcon = favoriteBtn.querySelector('.heart-icon');
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      alert('Please log in to use favorites.');
      return;
    }
    const isFavorited = favoriteBtn.classList.contains('favorited');
    favoriteBtn.disabled = true;
    try {
      if (isFavorited) {
        await this.favoritesService.removeFavorite(this.currentPet.id);
        favoriteBtn.classList.remove('favorited');
        heartIcon.classList.remove('favorited');
        heartIcon.innerHTML = '&#10084;';
      } else {
        await this.favoritesService.addFavorite(this.currentPet.id);
        favoriteBtn.classList.add('favorited');
        heartIcon.classList.add('favorited');
        heartIcon.innerHTML = '&#10084;';
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
      if (err.message && err.message.includes('already exists')) {
        favoriteBtn.classList.add('favorited');
        heartIcon.classList.add('favorited');
        heartIcon.innerHTML = '&#10084;';
      } else {
        alert('Failed to update favorite.');
      }
    } finally {
      favoriteBtn.disabled = false;
    }
  }

  async initializeFavoriteState(pet) {
    const favoriteBtn = document.getElementById('favorite-btn');
    const heartIcon = favoriteBtn.querySelector('.heart-icon');
    if (localStorage.getItem('isLoggedIn') === 'true') {
      try {
        const favorites = await this.favoritesService.getFavorites();
        const isFav = favorites.some(f => f.id === pet.id || f.ID === pet.id);
        if (isFav) {
          favoriteBtn.classList.add('favorited');
          heartIcon.classList.add('favorited');
          heartIcon.innerHTML = '&#10084;';
        } else {
          favoriteBtn.classList.remove('favorited');
          heartIcon.classList.remove('favorited');
          heartIcon.innerHTML = '&#10084;';
        }
        favoriteBtn.style.display = 'flex';
      } catch (e) {
        console.error('Error checking favorite state:', e);
        favoriteBtn.classList.remove('favorited');
        heartIcon.classList.remove('favorited');
        heartIcon.innerHTML = '&#10084;';
        favoriteBtn.style.display = 'flex';
      }
    } else {
      favoriteBtn.classList.remove('favorited');
      heartIcon.classList.remove('favorited');
      heartIcon.innerHTML = '&#10084;';
      favoriteBtn.style.display = 'flex';
    }
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
  async initMap() {
    if (this.mapInitialized || !window.L) {
      return;
    }

    try {
      let lat = 44.4268;
      let lng = 26.1025;
      let address = 'Location not available';

      if (this.currentPet && this.currentPet.address) {
        const addr = this.currentPet.address;
        const addressParts = [];
        if (addr.street) addressParts.push(addr.street);
        if (addr.city) addressParts.push(addr.city);
        if (addr.country) addressParts.push(addr.country);
        
        if (addressParts.length > 0) {
          address = addressParts.join(', ');
          let cityCoords = this.getCityCoordinates(addr.city);
        
          if (!cityCoords && addr.city) {
            cityCoords = await this.geocodeCity(addr.city, addr.country);
          }
          
          if (cityCoords) {
            lat = cityCoords.lat;
            lng = cityCoords.lng;
          }
        }
      }

      this.map = L.map('map').setView([lat, lng], 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors & CartoDB',
        tileSize: 256,
        detectRetina: true,
        maxZoom: 18
      }).addTo(this.map);

      const marker = L.marker([lat, lng]).addTo(this.map);
      marker.bindPopup(`<b>Pet Location</b><br>${address}`).openPopup();

      this.mapInitialized = true;
      console.log('Map initialized successfully with coordinates:', lat, lng);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  async geocodeCity(city, country) {
    try {
      const query = country ? `${city}, ${country}` : city;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }

  getCityCoordinates(city) {
    if (!city) return null;

    const cityCoords = {
      'london': { lat: 51.5074, lng: -0.1278 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'bucharest': { lat: 44.4268, lng: 26.1025 },
      'iasi': { lat: 47.1585, lng: 27.6014 },
      'budapest': { lat: 47.4979, lng: 19.0402 },
      'vienna': { lat: 48.2082, lng: 16.3738 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
      'madrid': { lat: 40.4168, lng: -3.7038 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 }
    };
    
    const normalizedCity = city.toLowerCase().trim();
    return cityCoords[normalizedCity] || null;
  }  
  
  checkPetOwnership(pet) {//ANYONE can edit for now -needs JWT auth later
    console.log('checkPetOwnership called for pet:', pet.id);
    const editBtn = document.getElementById('edit-pet-btn');
    if (editBtn) {
      editBtn.style.display = 'inline-block';
      console.log('Edit button shown for pet:', pet.id);
    } else {
      console.error('Edit button not found in DOM');
    }
  }

  editPet() {
    if (!this.currentPet) {
      console.error('No pet data available for editing');
      return;
    }

    const editUrl = `../add-pet/add-pet.html?edit=true&id=${this.currentPet.id}`;
    window.location.href = editUrl;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new PetDetailsPage();
});
