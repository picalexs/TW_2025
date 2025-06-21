const profileDTO = require('../dto/profileDTO');

class ProfileModel {
  async getById(userId) {
    return await profileDTO.getById(userId);
  }

  async update(userId, data) {
    return await profileDTO.update(userId, data);
  }
}

module.exports = new ProfileModel();
