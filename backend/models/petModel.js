// backend/models/petModel.js
const petDTO = require("../dto/petDTO");

class PetModel {
  // Obtine toate animalele
  async getAllPets() {
    return await petDTO.getAll();
  }

  // Obtine un animal dupa ID
  async getPetById(id) {
    return await petDTO.getById(id);
  }

  // Creeaza un animal nou
  async createPet(petData) {
    // Aici poti adauga logica de validare suplimentara
    return await petDTO.create(petData);
  }

  // Actualizeaza un animal
  async updatePet(id, petData) {
    return await petDTO.update(id, petData);
  }

  // Sterge un animal
  async deletePet(id) {
    return await petDTO.delete(id);
  }
}

module.exports = new PetModel();