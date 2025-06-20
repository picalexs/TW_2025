import PetService from '../../services/petService.min.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../../global/global.min.js';

class AddPetPage {  
  constructor() {
    this.petService = new PetService();
    this.availableTags = [];
    this.selectedTags = new Set();
    this.tempUserId = 4;
    this.nextTagId = 16;
    this.touchedFields = new Set();
    this.mediaFiles = [];
    this.profileImageIndex = 0;
    this.mediaObjectURLs = [];
    this.init();
  }

  async init() {
    try {
      await this.loadTags();
      this.renderTags();
      this.initializeEventListeners();
      this.enhanceFormValidation();      
      this.initMapSection();
      this.initMediaUpload();
      this.initMedicalSection();
      this.initCareScheduleSection();
    } catch (error) {
      console.error('Error initializing add pet page:', error);
    }
  }

  async loadTags() {
    try {
      this.availableTags = [
        { id: 1, name: 'Friendly' },
        { id: 2, name: 'Senior' },
        { id: 3, name: 'Needs Medication' },
        { id: 4, name: 'Energetic' },
        { id: 5, name: 'Shy' },
        { id: 6, name: 'Loves Fetch' },
        { id: 7, name: 'Good with Kids' },
        { id: 8, name: 'Good with Cats' },
        { id: 9, name: 'Good with Dogs' },
        { id: 10, name: 'House Trained' },
        { id: 11, name: 'Playful' },
        { id: 12, name: 'Calm' },
        { id: 13, name: 'Special Needs' },
        { id: 14, name: 'Large Size' },
        { id: 15, name: 'Small Size' }
      ];
    } catch (error) {
      console.error('Error loading tags:', error);
      this.availableTags = [];
    }
  }  
  
  renderTags() {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) {
      console.error('Tags container not found in DOM');
      return;
    }

    console.log('Rendering tags:', this.availableTags);
    tagsContainer.innerHTML = '';    
    
    this.availableTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag-checkbox';
      
      const isSelected = this.selectedTags.has(parseInt(tag.id));
      if (isSelected) {
        tagElement.classList.add('selected');
      }
      
      tagElement.innerHTML = `
        <input type="checkbox" id="tag-${tag.id}" value="${tag.id}" ${isSelected ? 'checked' : ''}>
        <label for="tag-${tag.id}">
          ${tag.name}
          ${tag.isCustom ? '<span class="custom-badge">Custom</span>' : ''}
        </label>
      `;

      tagElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const checkbox = tagElement.querySelector('input');
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
          this.selectedTags.add(parseInt(tag.id));
          tagElement.classList.add('selected');
        } else {
          this.selectedTags.delete(parseInt(tag.id));
          tagElement.classList.remove('selected');        }
      });

      tagsContainer.appendChild(tagElement);
    });
    
    console.log('Tags rendered successfully, container has', tagsContainer.children.length, 'children');
  }

  initializeEventListeners() {
    const form = document.getElementById('add-pet-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const addTagBtn = document.getElementById('add-tag-btn');
    const newTagModal = document.getElementById('new-tag-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTagBtn = document.getElementById('cancel-tag-btn');
    const newTagForm = document.getElementById('new-tag-form');

    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        window.location.href = '../pets-page/pets-page.html';
      });
    }

    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => this.openNewTagModal());
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeNewTagModal());
    }

    if (cancelTagBtn) {
      cancelTagBtn.addEventListener('click', () => this.closeNewTagModal());
    }

    if (newTagForm) {
      newTagForm.addEventListener('submit', (e) => this.handleNewTagSubmit(e));
    }

    if (newTagModal) {
      newTagModal.addEventListener('click', (e) => {        
        if (e.target === newTagModal) {
          this.closeNewTagModal();
        }
      });
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    try {
      this.setLoading(true);
      
      const formData = new FormData(e.target);
      const petData = this.createPetData(formData);
      
      if (!this.validatePetData(petData)) {
        this.setLoading(false);
        return;
      }      
      
      const result = await this.petService.addPet(petData);
      window.location.href = '../pets-page/pets-page.html';

    } catch (error) {
      console.error('Error adding pet:', error);
      this.setLoading(false);
    }
  }

  createPetData(formData) {
    return {
      name: formData.get('name'),
      species: formData.get('species'),
      breed: formData.get('breed') || 'Mixed Breed',
      age: formData.get('age') ? parseFloat(formData.get('age')) : null,
      gender: formData.get('gender'),
      sizeCategory: formData.get('sizeCategory'),
      weightKg: formData.get('weightKg') ? parseFloat(formData.get('weightKg')) : null,
      color: formData.get('color'),
      healthStatus: formData.get('healthStatus'),
      description: formData.get('description'),
      relationWithOthers: formData.get('relationWithOthers'),
      adoptionStatus: 'available',
      adoptionFee: formData.get('adoptionFee') ? parseFloat(formData.get('adoptionFee')) : null,
      shelterId: this.tempUserId,
      addressId: 1,
      tags: Array.from(this.selectedTags),
      address: formData.get('address'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
      latitude: formData.get('latitude'),
      longitude: formData.get('longitude'),
      mediaFiles: this.mediaFiles,
      profileImageIndex: this.profileImageIndex,
      medicalHistory: this.collectMedicalHistoryData(),
      careResources: this.collectCareResourcesData(),
      careSchedule: this.collectCareScheduleData(),
    };
  }

  collectMedicalHistoryData() {
    const entries = [];
    const medicalEntries = document.querySelectorAll('#medical-history-list .medical-history-entry:not(.medical-history-entry-template)');
    
    medicalEntries.forEach(entry => {
      const description = entry.querySelector('.medical-history-description')?.value?.trim();
      const date = entry.querySelector('.medical-history-date')?.value;
      
      if (description) {
        entries.push({
          description,
          record_date: date || null
        });
      }
    });
    
    return entries;
  }

  collectCareResourcesData() {
    const entries = [];
    const careEntries = document.querySelectorAll('#care-resources-list .care-resources-entry:not(.care-resources-entry-template)');
    
    careEntries.forEach(entry => {
      const type = entry.querySelector('.care-resource-type')?.value?.trim();
      const title = entry.querySelector('.care-resource-title')?.value?.trim();
      const content = entry.querySelector('.care-resource-content')?.value?.trim();
      
      if (type && title && content) {
        entries.push({
          resource_type: type,
          title,
          content
        });
      }
    });
    
    return entries;
  }

  collectCareScheduleData() {
    const entries = [];
    const scheduleEntries = document.querySelectorAll('#care-schedule-list .care-schedule-entry:not(.care-schedule-entry-template)');
    
    scheduleEntries.forEach(entry => {
      const activity = entry.querySelector('.care-schedule-activity')?.value?.trim();
      const hour = entry.querySelector('.care-schedule-hour')?.value;
      const frequency = entry.querySelector('.care-schedule-frequency')?.value;
      
      if (activity && hour && frequency) {
        entries.push({
          activity,
          hour,
          frequency
        });
      }
    });
    
    return entries;
  }
  
  enhanceFormValidation() {
    const nameInput = document.getElementById('pet-name');
    const speciesSelect = document.getElementById('pet-species');
    
    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        this.touchedFields.add('name');
        this.validateField(nameInput, 'name');
      });
      nameInput.addEventListener('input', () => {
        if (this.touchedFields.has('name')) {
          this.clearFieldError(nameInput);
          clearTimeout(this.nameValidationTimeout);
          this.nameValidationTimeout = setTimeout(() => {
            this.validateField(nameInput, 'name');
          }, 500);
        }
      });
    }
    
    if (speciesSelect) {
      speciesSelect.addEventListener('change', () => {
        this.touchedFields.add('species');
        this.validateField(speciesSelect, 'species');
      });
    }
  }
  
  validateField(field, type) {
    const value = field.value.trim();
    const formGroup = field.closest('.form-group');
    
    const existingTooltip = formGroup.querySelector('.field-error-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    let errorMessage = '';
    let isValid = true;
    
    switch (type) {
      case 'name':
        if (!value) {
          errorMessage = 'Pet name is required';
          isValid = false;
        } else if (value.length < 2) {
          errorMessage = 'Pet name must be at least 2 characters';
          isValid = false;
        }
        break;
      
      case 'species':
        if (!value) {
          errorMessage = 'Please select a species';
          isValid = false;
        }
        break;
      
      default:
        isValid = true;
    }
    
    if (!isValid) {
      field.classList.add('error');
      this.showFieldError(formGroup, errorMessage);
    } else {
      field.classList.remove('error');
    }
    
    return isValid;
  }

  showFieldError(formGroup, message) {
    const tooltip = document.createElement('div');
    tooltip.className = 'field-error-tooltip';
    tooltip.textContent = message;
    
    formGroup.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.classList.remove('show');
        setTimeout(() => {
          if (tooltip.parentNode) {
            tooltip.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  clearFieldError(field) {
    field.classList.remove('error');
    const formGroup = field.closest('.form-group');
    const existingTooltip = formGroup.querySelector('.field-error-tooltip');
    if (existingTooltip) {
      existingTooltip.classList.remove('show');
      setTimeout(() => {
        if (existingTooltip.parentNode) {
          existingTooltip.remove();
        }
      }, 300);
    }
  }  
  
  validatePetData(petData) {
    let isValid = true;

    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(control => {
      control.classList.remove('error');
    });
    
    document.querySelectorAll('.field-error-tooltip').forEach(tooltip => {
      tooltip.remove();
    });

    if (!petData.name) {
      const nameInput = document.getElementById('pet-name');
      if (nameInput) {
        nameInput.classList.add('error');
        this.touchedFields.add('name');
        const formGroup = nameInput.closest('.form-group');
        this.showFieldError(formGroup, 'Pet name is required');
      }
      isValid = false;
    } else if (petData.name.length < 2) {
      const nameInput = document.getElementById('pet-name');
      if (nameInput) {
        nameInput.classList.add('error');
        this.touchedFields.add('name');
        const formGroup = nameInput.closest('.form-group');
        this.showFieldError(formGroup, 'Pet name must be at least 2 characters');
      }
      isValid = false;
    }

    if (!petData.species) {
      const speciesSelect = document.getElementById('pet-species');
      if (speciesSelect) {
        speciesSelect.classList.add('error');
        this.touchedFields.add('species');
        const formGroup = speciesSelect.closest('.form-group');
        this.showFieldError(formGroup, 'Please select a species');
      }
      isValid = false;
    }

    if (!petData.gender) {
      const genderSelect = document.getElementById('pet-gender');
      if (genderSelect) {
        genderSelect.classList.add('error');
        this.touchedFields.add('gender');
        const formGroup = genderSelect.closest('.form-group');
        this.showFieldError(formGroup, 'Please select a gender');
      }
      isValid = false;
    }

    if (!petData.healthStatus) {
      const healthStatusSelect = document.getElementById('pet-health-status');
      if (healthStatusSelect) {
        healthStatusSelect.classList.add('error');
        this.touchedFields.add('healthStatus');
        const formGroup = healthStatusSelect.closest('.form-group');
        this.showFieldError(formGroup, 'Please select a health status');
      }
      isValid = false;
    }

    if (!petData.city) {
      const cityInput = document.getElementById('pet-city');
      if (cityInput) {
        cityInput.classList.add('error');
        this.touchedFields.add('city');
        const formGroup = cityInput.closest('.form-group');
        this.showFieldError(formGroup, 'City is required');
      }
      isValid = false;
    }

    if (!petData.country) {
      const countryInput = document.getElementById('pet-country');
      if (countryInput) {
        countryInput.classList.add('error');
        this.touchedFields.add('country');
        const formGroup = countryInput.closest('.form-group');
        this.showFieldError(formGroup, 'Country is required');
      }
      isValid = false;
    }

    if (petData.adoptionFee === null || petData.adoptionFee === '' || isNaN(petData.adoptionFee)) {
      const feeInput = document.getElementById('adoption-fee');
      if (feeInput) {
        feeInput.classList.add('error');
        this.touchedFields.add('adoptionFee');
        const formGroup = feeInput.closest('.form-group');
        this.showFieldError(formGroup, 'Adoption fee is required');
      }
      isValid = false;
    }

    const medicalEntries = document.querySelectorAll('#medical-history-list .medical-history-entry:not(.medical-history-entry-template)');
    medicalEntries.forEach((entry, index) => {
      const description = entry.querySelector('.medical-history-description');
      if (description && !description.value.trim()) {
        description.classList.add('error');
        const formGroup = description.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Medical history description is required');
        isValid = false;
      }
    });

    const careResourceEntries = document.querySelectorAll('#care-resources-list .care-resources-entry:not(.care-resources-entry-template)');
    careResourceEntries.forEach((entry, index) => {
      const type = entry.querySelector('.care-resource-type');
      const title = entry.querySelector('.care-resource-title');
      const content = entry.querySelector('.care-resource-content');

      if (type && !type.value.trim()) {
        type.classList.add('error');
        const formGroup = type.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Care resource type is required');
        isValid = false;
      }

      if (title && !title.value.trim()) {
        title.classList.add('error');
        const formGroup = title.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Care resource title is required');
        isValid = false;
      }

      if (content && !content.value.trim()) {
        content.classList.add('error');
        const formGroup = content.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Care resource content is required');
        isValid = false;
      }
    });

    // Validate care schedule entries - if any exist, all fields must be filled
    const careScheduleEntries = document.querySelectorAll('#care-schedule-list .care-schedule-entry:not(.care-schedule-entry-template)');
    careScheduleEntries.forEach((entry, index) => {
      const activity = entry.querySelector('.care-schedule-activity');
      const hour = entry.querySelector('.care-schedule-hour');
      const frequency = entry.querySelector('.care-schedule-frequency');

      if (activity && !activity.value.trim()) {
        activity.classList.add('error');
        const formGroup = activity.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Care schedule activity is required');
        isValid = false;
      }

      if (hour && !hour.value.trim()) {
        hour.classList.add('error');
        const formGroup = hour.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Care schedule time is required');
        isValid = false;
      }

      if (frequency && !frequency.value.trim()) {
        frequency.classList.add('error');
        const formGroup = frequency.closest('.form-group') || entry;
        this.showFieldError(formGroup, 'Care schedule frequency is required');
        isValid = false;
      }
    });

    return isValid;
  }

  setLoading(isLoading) {
    const submitBtn = document.getElementById('submit-btn');
    if (!submitBtn) {
      console.error('Submit button not found');
      return;
    }
    
    const loadingSpinner = submitBtn.querySelector('.loading-spinner');
    const btnText = submitBtn.querySelector('.btn-text');
    
    if (!loadingSpinner || !btnText) {
      console.error('Button structure incomplete - missing spinner or text elements');
      return;
    }

    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      loadingSpinner.style.display = 'block';
      btnText.style.opacity = '0';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      loadingSpinner.style.display = 'none';
      btnText.style.opacity = '1';
    }
  }

  openNewTagModal() {
    const modal = document.getElementById('new-tag-modal');
    const input = document.getElementById('new-tag-name');
    if (modal && input) {
      modal.classList.add('show');
      input.focus();
      input.value = '';
      this.clearTagError();
    }
  }

  closeNewTagModal() {
    const modal = document.getElementById('new-tag-modal');
    if (modal) {
      modal.classList.remove('show');
      this.clearTagError();
    }
  }

  clearTagError() {
    const errorElement = document.getElementById('tag-name-error');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('show');
    }
  }

  showTagError(message) {
    const errorElement = document.getElementById('tag-name-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }
  }

  async handleNewTagSubmit(e) {
    e.preventDefault();
    
    const tagName = document.getElementById('new-tag-name').value.trim();
    
    if (!tagName) {
      this.showTagError('Tag name is required');
      return;
    }

    if (tagName.length < 2) {
      this.showTagError('Tag name must be at least 2 characters long');
      return;
    }

    if (tagName.length > 50) {
      this.showTagError('Tag name must be less than 50 characters');
      return;
    }

    const existingTag = this.availableTags.find(tag => 
      tag.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (existingTag) {
      this.showTagError('A tag with this name already exists');
      return;
    }

    try {
      this.setTagModalLoading(true);
      
      const newTag = {
        id: this.nextTagId++,
        name: tagName,
        isCustom: true
      };
      
      this.availableTags.push(newTag);
      this.selectedTags.add(newTag.id);
      this.renderTags();

      this.closeNewTagModal();
    } catch (error) {
      console.error('Error creating tag:', error);
      this.showTagError('Failed to create tag. Please try again.');
    } finally {
      this.setTagModalLoading(false);
    }
  }
  
  setTagModalLoading(isLoading) {
    const submitBtn = document.getElementById('create-tag-btn');
    if (!submitBtn) {
      console.error('Create tag button not found');
      return;
    }
    
    const loadingSpinner = submitBtn.querySelector('.loading-spinner');
    const btnText = submitBtn.querySelector('.btn-text');
    
    if (!loadingSpinner || !btnText) {
      console.error('Tag button structure incomplete - missing spinner or text elements');
      return;
    }

    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      loadingSpinner.style.display = 'block';
      btnText.style.opacity = '0';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      loadingSpinner.style.display = 'none';
      btnText.style.opacity = '1';
    }
  }

  showMessage(message, type) {
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.className = `form-message ${type} show`;
    messageElement.textContent = message;

    
    const form = document.getElementById('add-pet-form');
    form.insertBefore(messageElement, form.firstChild);

    if (type === 'error') {
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.remove();
        }
      }, 5000);
    }
  }

  initMapSection() {
    const mapContainer = document.getElementById('pet-location-map');
    if (!mapContainer) return;

    const defaultLat = 45.9432;
    const defaultLng = 24.9668;
    const defaultZoom = 6.5;

    mapContainer.style.height = '30rem';
    mapContainer.style.borderRadius = '10px';
    mapContainer.style.marginTop = '1rem';

    this.map = L.map('pet-location-map').setView([defaultLat, defaultLng], defaultZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.locationMarker = null;

    let latInput = document.getElementById('pet-latitude');
    let lngInput = document.getElementById('pet-longitude');
    if (!latInput) {
      latInput = document.createElement('input');
      latInput.type = 'hidden';
      latInput.id = 'pet-latitude';
      latInput.name = 'latitude';
      mapContainer.parentElement.appendChild(latInput);
    }
    if (!lngInput) {
      lngInput = document.createElement('input');
      lngInput.type = 'hidden';
      lngInput.id = 'pet-longitude';
      lngInput.name = 'longitude';
      mapContainer.parentElement.appendChild(lngInput);
    }

    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.setMapMarker(lat, lng);
    });
    const locateBtn = document.getElementById('locate-on-map');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => this.geocodeAddress());
    }

    const cityInput = document.getElementById('pet-city');
    const countryInput = document.getElementById('pet-country');
    const addressInput = document.getElementById('pet-address');
    const postalCodeInput = document.getElementById('pet-postal-code');
    const autoGeocode = () => {
      if (
        cityInput?.value.trim() &&
        countryInput?.value.trim() &&
        addressInput?.value.trim() &&
        postalCodeInput?.value.trim()
      ) {
        this.geocodeAddress();
      }
    };
    [cityInput, countryInput, addressInput, postalCodeInput].forEach(input => {
      if (input) {
        input.addEventListener('change', autoGeocode);
        input.addEventListener('blur', autoGeocode);
      }
    });
  }

  setMapMarker(lat, lng) {
    if (this.locationMarker) {
      this.locationMarker.setLatLng([lat, lng]);
    } else {
      this.locationMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.locationMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        this.updateLatLngFields(pos.lat, pos.lng);
      });
    }    this.map.setView([lat, lng], 14);
    this.updateLatLngFields(lat, lng);
  }
  updateLatLngFields(lat, lng) {
    document.getElementById('pet-latitude').value = lat;
    document.getElementById('pet-longitude').value = lng;
  }

  async geocodeAddress() {
    const city = document.getElementById('pet-city')?.value || '';
    const country = document.getElementById('pet-country')?.value || '';
    const address = document.getElementById('pet-address')?.value || '';
    const postalCode = document.getElementById('pet-postal-code')?.value || '';
    const query = encodeURIComponent([address, city, postalCode, country].filter(Boolean).join(', '));
    if (!query) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        this.setMapMarker(parseFloat(lat), parseFloat(lon));
      } else {
        alert('Location not found. Please refine the address.');
      }
    } catch (err) {
      alert('Error locating address.');
    }
  }

  initMediaUpload() {
    const mediaInput = document.getElementById('pet-media');
    const previewContainer = document.getElementById('media-preview');
    if (!mediaInput || !previewContainer) return;
    mediaInput.addEventListener('change', (e) => {
      this.mediaObjectURLs.forEach(url => URL.revokeObjectURL(url));
      this.mediaObjectURLs = [];
      this.mediaFiles = Array.from(e.target.files);
      this.profileImageIndex = 0;
      this.renderMediaPreview();
    });
  }

  renderMediaPreview() {
    const previewContainer = document.getElementById('media-preview');
    previewContainer.innerHTML = '';
    if (!this.mediaFiles.length) return;
    this.mediaObjectURLs = this.mediaFiles.map((file, idx) => {
      if (this.mediaObjectURLs[idx]) return this.mediaObjectURLs[idx];
      return URL.createObjectURL(file);
    });
    this.mediaFiles.forEach((file, idx) => {
      const mediaWrapper = document.createElement('div');
      mediaWrapper.className = 'media-thumb-wrapper' + (idx === this.profileImageIndex ? ' selected' : '');
      let mediaElem;
      if (file.type.startsWith('image/')) {
        mediaElem = document.createElement('img');
        mediaElem.src = this.mediaObjectURLs[idx];
        mediaElem.className = 'media-thumb';
      } else if (file.type.startsWith('video/')) {
        mediaElem = document.createElement('video');
        mediaElem.src = this.mediaObjectURLs[idx];
        mediaElem.className = 'media-thumb';
        mediaElem.controls = true;
      }
      mediaWrapper.appendChild(mediaElem);
      mediaWrapper.addEventListener('click', () => {
        this.profileImageIndex = idx;
        this.renderMediaPreview();
      });
      previewContainer.appendChild(mediaWrapper);
    });
  }

  initMedicalSection() {
    const addMedicalHistoryBtn = document.getElementById('add-medical-history-btn');
    const addCareResourceBtn = document.getElementById('add-care-resource-btn');

    if (addMedicalHistoryBtn) {
      addMedicalHistoryBtn.addEventListener('click', () => this.addMedicalHistoryEntry());
    }

    if (addCareResourceBtn) {
      addCareResourceBtn.addEventListener('click', () => this.addCareResourceEntry());
    }
  }

  initCareScheduleSection() {
    const addCareScheduleBtn = document.getElementById('add-care-schedule-btn');

    if (addCareScheduleBtn) {
      addCareScheduleBtn.addEventListener('click', () => this.addCareScheduleEntry());
    }
  }

  addMedicalHistoryEntry() {
    const template = document.querySelector('.medical-history-entry-template');
    const container = document.getElementById('medical-history-list');
    
    if (!template || !container) return;
    
    const clone = template.cloneNode(true);
    clone.style.display = 'block';
    clone.classList.remove('medical-history-entry-template');
    
    const description = clone.querySelector('.medical-history-description');
    if (description) {
      description.addEventListener('blur', () => {
        this.validateMedicalField(description, 'Medical history description is required');
      });
      description.addEventListener('input', () => {
        if (description.value.trim()) {
          description.classList.remove('error');
          this.clearFieldError(description);
        }
      });
    }
    
    const removeBtn = clone.querySelector('.remove-medical-history-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        clone.remove();
      });
    }
    
    container.appendChild(clone);
  }

  addCareResourceEntry() {
    const template = document.querySelector('.care-resources-entry-template');
    const container = document.getElementById('care-resources-list');
    
    if (!template || !container) return;
    
    const clone = template.cloneNode(true);
    clone.style.display = 'block';
    clone.classList.remove('care-resources-entry-template');
    
    const type = clone.querySelector('.care-resource-type');
    const title = clone.querySelector('.care-resource-title');
    const content = clone.querySelector('.care-resource-content');
    
    if (type) {
      type.addEventListener('blur', () => {
        this.validateMedicalField(type, 'Care resource type is required');
      });
      type.addEventListener('change', () => {
        if (type.value.trim()) {
          type.classList.remove('error');
          this.clearFieldError(type);
        }
      });
    }
    
    if (title) {
      title.addEventListener('blur', () => {
        this.validateMedicalField(title, 'Care resource title is required');
      });
      title.addEventListener('input', () => {
        if (title.value.trim()) {
          title.classList.remove('error');
          this.clearFieldError(title);
        }
      });
    }
    
    if (content) {
      content.addEventListener('blur', () => {
        this.validateMedicalField(content, 'Care resource content is required');
      });
      content.addEventListener('input', () => {
        if (content.value.trim()) {
          content.classList.remove('error');
          this.clearFieldError(content);
        }
      });
    }
    
    const removeBtn = clone.querySelector('.remove-care-resource-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        clone.remove();
      });
    }
    container.appendChild(clone);
  }

  addCareScheduleEntry() {
    const template = document.querySelector('.care-schedule-entry-template');
    const container = document.getElementById('care-schedule-list');
    
    if (!template || !container) return;
    
    const clone = template.cloneNode(true);
    clone.style.display = 'block';
    clone.classList.remove('care-schedule-entry-template');
    
    const activity = clone.querySelector('.care-schedule-activity');
    const hour = clone.querySelector('.care-schedule-hour');
    const frequency = clone.querySelector('.care-schedule-frequency');
    
    if (activity) {
      activity.addEventListener('blur', () => {
        this.validateMedicalField(activity, 'Care schedule activity is required');
      });
      activity.addEventListener('input', () => {
        if (activity.value.trim()) {
          activity.classList.remove('error');
          this.clearFieldError(activity);
        }
      });
    }
    
    if (hour) {
      hour.addEventListener('blur', () => {
        this.validateMedicalField(hour, 'Care schedule time is required');
      });
      hour.addEventListener('change', () => {
        if (hour.value.trim()) {
          hour.classList.remove('error');
          this.clearFieldError(hour);
        }
      });
    }
    
    if (frequency) {
      frequency.addEventListener('blur', () => {
        this.validateMedicalField(frequency, 'Care schedule frequency is required');
      });
      frequency.addEventListener('change', () => {
        if (frequency.value.trim()) {
          frequency.classList.remove('error');
          this.clearFieldError(frequency);
        }
      });
    }
    
    const removeBtn = clone.querySelector('.remove-care-schedule-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        clone.remove();
      });
    }
    
    container.appendChild(clone);
  }

  validateMedicalField(field, errorMessage) {
    if (!field.value.trim()) {
      field.classList.add('error');
      const formGroup = field.closest('.form-group') || field.parentElement;
      this.showFieldError(formGroup, errorMessage);
      return false;
    } else {
      field.classList.remove('error');
      this.clearFieldError(field);
      return true;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new AddPetPage();
});