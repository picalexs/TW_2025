class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    
    this.isRetryable = this._isRetryable(code, details);
  }
  
  _isRetryable(code, details) {
    return code === 'NETWORK_ERROR' || 
      (details.status && details.status >= 500 && details.status < 600);
  }
}

class ApiService {
  constructor(baseURL = '', options = {}) {
    const config = window.APP_CONFIG || {};
    const features = config.features || {};
    const timeouts = config.timeouts || {};
    const retry = config.retry || {};
    
    this.baseURL = baseURL || 'http://localhost:8080';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    this.debug = options.debug ?? features.enableDebugLogging ?? false;
    this.timeout = options.timeout ?? timeouts.default ?? 30000;
    this.retryCount = options.retryCount ?? retry.maxRetries ?? 2;
    this.retryDelay = options.retryDelay ?? retry.initialDelay ?? 1000;
    
    this.pendingRequests = new Map();
    if (this.debug) {
      this._log('ApiService initialized', {
        baseURL: this.baseURL,
        timeout: this.timeout,
        retryCount: this.retryCount,
        usingConfigFile: !!window.APP_CONFIG
      });
    }
    
    this._initializeFromStorage();
  }

  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
      if (this.debug) this._log('Auth token set');
    } else {
      delete this.defaultHeaders['Authorization'];
      if (this.debug) this._log('Auth token removed');
    }
  }

  async get(endpoint, queryParams = {}, options = {}) {
    const url = this._buildUrl(endpoint, queryParams);
    return this._executeRequest(url, { 
      ...options, 
      method: 'GET' 
    });
  }

  async post(endpoint, data, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._executeRequest(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: { ...this.defaultHeaders, ...options.headers }
    });
  }

  async put(endpoint, data, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._executeRequest(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { ...this.defaultHeaders, ...options.headers }
    });
  }

  async delete(endpoint, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._executeRequest(url, {
      ...options,
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...options.headers }
    });
  }

  async testApiConnection() {
    try {
      const endpoints = ['/api/status', '/api/pets'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'GET',
            mode: 'cors',
            signal: AbortSignal.timeout(5000)
          });
          
          return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            endpoint: endpoint
          };
        } catch (error) {
          continue;
        }
      }
      
      throw new Error('All test endpoints failed');
    } catch (error) {
      if (this.debug) {
        this._log('API connection test failed', error);
      }
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  abortAllRequests() {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
    
    if (this.debug) {
      this._log('All pending requests aborted');
    }
  }

  _buildUrl(endpoint, queryParams = {}) {
    if (endpoint.startsWith('http')) {
      const url = new URL(endpoint);
      
      Object.keys(queryParams).forEach(key => 
        url.searchParams.append(key, queryParams[key])
      );
      return url.toString();
    }
    
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      Object.keys(queryParams).forEach(key => 
        url.searchParams.append(key, queryParams[key])
      );
      
      if (this.debug) {
        this._log('URL constructed', url.toString());
      }
      
      return url.toString();
    } catch (error) {
      this._logError('URL construction error', error);
      throw new ApiError('URL_CONSTRUCTION_ERROR', 
        `Failed to build URL with baseURL: ${this.baseURL} and endpoint: ${endpoint}`, 
        error);
    }
  }

  async _executeRequest(url, options = {}) {
    const timeoutMs = options.timeout || this.timeout;
    const maxRetries = options.retryCount ?? this.retryCount;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const { error, response } = await this._performRequest(url, options, attempt, maxRetries, timeoutMs);
      
      if (response) {
        return await this._handleSuccessResponse(response);
      }
      
      lastError = error;
      if (!this._shouldRetry(error, attempt, maxRetries)) {
        break;
      }
      await this._delayRetry(attempt);
    }
    
    const finalError = this._formatError(lastError, url, options.method, timeoutMs);
    this._logError('Request failed', finalError);
    throw finalError;
  }
  
  async _performRequest(url, options, attempt, maxRetries, timeoutMs) {
    const requestId = Date.now().toString() + Math.random().toString(36).substring(2);
    const controller = new AbortController();
    this.pendingRequests.set(requestId, controller);
    
    if (attempt > 0 && this.debug) {
      this._log(`Retry ${attempt}/${maxRetries}: ${options.method || 'GET'} ${url}`);
    }
    
    try {
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      if (this.debug && attempt === 0) {
        this._log(`${options.method || 'GET'} ${url}`);
      }
      
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError('REQUEST_FAILED', 
          `API request failed with status ${response.status}`,
          {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            url: url,
            method: options.method || 'GET'
          }
        );
      }
      
      return { response };
    } catch (error) {
      this.pendingRequests.delete(requestId);
      return { error };
    }
  }
  
  async _handleSuccessResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType.includes('application/octet-stream')) {
      return await response.blob();
    } else {
      return await response.text();
    }
  }

  _shouldRetry(error, attempt, maxRetries) {
    const isAbortError = error.name === 'AbortError';
    const isNonRetryableApiError = error instanceof ApiError && !error.isRetryable;
    const isMaxAttemptsReached = attempt >= maxRetries;
    
    return !(isAbortError || isNonRetryableApiError || isMaxAttemptsReached);
  }
  
  async _delayRetry(attempt) {
    const delay = this.retryDelay * Math.pow(2, attempt);
    if (this.debug) {
      this._log(`Waiting ${delay}ms before retry`);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  _formatError(error, url, method, timeoutMs) {
    if (error instanceof ApiError) {
      return error;
    }
    
    if (error.name === 'AbortError') {
      return new ApiError('REQUEST_TIMEOUT', 
        'Request timed out', 
        { url, method: method || 'GET', timeout: timeoutMs }
      );
    }
    
    return new ApiError('NETWORK_ERROR', 
      error.message || 'Network request failed', 
      { url, method: method || 'GET', originalError: error }
    );
  }

  async testApiConnection() {
    try {
      const response = await this.get('/api/status');
      
      return {
        success: response && response.status === 'ok',
        data: response
      };
    } catch (error) {
      if (this.debug) {
        this._log('API connection test failed', error);
      }
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  _initializeFromStorage() {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        this.setAuthToken(token);
      }
    } catch (error) {
      if (this.debug) {
        this._log('Failed to initialize from localStorage', error);
      }
    }
  }

  _log(message, data) {
    if (this.debug) {
      console.log(`[ApiService] ${message}`, data !== undefined ? data : '');
    }
  }

  _logError(message, error) {
    if (this.debug) {
      console.error(`[ApiService] ${message}:`, error);
    }
  }
}

export default ApiService;
export { ApiError };
