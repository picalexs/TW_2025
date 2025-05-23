import ApiService from './api.js';

class UserService {
  constructor(baseURL = '/api') {
    this.apiService = new ApiService(baseURL);
  }

  async getCurrentUser() {
    return this.apiService.get('/users/me');
  }

  async login(email, password) {
    const data = await this.apiService.post('/auth/login', { email, password });
    if (data.token) {
      this.apiService.setAuthToken(data.token);
      localStorage.setItem('authToken', data.token);
    }
    return data;
  }

  logout() {
    this.apiService.setAuthToken(null);
    localStorage.removeItem('authToken');
  }

  async register(userData) {
    return this.apiService.post('/auth/register', userData);
  }

  async updateProfile(userData) {
    return this.apiService.put('/users/profile', userData);
  }
}
export default UserService;
