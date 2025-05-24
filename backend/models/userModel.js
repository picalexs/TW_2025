const userDTO = require("../dto/userDTO");
const AbstractModel = require("./abstractModel");

class UserModel extends AbstractModel {
  constructor() {
    super(userDTO);
  }

  async createUser(userData) {
    // ADD validation logic here
    return await this.dto.create(userData);
  }

  async updateUser(id, userData) {
    // ADD validation logic here
    return await this.dto.update(id, userData);
  }

  async authenticate(email, password) {
    return await this.dto.authenticateUser(email, password);
  }
}

module.exports = new UserModel();