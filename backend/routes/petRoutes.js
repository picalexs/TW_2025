// backend/routes/petRoutes.js
const petController = require("../controllers/petController");
const url = require("url");
const { sendResponse, collectRequestData } = require("../../utils/helpers"); // Functii utilitare generale

async function handlePetRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();

  // Rute pentru animale
  if (trimmedPath === "api/pets") {
    if (method === "get") {
      await petController.getAllPets(req, res);
    } else if (method === "post") {
      await petController.createPet(req, res);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  // Rute pentru un anumit animal dupa ID
  const petIdMatch = trimmedPath.match(/^api\/pets\/(\d+)$/);
  if (petIdMatch) {
    const id = parseInt(petIdMatch[1]);
    if (method === "get") {
      await petController.getPetById(req, res, id);
    } else if (method === "put") {
      await petController.updatePet(req, res, id);
    } else if (method === "delete") {
      await petController.deletePet(req, res, id);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  return false; // Ruta nu a fost gestionata de acest handler
}

module.exports = handlePetRoutes;