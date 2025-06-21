const favoritesController = require("../controllers/favoritesController");
const url = require("url");

async function handleFavoriteRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method.toLowerCase();
  const userId = req.user?.id || req.user?.userId || req.user?.sub || parseInt(parsedUrl.query.user_id);
  const animalId = parseInt(parsedUrl.query.animal_id);

  if (path === "/api/favorites" && method === "get") {
    if (!userId) return res.writeHead(401).end(JSON.stringify({ error: "User not authenticated" }));
    await favoritesController.getUserFavorites(req, res, userId);
    return true;
  }
  if (path === "/api/favorites" && method === "post") {
    if (!userId || !animalId) return res.writeHead(400).end(JSON.stringify({ error: "Missing user_id or animal_id" }));
    await favoritesController.addFavorite(req, res, userId, animalId);
    return true;
  }
  if (path === "/api/favorites" && method === "delete") {
    if (!userId || !animalId) return res.writeHead(400).end(JSON.stringify({ error: "Missing user_id or animal_id" }));
    await favoritesController.removeFavorite(req, res, userId, animalId);
    return true;
  }
  return false;
}

module.exports = handleFavoriteRoutes;
