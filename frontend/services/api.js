class ApiService {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
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
    const baseUrl = endpoint.startsWith('http') ? '' : this.baseURL;
    const url = new URL(`${baseUrl}${endpoint}`, window.location.origin);
    
    Object.keys(queryParams).forEach(key => 
      url.searchParams.append(key, queryParams[key])
    );
    return url.toString();
  }

  async _fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}
export default ApiService;
