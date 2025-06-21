import ApiService from './api.min.js';

export default class FavoritesService {
  constructor(options = {}) {
    this.api = new ApiService(options.baseUrl);
  }

  async getFavorites(userId) {
    // GET /api/favorites?user_id=...
    const response = await this.api.get('/api/favorites', { user_id: userId });
    return response;
  }

  async addFavorite(userId, animalId) {
    // POST /api/favorites?user_id=...&animal_id=...
    const response = await this.api.post(`/api/favorites?user_id=${userId}&animal_id=${animalId}`);
    return response;
  }

  async removeFavorite(userId, animalId) {
    // DELETE /api/favorites?user_id=...&animal_id=...
    const response = await this.api.delete(`/api/favorites?user_id=${userId}&animal_id=${animalId}`);
    return response;
  }
}
