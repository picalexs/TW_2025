const db = require('../db/dbConnection');
const favoritesDTO = require('../dto/favoritesDTO');

class FavoritesModel {
  async getAllByUser(userId) {
    return await favoritesDTO.getAllByUser(userId);
  }

  async add(userId, animalId) {
    return await favoritesDTO.add(userId, animalId);
  }

  async remove(userId, animalId) {
    return await favoritesDTO.remove(userId, animalId);
  }
}

module.exports = new FavoritesModel();
