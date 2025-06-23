class AbstractModel {
  constructor(dto) {
    this.dto = dto;
  }

  async getAll() {
    return await this.dto.getAll();
  }

  async getById(id) {
    return await this.dto.getById(id);
  }

  async create(data) {
    this.validateData(data);
    return await this.dto.create(data);
  }

  async update(id, data) {
    this.validateData(data);
    return await this.dto.update(id, data);
  }

  async delete(id) {
    return await this.dto.delete(id);
  }

  validateData(data) {
    if (!data || typeof data !== 'object') {
      throw Object.assign(
        new Error('Data is required and must be an object'),
        { code: 'INVALID_DATA', status: 400 }
      );
    }
  }

  validateRequired(value, fieldName) {
    if (value === null || value === undefined || value === '') {
      throw Object.assign(
        new Error(`${fieldName} is required`),
        { code: 'MISSING_REQUIRED_FIELD', status: 400 }
      );
    }
  }

  validateLength(value, fieldName, min, max) {
    if (value && typeof value === 'string') {
      if (min && value.length < min) {
        throw Object.assign(
          new Error(`${fieldName} must be at least ${min} characters long`),
          { code: 'INVALID_LENGTH', status: 400 }
        );
      }
      if (max && value.length > max) {
        throw Object.assign(
          new Error(`${fieldName} must not exceed ${max} characters`),
          { code: 'INVALID_LENGTH', status: 400 }
        );
      }
    }
  }

  validateRange(value, fieldName, min, max) {
    if (value !== null && value !== undefined) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        throw Object.assign(
          new Error(`${fieldName} must be a valid number`),
          { code: 'INVALID_NUMBER', status: 400 }
        );
      }
      if (min !== undefined && numValue < min) {
        throw Object.assign(
          new Error(`${fieldName} must be at least ${min}`),
          { code: 'OUT_OF_RANGE', status: 400 }
        );
      }
      if (max !== undefined && numValue > max) {
        throw Object.assign(
          new Error(`${fieldName} must not exceed ${max}`),
          { code: 'OUT_OF_RANGE', status: 400 }
        );
      }
    }
  }

  validateEnum(value, fieldName, allowedValues) {
    if (value && !allowedValues.includes(value)) {
      throw Object.assign(
        new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`),
        { code: 'INVALID_ENUM_VALUE', status: 400 }
      );
    }
  }

  validateFileData(files, options = {}) {
    if (!files || !Array.isArray(files)) {
      return; // Files are optional by default
    }

    const maxFiles = options.maxFiles || 10;
    const maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = options.allowedTypes || ['image/', 'video/'];

    // Validate file count
    if (files.length > maxFiles) {
      throw Object.assign(
        new Error(`Maximum ${maxFiles} files allowed`),
        { code: 'TOO_MANY_FILES', status: 400 }
      );
    }

    files.forEach((file, index) => {
      // Validate file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        throw Object.assign(
          new Error(`File ${index + 1} exceeds ${maxSizeMB}MB size limit`),
          { code: 'FILE_TOO_LARGE', status: 400 }
        );
      }

      // Validate file type
      const isValidType = allowedTypes.some(type => file.mimetype.startsWith(type));
      if (!isValidType) {
        const typeNames = allowedTypes.map(type => type.replace('/', '')).join(' or ');
        throw Object.assign(
          new Error(`File ${index + 1} must be ${typeNames}`),
          { code: 'INVALID_FILE_TYPE', status: 400 }
        );
      }

      // Validate file name length
      if (file.originalname && file.originalname.length > 255) {
        throw Object.assign(
          new Error(`File ${index + 1} name too long`),
          { code: 'FILENAME_TOO_LONG', status: 400 }
        );
      }

      // Validate that file has content
      if (!file.buffer || file.buffer.length === 0) {
        throw Object.assign(
          new Error(`File ${index + 1} is empty`),
          { code: 'EMPTY_FILE', status: 400 }
        );
      }
    });
  }

  validateJsonField(value, fieldName) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw Object.assign(
          new Error(`${fieldName} must be valid JSON`),
          { code: 'INVALID_JSON', status: 400 }
        );
      }
    }
    return value;
  }

  validateArrayField(value, fieldName, options = {}) {
    if (!Array.isArray(value)) {
      if (options.required) {
        throw Object.assign(
          new Error(`${fieldName} must be an array`),
          { code: 'INVALID_ARRAY', status: 400 }
        );
      }
      return [];
    }

    const maxItems = options.maxItems || 100;
    if (value.length > maxItems) {
      throw Object.assign(
        new Error(`${fieldName} cannot have more than ${maxItems} items`),
        { code: 'TOO_MANY_ITEMS', status: 400 }
      );
    }

    return value;
  }
}

module.exports = AbstractModel;