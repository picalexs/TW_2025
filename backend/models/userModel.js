// backend/models/userModel.js
const userDTO = require("../dto/userDTO");

class UserModel {
  // Obtine toti utilizatorii
  async getAllUsers() {
    return await userDTO.getAll();
  }

  // Obtine un utilizator dupa ID
  async getUserById(id) {
    return await userDTO.getById(id);
  }

  // Creeaza un utilizator nou
  async createUser(userData) {
    // Aici poti adauga logica de validare suplimentara inainte de a crea utilizatorul
    return await userDTO.create(userData);
  }

  // Actualizeaza un utilizator
  async updateUser(id, userData) {
    // Aici poti adauga logica de validare sau business inainte de a actualiza
    return await userDTO.update(id, userData);
  }

  // Sterge un utilizator
  async deleteUser(id) {
    return await userDTO.delete(id);
  }

  // Autentifica un utilizator
  async authenticate(email, password) {
    return await userDTO.authenticateUser(email, password);
  }
}

module.exports = new UserModel();