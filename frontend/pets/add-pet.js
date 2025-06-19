import PetService from '../services/petService.min.js';
import { setupMobileMenu, initializePageLanguage, checkLoginStatusAndToggleNavButtons } from '../global/global.min.js';

class AddPetPage {
  constructor() {
    this.petService = new PetService();
    this.availableTags = [];
    this.selectedTags = new Set();
    this.tempUserId = 4;
    this.nextTagId = 16;
    this.init();
  }

  async init() {
    try {
      await this.loadTags();
      this.renderTags();
      this.initializeEventListeners();
      this.enhanceFormValidation();
    } catch (error) {
      console.error('Error initializing add pet page:', error);
      this.showMessage('Failed to load page data', 'error');
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
  }  renderTags() {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) {
      console.error('Tags container not found in DOM');
      return;
    }

    console.log('Rendering tags:', this.availableTags);
    tagsContainer.innerHTML = '';

    this.availableTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = `tag-checkbox ${tag.isCustom ? 'custom-tag' : ''}`;
      tagElement.innerHTML = `
        <input type="checkbox" id="tag-${tag.id}" value="${tag.id}">
        <label for="tag-${tag.id}">
          ${tag.name}
          ${tag.isCustom ? '<span class="custom-badge">Custom</span>' : ''}
        </label>
      `;

      const checkbox = tagElement.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedTags.add(parseInt(tag.id));
          tagElement.classList.add('selected');
        } else {
          this.selectedTags.delete(parseInt(tag.id));
          tagElement.classList.remove('selected');
        }
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
        window.location.href = 'pets.html';
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
      
      this.showMessage('Pet added successfully!', 'success');
      
      setTimeout(() => {
        window.location.href = 'pets.html';
      }, 2000);

    } catch (error) {
      console.error('Error adding pet:', error);
      this.showMessage(error.message || 'Failed to add pet. Please try again.', 'error');
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
      adoptionStatus: formData.get('adoptionStatus') || 'available',
      adoptionFee: formData.get('adoptionFee') ? parseFloat(formData.get('adoptionFee')) : null,
      shelterId: this.tempUserId,
      addressId: 1,
      tags: Array.from(this.selectedTags)
    };
  }

  enhanceFormValidation() {
    const nameInput = document.getElementById('pet-name');
    const speciesSelect = document.getElementById('pet-species');
    
    if (nameInput) {
      nameInput.addEventListener('blur', () => this.validateField(nameInput, 'name'));
      nameInput.addEventListener('input', () => this.clearFieldError(nameInput));
    }
    
    if (speciesSelect) {
      speciesSelect.addEventListener('change', () => this.validateField(speciesSelect, 'species'));
    }
  }

  validateField(field, type) {
    const formGroup = field.closest('.form-group');
    const value = field.value.trim();
    
    switch (type) {
      case 'name':
        if (!value) {
          this.setFieldError(formGroup, 'Pet name is required');
          return false;
        } else if (value.length < 2) {
          this.setFieldError(formGroup, 'Pet name must be at least 2 characters');
          return false;
        } else {
          this.setFieldSuccess(formGroup);
          return true;
        }
      
      case 'species':
        if (!value) {
          this.setFieldError(formGroup, 'Species is required');
          return false;
        } else {
          this.setFieldSuccess(formGroup);
          return true;
        }
      
      default:
        return true;
    }
  }

  setFieldError(formGroup, message) {
    formGroup.classList.remove('has-success');
    formGroup.classList.add('has-error');
    
    let errorElement = formGroup.querySelector('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      formGroup.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.classList.add('show');
  }

  setFieldSuccess(formGroup) {
    formGroup.classList.remove('has-error');
    formGroup.classList.add('has-success');
    
    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
      errorElement.classList.remove('show');
    }
  }

  clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('has-error');
    
    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
      errorElement.classList.remove('show');
    }
  }

  validatePetData(petData) {
    if (!petData.name) {
      this.showMessage('Pet name is required', 'error');
      return false;
    }

    if (!petData.species) {
      this.showMessage('Species is required', 'error');
      return false;
    }

    return true;
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
      this.renderTags();
      
      this.selectedTags.add(newTag.id);
      const newTagElement = document.getElementById(`tag-${newTag.id}`);
      if (newTagElement) {
        newTagElement.checked = true;
        newTagElement.closest('.tag-checkbox').classList.add('selected');
      }
      
      this.closeNewTagModal()
      this.showMessage(`Tag "${tagName}" created and selected successfully!`, 'success');
      
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
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initializePageLanguage();
  checkLoginStatusAndToggleNavButtons();
  new AddPetPage();
});
