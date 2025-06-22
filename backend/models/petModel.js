const petDTO = require("../dto/petDTO");
const AbstractModel = require("./abstractModel");

class PetModel extends AbstractModel {
  constructor() {
    super(petDTO);
  }

  async createPet(petData) {
    this.validatePetData(petData);
    return await this.dto.create(petData);
  }  async updatePet(id, petDataOrFields, files = null) {
    // Handle both JSON updates (without files) and multipart updates (with files)
    if (files !== null) {
      // Multipart form data update with files
      const validatedData = this.validatePetCreationData(petDataOrFields, files);
      const updatedPet = await this.dto.update(id, validatedData.petData);
      
      if (!updatedPet) {
        return null;
      }
      
      // Return the validated data so the controller can handle file saving
      return {
        pet: updatedPet,
        files: files,
        profileImageIndex: validatedData.profileImageIndex,
        tags: validatedData.tags,
        medicalHistory: validatedData.medicalHistory,
        careResources: validatedData.careResources,
        careSchedule: validatedData.careSchedule
      };
    } else {
      // JSON update without files
      this.validatePetData(petDataOrFields, true);
      return await this.dto.update(id, petDataOrFields);
    }
  }

  validatePetCreationData(fields, files) {    
    const petData = {
      name: fields.name,
      species: fields.species,
      breed: fields.breed || 'Mixed Breed',
      age: fields.age ? parseFloat(fields.age) : null,
      gender: fields.gender,
      sizeCategory: fields.sizeCategory,
      weightKg: fields.weightKg ? parseFloat(fields.weightKg) : null,
      color: fields.color,
      healthStatus: fields.healthStatus,
      description: fields.description,
      relationWithOthers: fields.relationWithOthers,
      adoptionStatus: fields.adoptionStatus || 'available',
      adoptionFee: fields.adoptionFee ? parseFloat(fields.adoptionFee) : null,
      shelterId: fields.shelterId || fields.userId || parseInt(fields.shelterId) || null,
      city: fields.city,
      postalCode: fields.postalCode,
      country: fields.country,
      address: fields.address
    };

    // Validate basic pet data
    this.validatePetData(petData);    // Parse and validate JSON fields
    const tags = this.parseJsonField(fields.tags, []);
    const medicalHistory = this.parseJsonField(fields.medicalHistory, []);
    const careResources = this.parseJsonField(fields.careResources, []);
    const careSchedule = this.parseJsonField(fields.careSchedule, []);

    // Validate arrays
    const validatedTags = this.validateArrayField(tags, 'Tags', { maxItems: 20 });
    const validatedMedicalHistory = this.validateArrayField(medicalHistory, 'Medical History', { maxItems: 50 });
    const validatedCareResources = this.validateArrayField(careResources, 'Care Resources', { maxItems: 20 });
    const validatedCareSchedule = this.validateArrayField(careSchedule, 'Care Schedule', { maxItems: 20 });

    // Validate additional data
    this.validateMedicalHistory(validatedMedicalHistory);
    this.validateCareResources(validatedCareResources);
    this.validateCareSchedule(validatedCareSchedule);

    // Validate files
    this.validateFileData(files);

    // Validate profile image index
    const profileImageIndex = fields.profileImageIndex ? parseInt(fields.profileImageIndex) : 0;
    if (files && files.length > 0 && (profileImageIndex < 0 || profileImageIndex >= files.length)) {
      throw Object.assign(
        new Error('Invalid profile image index'),
        { code: 'INVALID_PROFILE_INDEX', status: 400 }
      );
    }

    return {
      petData,
      tags: validatedTags,
      medicalHistory: validatedMedicalHistory,
      careResources: validatedCareResources,
      careSchedule: validatedCareSchedule,
      profileImageIndex
    };
  }

