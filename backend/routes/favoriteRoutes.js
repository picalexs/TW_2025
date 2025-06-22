const favoritesController = require("../controllers/favoritesController");
const url = require("url");
const { collectRequestData } = require("../utils/helpers");

async function handleFavoriteRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method.toLowerCase();
  const userId = req.user?.id || req.user?.userId || req.user?.sub;

  if (path === "/api/favorites" && method === "get") {
    if (!userId) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "User not authenticated" }));
      return true;
    }
    await favoritesController.getUserFavorites(req, res, userId);
    return true;
  }
  
  if (path === "/api/favorites" && method === "post") {
    if (!userId) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "User not authenticated" }));
      return true;
    }
    
    try {
      const requestData = await collectRequestData(req);
      const animalId = parseInt(requestData.animal_id);
      
      if (!animalId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing animal_id in request body" }));
        return true;
      }
      
      await favoritesController.addFavorite(req, res, userId, animalId);
      return true;
    } catch (error) {
      console.error('Error parsing favorite request:', error);
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid request data" }));
      return true;
    }
  }
  
  if (path === "/api/favorites" && method === "delete") {
    if (!userId) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "User not authenticated" }));
      return true;
    }
    
    const animalId = parseInt(parsedUrl.query.animal_id);
    if (!animalId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing animal_id in query parameters" }));
      return true;
    }
    
    await favoritesController.removeFavorite(req, res, userId, animalId);
    return true;
  }
  
  return false;
}

module.exports = handleFavoriteRoutes;
