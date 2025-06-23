const favoritesDTO = require('../dto/favoritesDTO');
const AbstractModel = require('./abstractModel');

class FavoritesModel extends AbstractModel {
  constructor() {
    super(favoritesDTO);
  }

  async getAllByUser(userId) {
    return await this.dto.getAllByUser(userId);
  }

  async add(userId, animalId) {
    return await this.dto.add(userId, animalId);
  }

  async remove(userId, animalId) {
    return await this.dto.remove(userId, animalId);
  }
}

module.exports = new FavoritesModel();