  validatePetData(petData, isUpdate = false) {
    this.validateData(petData);

    if (!isUpdate) {
      this.validateRequired(petData.name, 'Pet name');
      this.validateRequired(petData.species, 'Species');
      this.validateRequired(petData.gender, 'Gender');
      this.validateRequired(petData.healthStatus, 'Health status');
      this.validateRequired(petData.city, 'City');
      this.validateRequired(petData.country, 'Country');
      this.validateRequired(petData.adoptionFee, 'Adoption fee');
    }

    if (petData.name) {
      this.validateLength(petData.name, 'Pet name', 2, 100);
    }

    const allowedSpecies = ['dog', 'cat', 'bird', 'rabbit', 'other'];
    if (petData.species) {
      this.validateEnum(petData.species, 'Species', allowedSpecies);
    }

    const allowedGenders = ['male', 'female'];
    if (petData.gender) {
      this.validateEnum(petData.gender, 'Gender', allowedGenders);
    }

    if (petData.age !== null && petData.age !== undefined) {
      this.validateRange(petData.age, 'Age', 0, 30);
    }

    if (petData.weightKg !== null && petData.weightKg !== undefined) {
      this.validateRange(petData.weightKg, 'Weight', 0, 500);
    }

    const allowedSizes = ['small', 'medium', 'large'];
    if (petData.sizeCategory) {
      this.validateEnum(petData.sizeCategory, 'Size category', allowedSizes);
    }

    const allowedHealthStatuses = ['excellent', 'good', 'fair', 'special needs'];
    if (petData.healthStatus) {
      this.validateEnum(petData.healthStatus, 'Health status', allowedHealthStatuses);
    }

    const allowedAdoptionStatuses = ['available', 'pending', 'adopted'];
    if (petData.adoptionStatus) {
      this.validateEnum(petData.adoptionStatus, 'Adoption status', allowedAdoptionStatuses);
    }

    if (petData.adoptionFee !== null && petData.adoptionFee !== undefined) {
      this.validateRange(petData.adoptionFee, 'Adoption fee', 0, 10000);
    }

    if (petData.breed) {
      this.validateLength(petData.breed, 'Breed', 1, 100);
    }

    if (petData.color) {
      this.validateLength(petData.color, 'Color', 1, 100);
    }

    if (petData.description) {
      this.validateLength(petData.description, 'Description', 1, 2000);
    }

    if (petData.relationWithOthers) {
      this.validateLength(petData.relationWithOthers, 'Relationship with others', 1, 1000);
    }

    if (petData.city) {
      this.validateLength(petData.city, 'City', 1, 100);
    }

    if (petData.country) {
      this.validateLength(petData.country, 'Country', 1, 100);
    }

    if (petData.address) {
      this.validateLength(petData.address, 'Address', 1, 255);
    }

    if (petData.postalCode) {
      this.validateLength(petData.postalCode, 'Postal code', 1, 20);    
    }
  }
  validateFileData(files) {
    super.validateFileData(files, {
      maxFiles: 10,
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/', 'video/']
    });
  }

