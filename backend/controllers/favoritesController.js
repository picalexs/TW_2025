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
      
      if (error.code === 'DUPLICATE_FAVORITE' && error.status === 409) {
        sendResponse(res, 409, { 
          error: "Favorite already exists", 
          message: "This pet is already in your favorites list",
          code: error.code 
        });
      } else {
        const statusCode = error.status || 500;
        sendResponse(res, statusCode, { 
          error: "Failed to add favorite", 
          message: error.message,
          code: error.code 
        });
      }
    }
  }

  async removeFavorite(req, res, userId, animalId) {
    try {
      const result = await favoritesModel.remove(userId, animalId);
      sendResponse(res, 200, result);
    } catch (error) {
      console.error("Error removing favorite:", error);
      
      if (error.code === 'NOT_FOUND' && error.status === 404) {
        sendResponse(res, 404, { 
          error: "Favorite not found", 
          message: "This pet was not in your favorites list",
          code: error.code 
        });
      } else {
        const statusCode = error.status || 500;
        sendResponse(res, statusCode, { 
          error: "Failed to remove favorite", 
          message: error.message,
          code: error.code 
        });
      }
    }
  }
}

module.exports = new FavoritesController();
