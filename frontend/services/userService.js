import ApiService, { ApiError } from './api.js';

class UserService {
  constructor(options = {}) {
    this.apiService = options.apiService || new ApiService(options.baseURL, {
      debug: options.debug || false
    });
    
    this.debug = options.debug || false;
    this.endpoints = {
      currentUser: '/api/users/me',
      login: '/api/auth/login',
      register: '/api/auth/register',
      profile: '/api/users/profile'
    };
    
    this._restoreAuthState();
  }

  async getCurrentUser() {
    try {
      return await this.apiService.get(this.endpoints.currentUser);
    } catch (error) {
      if (error instanceof ApiError && error.details && error.details.status === 401) {
        // Clear invalid auth state
        this.logout();
      }
      throw error;
    }
  }

  async login(email, password) {
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
    
    try {
      const data = await this.apiService.post(this.endpoints.login, { email, password });
      
      if (data && data.token) {
        this._setAuthState(data.token, data.user);
        return data;
      } else {
        throw new Error('Invalid login response: missing token');
      }
    } catch (error) {
      if (this.debug) {
        console.error('Login error:', error);
      }
      throw error;
    }
  }

  logout() {
    this.apiService.setAuthToken(null);
    this._clearAuthState();
    
    if (this.debug) {
      console.log('User logged out');
    }
  }

  async register(userData) {
    if (!userData) throw new Error('User data is required');
    if (!userData.email) throw new Error('Email is required');
    if (!userData.password) throw new Error('Password is required');
    
    try {
      const result = await this.apiService.post(this.endpoints.register, userData);
      
      // Auto-login if registration returns a token
      if (result && result.token) {
        this._setAuthState(result.token, result.user);
      }
      
      return result;
    } catch (error) {
      if (this.debug) {
        console.error('Registration error:', error);
      }
      throw error;
    }
  }

  async updateProfile(userData) {
    if (!userData) throw new Error('User data is required');
    
    try {
      return await this.apiService.put(this.endpoints.profile, userData);
    } catch (error) {
      if (this.debug) {
        console.error('Profile update error:', error);
      }
      throw error;
    }
  }

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }
  
  _setAuthState(token, user) {
    if (!token) return;
    
    this.apiService.setAuthToken(token);
    localStorage.setItem('authToken', token);
    
    if (user) {
      localStorage.setItem('userData', JSON.stringify(user));
    }
    
    if (this.debug) {
      console.log('Authentication state set');
    }
  }
  
  _clearAuthState() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }
  
  _restoreAuthState() {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        this.apiService.setAuthToken(token);
        
        if (this.debug) {
          console.log('Authentication state restored from storage');
        }
      }
    } catch (error) {
      if (this.debug) {
        console.error('Failed to restore auth state:', error);
      }
    }
  }
}

export default UserService;
