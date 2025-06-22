import ApiService, { ApiError } from './api.min.js';

class UserService {
  constructor(options = {}) {
    this.apiService = options.apiService || new ApiService(options.baseURL, {
      debug: options.debug || false
    });
    
    this.debug = options.debug || false;      
    this.endpoints = {
      getAllUsers: '/api/users',
      getUsersWithAdoptions: '/api/users/with-adoptions',
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
        this.logout();
      }
      throw error;
    }
  }
  async getAllUsers() {
    try {
      return await this.apiService.get(this.endpoints.getAllUsers);
    } catch (error) {
      if (this.debug) {
        console.error('Get all users error:', error);
      }
      throw error;
    }
  }

  async getAllUsersWithAdoptions() {
    try {
      return await this.apiService.get(this.endpoints.getUsersWithAdoptions);
    } catch (error) {
      if (this.debug) {
        console.error('Get users with adoptions error:', error);
      }
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const response = await this.apiService.get(`/api/users/${userId}`);
      return response.user || response;
    } catch (error) {
      if (this.debug) {
        console.error('Get user by ID error:', error);
      }
      throw error;
    }
  }
  
  async login(email, password) {
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
    
    try {
      const data = await this.apiService.post(this.endpoints.login, { email, password });

      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');

      if (data && data.user && data.token) {
        this._setAuthState(data.token, data.user);
        return data;
      } else if (data && data.user) {
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        if (data.user.id) {
          localStorage.setItem('userId', data.user.id.toString());
        }
        return data;
      } else {
        throw new Error('Invalid login response: missing user data');
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
  }

  async register(userData) {
    if (!userData) throw new Error('User data is required');
    if (!userData.email) throw new Error('Email is required');
    if (!userData.password) throw new Error('Password is required');
    
    try {
      const result = await this.apiService.post(this.endpoints.register, userData);
      
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
      this._restoreAuthState();
      
      const currentUserId = localStorage.getItem('userId');
      if (!currentUserId) throw new Error('No user ID found');
        if (this.debug) {
        console.log('Updating profile for user ID:', currentUserId);
        console.log('Auth token present:', !!this.apiService.authToken);
        console.log('Auth header set:', !!this.apiService.defaultHeaders['Authorization']);
      }
      
      const response = await this.apiService.put(`/api/users/${currentUserId}`, userData);
      return response;
    } catch (error) {
      if (this.debug) {
        console.error('Profile update error:', error);
      }
      throw error;
    }
  }

  async updateProfileWithFiles(formData) {
    if (!formData) throw new Error('Form data is required');
    
    try {
      this._restoreAuthState();
      
      const currentUserId = localStorage.getItem('userId');
      if (!currentUserId) throw new Error('No user ID found');
      
      if (this.debug) {
        console.log('Updating profile with files for user ID:', currentUserId);
        console.log('Auth token present:', !!this.apiService.authToken);
      }
      
      const response = await fetch(`${this.apiService.baseURL}/api/users/${currentUserId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiService.authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (this.debug) {
        console.error('Profile update with files error:', error);
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
    localStorage.setItem('isLoggedIn', 'true');
    
    if (user) {
      localStorage.setItem('userData', JSON.stringify(user));
      localStorage.setItem('userId', user.id.toString());
      localStorage.setItem('userRole', user.role); 
    }
    
    if (this.debug) {
      console.log('Authentication state set');
    }
  }

  _clearAuthState() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userId');
    localStorage.removeItem('isLoggedIn');
  }

  _restoreAuthState() {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        this.apiService.setAuthToken(token);
        
        if (this.debug) {
          console.log('Authentication state restored from storage');
        }
      } else if (this.debug) {
        console.log('No auth token found in localStorage');
      }
    } catch (error) {
      if (this.debug) {
        console.error('Failed to restore auth state:', error);
      }
    }
  }
}

export default UserService;