  parseJsonField(value, defaultValue = []) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return defaultValue;
    }
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`Failed to parse JSON field: ${value}`, error);
      return defaultValue;
    }
  }

  validateMedicalHistory(medicalHistory) {
    if (!medicalHistory || !Array.isArray(medicalHistory)) {
      return; // Medical history is optional
    }

    medicalHistory.forEach((entry, index) => {
      if (!entry.description || !entry.description.trim()) {
        throw Object.assign(
          new Error(`Medical history entry ${index + 1} description is required`),
          { code: 'MISSING_MEDICAL_DESCRIPTION', status: 400 }
        );
      }
      
      this.validateLength(entry.description, `Medical history entry ${index + 1} description`, 1, 1000);
    });
  }

  validateCareResources(careResources) {
    if (!careResources || !Array.isArray(careResources)) {
      return; // Care resources are optional
    }

    careResources.forEach((entry, index) => {
      if (!entry.resource_type || !entry.resource_type.trim()) {
        throw Object.assign(
          new Error(`Care resource ${index + 1} type is required`),
          { code: 'MISSING_CARE_RESOURCE_TYPE', status: 400 }
        );
      }

      if (!entry.title || !entry.title.trim()) {
        throw Object.assign(
          new Error(`Care resource ${index + 1} title is required`),
          { code: 'MISSING_CARE_RESOURCE_TITLE', status: 400 }
        );
      }

      if (!entry.content || !entry.content.trim()) {
        throw Object.assign(
          new Error(`Care resource ${index + 1} content is required`),
          { code: 'MISSING_CARE_RESOURCE_CONTENT', status: 400 }
        );
      }

      this.validateLength(entry.resource_type, `Care resource ${index + 1} type`, 1, 50);
      this.validateLength(entry.title, `Care resource ${index + 1} title`, 1, 200);
      this.validateLength(entry.content, `Care resource ${index + 1} content`, 1, 2000);
    });
  }

  validateCareSchedule(careSchedule) {
    if (!careSchedule || !Array.isArray(careSchedule)) {
      return; // Care schedule is optional
    }

    careSchedule.forEach((entry, index) => {
      if (!entry.activity || !entry.activity.trim()) {
        throw Object.assign(
          new Error(`Care schedule ${index + 1} activity is required`),
          { code: 'MISSING_CARE_SCHEDULE_ACTIVITY', status: 400 }
        );
      }

      if (!entry.hour || !entry.hour.trim()) {
        throw Object.assign(
          new Error(`Care schedule ${index + 1} time is required`),
          { code: 'MISSING_CARE_SCHEDULE_TIME', status: 400 }
        );
      }

      if (!entry.frequency || !entry.frequency.trim()) {
        throw Object.assign(
          new Error(`Care schedule ${index + 1} frequency is required`),
          { code: 'MISSING_CARE_SCHEDULE_FREQUENCY', status: 400 }
        );
      }

      this.validateLength(entry.activity, `Care schedule ${index + 1} activity`, 1, 200);
      this.validateLength(entry.frequency, `Care schedule ${index + 1} frequency`, 1, 50);
    });
  }

  async getByShelter(shelterId) {
    return await this.dto.getByShelter(shelterId);
  }

  async saveMediaPaths(petId, mediaPaths) {
    return await this.dto.saveMediaPaths(petId, mediaPaths);
  }

  async saveTags(petId, tags) {
    return await this.dto.saveTags(petId, tags);
  }

  async saveMedicalHistory(petId, medicalHistory) {
    this.validateMedicalHistory(medicalHistory);
    return await this.dto.saveMedicalHistory(petId, medicalHistory);
  }

  async saveCareResources(petId, careResources) {
    this.validateCareResources(careResources);
    return await this.dto.saveCareResources(petId, careResources);
  }

  async saveCareSchedule(petId, careSchedule) {
    this.validateCareSchedule(careSchedule);
    return await this.dto.saveCareSchedule(petId, careSchedule);
  }

  async processAndCreateTags(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return [];
    }

    const processedTagIds = [];

    for (const tag of tags) {
      if (typeof tag === 'number') {
        const existingTag = await this.dto.getTagById(tag);
        if (existingTag) {
          processedTagIds.push(tag);
        } else {
          console.warn(`Tag ID ${tag} not found in database, skipping`);
        }
      } else if (typeof tag === 'object' && tag.name) {
        const tagId = await this.dto.createTag(tag.name);
        processedTagIds.push(tagId);
      } else if (typeof tag === 'string') {
        const tagId = await this.dto.createTag(tag);
        processedTagIds.push(tagId);
      } else {
        console.warn(`Invalid tag format:`, tag);
      }
    }

    return processedTagIds;
  }

  async clearPetTags(petId) {
    return await this.dto.clearPetTags(petId);
  }

  async clearMedicalHistory(petId) {
    return await this.dto.clearMedicalHistory(petId);
  }

  async clearCareResources(petId) {
    return await this.dto.clearCareResources(petId);
  }

  async clearCareSchedule(petId) {
    return await this.dto.clearCareSchedule(petId);
  }
}

module.exports = new PetModel();