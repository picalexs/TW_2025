function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

export default class FavoritesService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
  }
  async getFavorites(userId) {
    const res = await fetch(`/api/favorites?user_id=${userId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Eroare la încărcare favorite');
    return res.json();
  }
  async addFavorite(userId, animalId) {
    const res = await fetch(`/api/favorites?user_id=${userId}&animal_id=${animalId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Eroare la adăugare favorite');
    return res.json();
  }
  async removeFavorite(userId, animalId) {
    const res = await fetch(`/api/favorites?user_id=${userId}&animal_id=${animalId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Eroare la ștergere favorite');
    return res.json();
  }
}
