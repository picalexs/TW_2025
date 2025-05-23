import ApiService from './api.js';

class PetService {
  constructor(baseURL = '/api') {
    this.apiService = new ApiService(baseURL);
  }

  async getAllPets() {
    try {
      console.log('Attempting to fetch pets from API...');
      return await this.apiService.get('/pets');
    } catch (error) {
      console.error('Error fetching pets:', error);
      
      if (error.status === 500 || 
          (error.message && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError')))) {
        console.log('Server or network error detected, returning empty result');
        return [];
      }
      
      throw error;
    }
  }

  async getPetById(id) {
    try {
      return await this.apiService.get(`/pets/${id}`);
    } catch (error) {
      console.error(`Error fetching pet with ID ${id}:`, error);
      throw error;
    }
  }

  async addPet(petData) {
    return this.apiService.post('/pets', petData);
  }

  async updatePet(id, petData) {
    return this.apiService.put(`/pets/${id}`, petData);
  }

  async deletePet(id) {
    return this.apiService.delete(`/pets/${id}`);
  }
}

export default PetService;
