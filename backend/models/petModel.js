const petDTO = require("../dto/petDTO");
const AbstractModel = require("./abstractModel");

class PetModel extends AbstractModel {
  constructor() {
    super(petDTO);
  }

  async createPet(petData) {
    // ADD validation logic here
    return await this.dto.create(petData);
  }

  async updatePet(id, petData) {
    // ADD validation logic here
    return await this.dto.update(id, petData);
  }

  async getByShelter(shelterId) {
    return await this.dto.getByShelter(shelterId);
  }
}

module.exports = new PetModel();