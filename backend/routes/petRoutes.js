const petController = require("../controllers/petController");
const url = require("url");
const { sendResponse, collectRequestData } = require("../utils/helpers");
const { verifyToken } = require("../middleware/authMiddleware");

async function handlePetRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");  
  const method = req.method.toLowerCase();
  
  if (trimmedPath === "api/pets" || trimmedPath === "api/pets/" || 
      trimmedPath === "/api/pets" || trimmedPath === "/api/pets/") {
    if (method === "get") {
      await petController.getAllPets(req, res);
    } else if (method === "post") {
      verifyToken(req, res, async () => {
        await petController.createPet(req, res);
      });
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  if (trimmedPath === "api/pets/feed" || trimmedPath === "api/pets/feed/" || 
      trimmedPath === "/api/pets/feed" || trimmedPath === "/api/pets/feed/") {
    if (method === "get") {
      await petController.getPetsFeed(req, res);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  const shelterPetsMatch = trimmedPath.match(/^api\/pets\/shelter\/(\d+)$/);
  if (shelterPetsMatch && method === "get") {
    const shelterId = parseInt(shelterPetsMatch[1]);
    await petController.getPetsByShelter(req, res, shelterId);
    return true;
  }

  const petIdMatch = trimmedPath.match(/^api\/pets\/(\d+)$/);
  if (petIdMatch) {
    const id = parseInt(petIdMatch[1]);
    if (method === "get") {
      await petController.getPetById(req, res, id);
    } else if (method === "put") {
      verifyToken(req, res, async () => {
        await petController.updatePet(req, res, id);
      });
    } else if (method === "delete") {
      verifyToken(req, res, async () => {
        await petController.deletePet(req, res, id);
      });
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  const matchPets = trimmedPath.match(/^api\/pets\/match\/(\d+)$/);
  if (matchPets && method === "get") {
    const userId = parseInt(matchPets[1]);
    req.query = parsedUrl.query;
    await petController.getPetsByTagOverlap(req, res, userId);
    return true;
  }

  const petTagsMatch = trimmedPath.match(/^api\/pets\/(\d+)\/tags$/);
  if (petTagsMatch && method === "get") {
    const petId = parseInt(petTagsMatch[1]);
    await petController.getPetTags(req, res, petId);
    return true;
  }

  return false;
}
module.exports = handlePetRoutes;