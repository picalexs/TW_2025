// backend/controllers/petController.js
const petModel = require("../models/petModel");
const { sendResponse, collectRequestData } = require("../../utils/helpers"); // Functii utilitare generale

class PetController {
  // Obtine toate animalele
  async getAllPets(req, res) {
    try {
      const pets = await petModel.getAllPets();
      sendResponse(res, 200, pets);
    } catch (error) {
      console.error("Error getting all pets:", error);
      sendResponse(res, 500, { error: "Failed to fetch pets", message: error.message });
    }
  }

  // Obtine un animal dupa ID
  async getPetById(req, res, id) {
    try {
      const pet = await petModel.getPetById(id);
      if (pet) {
        sendResponse(res, 200, pet);
      } else {
        sendResponse(res, 404, { error: "Pet not found" });
      }
    } catch (error) {
      console.error(`Error getting pet by ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch pet", message: error.message });
    }
  }

  // Creeaza un animal nou
  async createPet(req, res) {
    try {
      const petData = await collectRequestData(req);
      const petId = await petModel.createPet(petData);
      sendResponse(res, 201, { id: petId, message: "Pet created successfully" });
    } catch (error) {
      console.error("Error creating pet:", error);
      sendResponse(res, 400, { error: "Failed to create pet", message: error.message });
    }
  }

  // Actualizeaza un animal
  async updatePet(req, res, id) {
    try {
      const petData = await collectRequestData(req);
      const updatedPet = await petModel.updatePet(id, petData);
      if (updatedPet) {
        sendResponse(res, 200, updatedPet);
      } else {
        sendResponse(res, 404, { error: "Pet not found for update" });
      }
    } catch (error) {
      console.error(`Error updating pet with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to update pet", message: error.message });
    }
  }

  // Sterge un animal
  async deletePet(req, res, id) {
    try {
      const deleted = await petModel.deletePet(id);
      if (deleted) {
        sendResponse(res, 204, {}); // 204 No Content for successful deletion
      } else {
        sendResponse(res, 404, { error: "Pet not found for deletion" });
      }
    } catch (error) {
      console.error(`Error deleting pet with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to delete pet", message: error.message });
    }
  }
}

module.exports = new PetController();