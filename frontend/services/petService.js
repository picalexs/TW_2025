import ApiService, { ApiError } from './api.js';

class PetService {
  constructor(options = {}) {
    this.apiService = options.apiService || new ApiService(options.baseURL, {
      debug: options.debug || false,
      timeout: options.timeout || 30000,
      retryCount: options.retryCount || 1
    });
    
    this.debug = options.debug || false;
    this.endpoints = {
      base: '/api/pets',
      detail: id => `/api/pets/${id}`
    };
    
    if (this.debug) {
      console.log('PetService initialized with API base URL:', this.apiService.baseURL);
    }
  }

  async getAllPets() {
    try {
      if (this.debug) console.log('Fetching all pets...');
      return await this.apiService.get(this.endpoints.base);
    } catch (error) {
      if (this._isCriticalNetworkError(error)) {
        console.warn('Network error while fetching pets, returning empty array');
        return [];
      }
      
      if (this.debug) {
        console.error('Error fetching pets:', error);
      }
      
      throw error;
    }
  }

  async getPetById(id) {
    if (!id) {
      throw new Error('Pet ID is required');
    }
    
    try {
      return await this.apiService.get(this.endpoints.detail(id));
    } catch (error) {
      if (this.debug) {
        console.error(`Error fetching pet with ID ${id}:`, error);
      }
      throw error;
    }
  }

  async addPet(petData) {
    if (!petData) {
      throw new Error('Pet data is required');
    }
    
    try {
      return await this.apiService.post(this.endpoints.base, petData);
    } catch (error) {
      if (this.debug) {
        console.error('Error adding pet:', error);
      }
      throw error;
    }
  }

  async updatePet(id, petData) {
    if (!id) {
      throw new Error('Pet ID is required');
    }
    
    if (!petData) {
      throw new Error('Pet data is required');
    }
    
    try {
      return await this.apiService.put(this.endpoints.detail(id), petData);
    } catch (error) {
      if (this.debug) {
        console.error(`Error updating pet with ID ${id}:`, error);
      }
      throw error;
    }
  }

  async deletePet(id) {
    if (!id) {
      throw new Error('Pet ID is required');
    }
    
    try {
      return await this.apiService.delete(this.endpoints.detail(id));
    } catch (error) {
      if (this.debug) {
        console.error(`Error deleting pet with ID ${id}:`, error);
      }
      throw error;
    }
  }
  
  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      apiBaseUrl: this.apiService.baseURL,
      endpoints: {}
    };
    
    try {
      const connectionTest = await this.apiService.testApiConnection();
      results.connectionTest = connectionTest;
    } catch (error) {
      results.connectionTest = { 
        success: false, 
        error: error.message 
      };
    }
    
    const endpointsToTest = [
      this.endpoints.base,
      this.endpoints.detail(1)
    ];
    
    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(
          `${this.apiService.baseURL}${endpoint}`, 
          { method: 'HEAD', signal: AbortSignal.timeout(3000) }
        );
        
        results.endpoints[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          exists: response.ok
        };
      } catch (error) {
        results.endpoints[endpoint] = {
          error: error.message,
          exists: false
        };
      }
    }
    
    if (this.debug) {
      console.log('Pet API diagnostics results:', results);
    }
    
    return results;
  }
  
  _isCriticalNetworkError(error) {
    if (error instanceof ApiError) {
      return error.code === 'NETWORK_ERROR' || 
             error.code === 'REQUEST_TIMEOUT' ||
             (error.details && error.details.status >= 500);
    }
    
    return error.status === 500 || 
      (error.message && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('timeout')
      ));
  }
}

export default PetService;
