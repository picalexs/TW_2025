import ApiService from './api.js';

class PetService {
  constructor() {
    this.apiService = new ApiService();
    console.log('PetService initialized with API base URL:', this.apiService.baseURL);
  }

  async getAllPets() {
    try {
      console.log('Attempting to fetch pets from API...');
      return await this.apiService.get('/api/pets');
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
      return await this.apiService.get(`/api/pets/${id}`);
    } catch (error) {
      console.error(`Error fetching pet with ID ${id}:`, error);
      throw error;
    }
  }

  async addPet(petData) {
    return this.apiService.post('/api/pets', petData);
  }

  async updatePet(id, petData) {
    return this.apiService.put(`/api/pets/${id}`, petData);
  }

  async deletePet(id) {
    return this.apiService.delete(`/api/pets/${id}`);
  }
  
  // Diagnostic method to check server connectivity and endpoints
  async diagnoseApiConnection() {
    const results = {
      baseUrl: this.apiService.baseURL,
      endpoints: {}
    };
    
    // Test multiple endpoints to help diagnose the issue
    const endpointsToTest = [
      '/api/pets',
      '/api/status',
      '/api',
      '/'
    ];
    
    for (const endpoint of endpointsToTest) {
      try {
        const fullUrl = `${this.apiService.baseURL}${endpoint}`;
        console.log(`Testing endpoint: ${fullUrl}`);
        
        const response = await fetch(fullUrl, { 
          method: 'GET',
          mode: 'cors'
        });
        
        // For GET requests, we should try to read the response
        let responseData;
        try {
          responseData = await response.clone().json();
        } catch (e) {
          try {
            responseData = await response.text();
          } catch (e2) {
            responseData = 'Unable to parse response';
          }
        }
        
        results.endpoints[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          exists: response.ok,
          data: responseData
        };
      } catch (error) {
        results.endpoints[endpoint] = {
          error: error.message,
          exists: false
        };
      }
    }
    
    console.log('API Diagnosis Results:', results);
    return results;
  }
}

export default PetService;
