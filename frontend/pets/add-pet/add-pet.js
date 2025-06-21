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
    this.isEditMode = false;
    this.editPetId = null;
    this.currentPetData = null;
    this.map = null;
    this.mapMarker = null;
    this.init();
  }

  async init() {
    try {
      this.checkEditMode();
      
      await this.loadTags();
      this.renderTags();      
      this.initializeEventListeners();
      this.enhanceFormValidation();      
      this.initMediaUpload();
      this.initMedicalSection();
      this.initCareScheduleSection();
      
      if (this.isEditMode && this.editPetId) {
        await this.loadPetDataForEdit();
        this.initMap();
      } else {
        // For new pets, initialize map with default location
        this.initMap();
      }
    } catch (error) {
      console.error('Error initializing add pet page:', error);
    }
  }
  checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    this.isEditMode = urlParams.get('edit') === 'true';
    this.editPetId = urlParams.get('id');
    
    if (this.isEditMode) {
      console.log('Edit mode detected for pet ID:', this.editPetId);
      this.updateUIForEditMode();
    }
  }

  updateUIForEditMode() {
    // Update page title and heading
    const pageTitle = document.querySelector('title');
    if (pageTitle) {
      pageTitle.textContent = 'Edit Pet';
    }

    const heading = document.querySelector('h1');
    if (heading) {
      heading.textContent = 'Edit Pet';
    }

    const description = document.querySelector('.form-header p');
    if (description) {
      description.textContent = 'Update the pet information below.';
    }

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      const btnText = submitBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Update Pet';
      }
    }
  }  async loadPetDataForEdit() {
    try {
      console.log('Loading pet data for edit, ID:', this.editPetId);
      const pet = await this.petService.getPetById(this.editPetId);
      this.currentPetData = pet;
      console.log('Loaded pet data:', pet);
      
      await this.populateFormWithPetData(pet);
    } catch (error) {
      console.error('Error loading pet data for edit:', error);
      alert('Error loading pet data: ' + error.message);
      // Redirect back to pets page on error
      window.location.href = '../pets-page/pets-page.html';
    }
  }
  async populateFormWithPetData(pet) {
    // Basic information
    this.setFieldValue('pet-name', pet.name);
    this.setFieldValue('pet-species', pet.species);
    this.setFieldValue('pet-breed', pet.breed);
    this.setFieldValue('pet-age', pet.age);
    this.setFieldValue('pet-gender', pet.gender);
    this.setFieldValue('pet-size', pet.sizeCategory);
    this.setFieldValue('pet-weight', pet.weightKg);
    this.setFieldValue('pet-color', pet.color);
    
    // Description and behavior
    this.setFieldValue('pet-description', pet.description);
    this.setFieldValue('pet-relations', pet.relationWithOthers);
    
    // Health information
    this.setFieldValue('pet-health-status', pet.healthStatus);      
    
    // Location information
    if (pet.address) {
      this.setFieldValue('pet-city', pet.address.city);
      this.setFieldValue('pet-country', pet.address.country);
      this.setFieldValue('pet-address', pet.address.address);
      this.setFieldValue('pet-postal-code', pet.address.postalCode);
    }
    
    // Adoption information
    this.setFieldValue('adoption-status', pet.adoptionStatus);
    this.setFieldValue('adoption-fee', pet.adoptionFee);
      // Tags
    if (pet.tags && Array.isArray(pet.tags)) {
      if (this.availableTags.length === 0) {
        await this.loadTags();
        this.renderTags();
      }
      
      pet.tags.forEach(tag => {
        const tagId = typeof tag === 'object' ? tag.id : tag;
        this.selectedTags.add(parseInt(tagId));
      });
      this.renderTags(); // Re-render to show selected tags
    }
    
    // Media files - display existing media
    if (pet.media && Array.isArray(pet.media)) {
      this.displayExistingMedia(pet.media);
    }
    
    // Medical history, care resources, and care schedule
    this.populateMedicalData(pet);
  }

  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value !== null && value !== undefined) {
      if (field.tagName === 'SELECT') {
        // Use the improved dropdown value setting method
        this.setDropdownValue(field, value);
      } else {
        field.value = value;        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      console.log(`✓ Set field "${fieldId}" to value "${value}"`);
    }
  }

  displayExistingMedia(mediaArray) {
    const mediaPreview = document.getElementById('media-preview');
    if (!mediaPreview || !mediaArray.length) return;

    mediaPreview.innerHTML = '';
    
    mediaArray.forEach((mediaItem, index) => {
      const mediaElement = document.createElement('div');
      mediaElement.className = 'media-preview-item';
      
      if (index === 0) {
        mediaElement.classList.add('profile-image');
      }
      
      if (mediaItem.type === 'image') {
        mediaElement.innerHTML = `
          <img src="${mediaItem.path}" alt="Pet media" />
          <div class="media-controls">
            <button type="button" class="set-profile-btn ${index === 0 ? 'active' : ''}" 
                    onclick="setAsProfile(${index})">
              ${index === 0 ? 'Profile' : 'Set as Profile'}
            </button>
          </div>
        `;
      } else if (mediaItem.type === 'video') {
        mediaElement.innerHTML = `
          <video src="${mediaItem.path}" controls></video>
          <div class="media-controls">
            <span>Video</span>
          </div>
        `;      
      }
      
      mediaPreview.appendChild(mediaElement);
    });
  }

  populateMedicalData(pet) {
    console.log('Populating medical data:', pet);
    
    // Populate medical history entries
    if (pet.medicalHistory && Array.isArray(pet.medicalHistory)) {
      // Filter out empty entries
      const validMedicalHistory = pet.medicalHistory.filter(entry => 
        entry && (entry.description || entry.date || entry.record_date)
      );
      
      validMedicalHistory.forEach((entry, index) => {
        console.log(`Populating medical history entry ${index + 1}:`, entry);
        this.addMedicalHistoryEntry();
        const lastEntry = document.querySelector('#medical-history-list .medical-history-entry:last-child');
        if (lastEntry) {
          const descField = lastEntry.querySelector('.medical-history-description');
          const dateField = lastEntry.querySelector('.medical-history-date');
          
          if (descField && entry.description) {
            descField.value = entry.description;
            console.log(`✓ Set medical history description: "${entry.description}"`);
          }
          if (dateField && entry.date) {
            // Format date properly for input field
            const date = new Date(entry.date);
            if (!isNaN(date.getTime())) {
              dateField.value = date.toISOString().split('T')[0];
              console.log(`✓ Set medical history date: "${dateField.value}"`);
            }
          } else if (dateField && entry.record_date) {
            // Handle alternative date field name
            const date = new Date(entry.record_date);
            if (!isNaN(date.getTime())) {
              dateField.value = date.toISOString().split('T')[0];
              console.log(`✓ Set medical history record_date: "${dateField.value}"`);
            }
          } else if (dateField && !entry.date && !entry.record_date) {
            // Set today's date as fallback for entries without dates
            const today = new Date().toISOString().split('T')[0];
            dateField.value = today;
            console.log(`✓ Set fallback date to today: "${today}"`);
          }
        }
      });
    }
    
    // Populate care resources
    if (pet.careResources && Array.isArray(pet.careResources)) {
      const validCareResources = pet.careResources.filter(resource => 
        resource && (resource.type || resource.resource_type || resource.title || resource.content)
      );
      
      validCareResources.forEach((resource, index) => {
        console.log(`Populating care resource entry ${index + 1}:`, resource);
        this.addCareResourceEntry();
        const lastEntry = document.querySelector('#care-resources-list .care-resources-entry:last-child');
        if (lastEntry) {
          const typeField = lastEntry.querySelector('.care-resource-type');
          const titleField = lastEntry.querySelector('.care-resource-title');
          const contentField = lastEntry.querySelector('.care-resource-content');
            if (typeField && (resource.type || resource.resource_type)) {
            const resourceType = resource.type || resource.resource_type;
            this.setDropdownValue(typeField, resourceType);
            console.log(`✓ Set care resource type: "${resourceType}"`);
          } else if (typeField) {
            this.setDropdownValue(typeField, 'general');
            console.log(`✓ Set care resource type to default "general"`);
          }
          if (titleField && resource.title) {
            titleField.value = resource.title;
            console.log(`✓ Set care resource title: "${resource.title}"`);
          }
          if (contentField && resource.content) {
            contentField.value = resource.content;
            console.log(`✓ Set care resource content: "${resource.content}"`);
          }
        }
      });
    }
    
    // Populate care schedule
    if (pet.careSchedule && Array.isArray(pet.careSchedule)) {
      const validCareSchedule = pet.careSchedule.filter(schedule => 
        schedule && (schedule.activity || schedule.hour || schedule.frequency)
      );
      
      validCareSchedule.forEach((schedule, index) => {
        console.log(`Populating care schedule entry ${index + 1}:`, schedule);
        this.addCareScheduleEntry();
        const lastEntry = document.querySelector('#care-schedule-list .care-schedule-entry:last-child');
        if (lastEntry) {
          const activityField = lastEntry.querySelector('.care-schedule-activity');
          const hourField = lastEntry.querySelector('.care-schedule-hour');
          const frequencyField = lastEntry.querySelector('.care-schedule-frequency');
          
          if (activityField && schedule.activity) {
            activityField.value = schedule.activity;
            console.log(`✓ Set care schedule activity: "${schedule.activity}"`);
          }
          if (hourField && schedule.hour) {
            hourField.value = schedule.hour;
            console.log(`✓ Set care schedule hour: "${schedule.hour}"`);
          }          if (frequencyField && schedule.frequency) {
            this.setDropdownValue(frequencyField, schedule.frequency);
            console.log(`✓ Set care schedule frequency: "${schedule.frequency}"`);
          } else if (frequencyField) {
            this.setDropdownValue(frequencyField, 'other');
            console.log(`✓ Set care schedule frequency to default "other"`);
          }
        }
      });
    }
  }

  setDropdownValue(selectElement, value) {
    if (!selectElement || !value) return;
    
    console.log(`Setting dropdown value "${value}" for element with options:`, 
      Array.from(selectElement.options).map(opt => `"${opt.value}"`));
    
    let mappedValue = value;
    
    if (selectElement.id === 'pet-health-status') {
      if (value.toLowerCase() === 'healthy') {
        mappedValue = 'excellent';
        console.log(`✓ Mapped "healthy" to "excellent" for health status`);      
      } else if (value.toLowerCase() === 'needs medication') {
        mappedValue = 'special needs';
        console.log(`✓ Mapped "needs medication" to "special needs" for health status`);
      }
    }
    
    const directMatch = Array.from(selectElement.options).find(opt => opt.value === mappedValue);
    if (directMatch) {
      selectElement.value = mappedValue;
      console.log(`✓ Direct match found for "${mappedValue}"`);
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    
    const lowerValue = mappedValue.toString().toLowerCase().trim();
    const fallbackOption = Array.from(selectElement.options).find(opt => {
      const optValue = opt.value.toLowerCase().trim();
      const optText = opt.textContent.toLowerCase().trim();
      return optValue === lowerValue || optText === lowerValue ||
             optValue.replace(/[_\s]/g, '') === lowerValue.replace(/[_\s]/g, '') ||
             optText.replace(/[_\s]/g, '') === lowerValue.replace(/[_\s]/g, '');
    });
    
    if (fallbackOption) {
      selectElement.value = fallbackOption.value;
      console.log(`✓ Fallback match found: "${mappedValue}" -> "${fallbackOption.value}"`);
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    
    const otherOption = Array.from(selectElement.options).find(opt => 
      opt.value.toLowerCase() === 'other'
    );
    
    if (otherOption) {
      selectElement.value = 'other';
      console.log(`✓ No match found for "${mappedValue}", selected "other" option`);
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.warn(`⚠ No matching option found for "${mappedValue}" and no "other" option available. Available options:`, 
        Array.from(selectElement.options).map(opt => `"${opt.value}"`));
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
    
    if (this.map) {
      const mapContainer = document.getElementById('pet-location-map');
      if (mapContainer) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                this.map.invalidateSize();
              }, 100);
            }
          });
        });
        observer.observe(mapContainer);
      }
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
      
      const submitFormData = new FormData();
      
      Object.keys(petData).forEach(key => {
        if (key !== 'mediaFiles' && key !== 'medicalHistory' && key !== 'careResources' && key !== 'careSchedule') {
          if (petData[key] !== null && petData[key] !== undefined) {
            submitFormData.append(key, petData[key]);
          }
        }
      });
      
      if (this.mediaFiles && this.mediaFiles.length > 0) {
        this.mediaFiles.forEach((file, index) => {
          submitFormData.append('mediaFiles', file);
        });
        submitFormData.append('profileImageIndex', this.profileImageIndex);
      }
      
      submitFormData.append('medicalHistory', JSON.stringify(petData.medicalHistory));
      submitFormData.append('careResources', JSON.stringify(petData.careResources));
      submitFormData.append('careSchedule', JSON.stringify(petData.careSchedule));
      submitFormData.append('tags', JSON.stringify(petData.tags));
      
      let result;
      if (this.isEditMode && this.editPetId) {
        // Update existing pet
        result = await this.petService.updatePetWithFiles(this.editPetId, submitFormData);
        console.log('Pet update successful:', result);
        alert('Pet updated successfully!');
      } else {
        // Create new pet
        result = await this.petService.addPetWithFiles(submitFormData);
        console.log('Pet creation successful:', result);
        alert('Pet added successfully!');
      }
      
      window.location.href = '../pets-page/pets-page.html';

    } catch (error) {
      console.error('Error submitting pet form:', error);
      console.error('Error details:', error.message);
      const action = this.isEditMode ? 'updating' : 'adding';
      alert(`Error ${action} pet: ` + error.message);
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
      adoptionFee: formData.get('adoptionFee') ? parseFloat(formData.get('adoptionFee')) : null,      shelterId: this.tempUserId,
      tags: this.getSelectedTagsForSubmission(),
      address: formData.get('address'),
      city: formData.get('city'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
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
      console.error('Submit button HTML:', submitBtn.outerHTML);
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
      console.error('Create tag button HTML:', submitBtn.outerHTML);
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
  
  initMediaUpload() {
    const mediaInput = document.getElementById('pet-media');
    const previewContainer = document.getElementById('media-preview');
    const uploadButton = document.querySelector('.file-upload-button');
    
    if (!mediaInput || !previewContainer) return;
    
    if (uploadButton) {
      uploadButton.classList.add('empty');
    }
    
    mediaInput.addEventListener('change', (e) => {
      this.mediaObjectURLs.forEach(url => URL.revokeObjectURL(url));
      this.mediaObjectURLs = [];
      this.mediaFiles = Array.from(e.target.files);
      this.profileImageIndex = 0;
      this.renderMediaPreview();
      
      if (uploadButton) {
        const fileCount = this.mediaFiles.length;
        const buttonText = uploadButton.querySelector('span:last-child');
        
        if (fileCount === 0) {
          buttonText.textContent = 'Choose Photos & Videos';
          uploadButton.classList.add('empty');
        } else {
          buttonText.textContent = `${fileCount} file${fileCount !== 1 ? 's' : ''} selected`;
          uploadButton.classList.remove('empty');
        }
      }
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
    const date = clone.querySelector('.medical-history-date');
    
    if (description) {
      description.setAttribute('name', 'medicalHistoryDescription');
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
    
    if (date) {
      date.setAttribute('name', 'medicalHistoryDate');
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
      type.setAttribute('name', 'careResourceType');
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
      title.setAttribute('name', 'careResourceTitle');
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
      content.setAttribute('name', 'careResourceContent');
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
      activity.setAttribute('name', 'careScheduleActivity');
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
      hour.setAttribute('name', 'careScheduleHour');
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
      frequency.setAttribute('name', 'careScheduleFrequency');
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

  getSelectedTagsForSubmission() {
    const tagsForSubmission = [];
    
    for (const tagId of this.selectedTags) {
      const tag = this.availableTags.find(t => t.id === tagId);
      
      if (tag) {
        if (tag.isCustom) {
          tagsForSubmission.push({
            name: tag.name,
            isCustom: true
          });
        } else {
          tagsForSubmission.push(tagId);
        }
      }
    }
    
    return tagsForSubmission;
  } 
  
  initMap() {
    const mapContainer = document.getElementById('pet-location-map');
    const locateBtn = document.getElementById('locate-on-map');
    
    if (!mapContainer) return;
    
    let initialLat = 44.4268;
    let initialLng = 26.1025;
    let initialZoom = 13;
    
    if (this.isEditMode && this.currentPetData && this.currentPetData.address) {
      const lat = parseFloat(this.currentPetData.address.latitude);
      const lng = parseFloat(this.currentPetData.address.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        initialLat = lat;
        initialLng = lng;
        initialZoom = 15;
      }
    }
    
    this.map = L.map('pet-location-map').setView([initialLat, initialLng], initialZoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    
    // Add initial marker if we have coordinates
    if (this.isEditMode && this.currentPetData && this.currentPetData.address) {
      const lat = parseFloat(this.currentPetData.address.latitude);
      const lng = parseFloat(this.currentPetData.address.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.mapMarker = L.marker([lat, lng]).addTo(this.map);
      } else if (this.currentPetData.address.city && this.currentPetData.address.country) {
        // Try to geocode the city/country if we don't have coordinates
        setTimeout(() => {
          this.geocodeAddress();
        }, 500);
      }
    }
    
    // Add click event to map
    this.map.on('click', (e) => {
      this.setMapLocation(e.latlng.lat, e.latlng.lng);
    });
    
    // Add locate button event
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        this.locateOnMap();
      });
    }
    
    // Add event listeners to address fields for auto-geocoding
    const cityField = document.getElementById('pet-city');
    const countryField = document.getElementById('pet-country');
    
    if (cityField && countryField) {
      const debounceGeocoding = this.debounce(() => {
        this.geocodeAddress();
      }, 1000);
      
      cityField.addEventListener('input', debounceGeocoding);
      countryField.addEventListener('change', debounceGeocoding);
    }
  }
  
  setMapLocation(lat, lng) {
    if (!this.map) return;
    
    // Remove existing marker
    if (this.mapMarker) {
      this.map.removeLayer(this.mapMarker);
    }
    
    // Add new marker
    this.mapMarker = L.marker([lat, lng]).addTo(this.map);
    this.map.setView([lat, lng], 15);
    
    // Update the form with coordinates (you might want to add hidden fields for lat/lng)
    this.reverseGeocode(lat, lng);
  }
  
  async geocodeAddress() {
    const city = document.getElementById('pet-city')?.value?.trim();
    const country = document.getElementById('pet-country')?.value?.trim();
    
    if (!city || !country) return;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}, ${encodeURIComponent(country)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        this.setMapLocation(parseFloat(location.lat), parseFloat(location.lon));
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  }
  
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        
        // Update form fields with geocoded data
        const cityField = document.getElementById('pet-city');
        const countryField = document.getElementById('pet-country');
        const addressField = document.getElementById('pet-address');
        const postalField = document.getElementById('pet-postal-code');
        
        if (cityField && (address.city || address.town || address.village)) {
          cityField.value = address.city || address.town || address.village;
        }
        
        if (countryField && address.country) {
          countryField.value = address.country;
        }
        
        if (addressField && (address.road || address.house_number)) {
          const roadInfo = [address.house_number, address.road].filter(Boolean).join(' ');
          if (roadInfo && !addressField.value) {
            addressField.value = roadInfo;
          }
        }
        
        if (postalField && address.postcode && !postalField.value) {
          postalField.value = address.postcode;
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }
  
  locateOnMap() {
    const city = document.getElementById('pet-city')?.value?.trim();
    const country = document.getElementById('pet-country')?.value?.trim();
    
    if (city && country) {
      this.geocodeAddress();
    } else {
      alert('Please enter city and country first');
    }
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new AddPetPage();
});