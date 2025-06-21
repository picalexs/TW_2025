const favoritesController = require("../controllers/favoritesController");
const url = require("url");
const { sendResponse } = require("../utils/helpers");

async function handleFavoriteRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method.toLowerCase();
  // Accept id, userId, sub from JWT, or fallback to query param
  const userId = req.user?.id || req.user?.userId || req.user?.sub || parseInt(parsedUrl.query.user_id);
  const animalId = parseInt(parsedUrl.query.animal_id);

  if (!userId) {
    sendResponse(res, 401, { error: "User not authenticated" });
    return true;
  }

  if (path === "/api/favorites" && method === "get") {
    await favoritesController.getUserFavorites(req, res, userId);
    return true;
  }
  if (path === "/api/favorites" && method === "post") {
    if (!animalId) {
      sendResponse(res, 400, { error: "Missing animal_id" });
      return true;
    }
    await favoritesController.addFavorite(req, res, userId, animalId);
    return true;
  }
  if (path === "/api/favorites" && method === "delete") {
    if (!animalId) {
      sendResponse(res, 400, { error: "Missing animal_id" });
      return true;
    }
    await favoritesController.removeFavorite(req, res, userId, animalId);
    return true;
  }
  return false;
}

module.exports = handleFavoriteRoutes;
