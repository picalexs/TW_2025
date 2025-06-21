const favoritesModel = require("../models/favoritesModel");
const { sendResponse } = require("../utils/helpers");

class FavoritesController {
  async getUserFavorites(req, res, userId) {
    try {
      const favorites = await favoritesModel.getAllByUser(userId);
      sendResponse(res, 200, favorites);
    } catch (error) {
      console.error("Error getting favorites:", error);
      sendResponse(res, 500, { error: "Failed to fetch favorites", message: error.message });
    }
  }

  async addFavorite(req, res, userId, animalId) {
    try {
      const result = await favoritesModel.add(userId, animalId);
      sendResponse(res, 201, result);
    } catch (error) {
      console.error("Error adding favorite:", error);
      sendResponse(res, 500, { error: "Failed to add favorite", message: error.message });
    }
  }

  async removeFavorite(req, res, userId, animalId) {
    try {
      const result = await favoritesModel.remove(userId, animalId);
      sendResponse(res, 200, result);
    } catch (error) {
      console.error("Error removing favorite:", error);
      sendResponse(res, 500, { error: "Failed to remove favorite", message: error.message });
    }
  }
}

module.exports = new FavoritesController();
