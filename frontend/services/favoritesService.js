import ApiService from './api.min.js';

export default class FavoritesService {
  constructor(options = {}) {
    this.apiService = options.apiService || new ApiService(options.baseURL, {
      debug: options.debug || false,
      timeout: 0,
      retryCount: options.retryCount || 999
    });
    this.debug = options.debug || false;
    this.endpoints = {
      base: '/api/favorites',
      byUser: userId => `/api/favorites?user_id=${userId}`,
      byUserAndPet: (userId, petId) => `/api/favorites?user_id=${userId}&animal_id=${petId}`
    };
    if (this.debug) {
      console.log('FavoritesService initialized with API base URL:', this.apiService.baseURL);
    }
  }

  async getFavorites() {
    try {
      if (this.debug) console.log('Fetching favorites for current user (JWT)');
      return await this.apiService.get(this.endpoints.base);
    } catch (error) {
      if (this.debug) console.error('Error fetching favorites:', error);
      throw error;
    }
  }

  async addFavorite(animalId) {
    if (!animalId) throw new Error('Animal ID is required');
    try {
      if (this.debug) console.log('Adding favorite:', { animalId });
      return await this.apiService.post(this.endpoints.base, { animal_id: animalId });
    } catch (error) {
      if (this.debug) console.error('Error adding favorite:', error);
      throw error;
    }
  }

  async removeFavorite(animalId) {
    if (!animalId) throw new Error('Animal ID is required');
    try {
      if (this.debug) console.log('Removing favorite:', { animalId });
      return await this.apiService.delete(this.endpoints.base + `?animal_id=${animalId}`);
    } catch (error) {
      if (this.debug) console.error('Error removing favorite:', error);
      throw error;
    }
  }
}
