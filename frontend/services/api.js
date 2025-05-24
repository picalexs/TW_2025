class ApiService {
  constructor(baseURL = '') {
    this.baseURL = baseURL || 'http://localhost:8080';
    
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    this.debug = true; // Enable debug mode
    
    // Log configuration during initialization
    if (this.debug) {
      console.log('ApiService initialized with:', {
        baseURL: this.baseURL,
        defaultHeaders: this.defaultHeaders,
        browserLocation: window.location.toString()
      });
    }
  }

  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  async get(endpoint, queryParams = {}) {
    const url = this._buildUrl(endpoint, queryParams);
    return this._fetchWithErrorHandling(url);
  }

  async post(endpoint, data) {
    const url = this._buildUrl(endpoint);
    return this._fetchWithErrorHandling(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: this.defaultHeaders
    });
  }

  async put(endpoint, data) {
    const url = this._buildUrl(endpoint);
    return this._fetchWithErrorHandling(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: this.defaultHeaders
    });
  }

  async delete(endpoint) {
    const url = this._buildUrl(endpoint);
    return this._fetchWithErrorHandling(url, {
      method: 'DELETE',
      headers: this.defaultHeaders
    });
  }

  _buildUrl(endpoint, queryParams = {}) {
    // For absolute URLs, use them directly
    if (endpoint.startsWith('http')) {
      const url = new URL(endpoint);
      
      Object.keys(queryParams).forEach(key => 
        url.searchParams.append(key, queryParams[key])
      );
      return url.toString();
    }
    
    // Ensure endpoint starts with a slash if it doesn't already
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    // Construct the full URL
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    Object.keys(queryParams).forEach(key => 
      url.searchParams.append(key, queryParams[key])
    );
    
    if (this.debug) {
      console.log('Built URL:', url.toString());
    }
    
    return url.toString();
  }

  async _fetchWithErrorHandling(url, options = {}) {
    if (this.debug) {
      console.log('Making API request:', {
        url: url,
        method: options.method || 'GET',
        headers: options.headers || this.defaultHeaders
      });
    }
    
    try {
      options = {
        ...options,
        mode: 'cors'
      };
      
      const response = await fetch(url, options);
      
      if (this.debug) {
        console.log('API response received:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          url: url,
          method: options.method || 'GET'
        };
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return response.text();
      }
    } catch (error) {
      console.error('API request error:', error);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Method to test API connectivity
  async testApiConnection() {
    try {
      // Use GET instead of HEAD since the server doesn't support HEAD requests
      const response = await fetch(`${this.baseURL}/api/status`, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (this.debug) {
        console.log('API connection test response:', {
          url: `${this.baseURL}/api/status`,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: `${this.baseURL}/api/status`
      };
    } catch (error) {
      console.error('API connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        url: `${this.baseURL}/api/status`
      };
    }
  }
}

export default ApiService;
