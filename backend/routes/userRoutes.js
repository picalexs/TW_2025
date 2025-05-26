const userController = require("../controllers/userController");
const url = require("url");
const { sendResponse } = require("../utils/helpers")

async function handleUserRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();

  console.log(`Processing user route: ${trimmedPath}, method: ${method}`);

  if (trimmedPath === "api/users/register" && method === "post") {
    console.log('[UserRoutes] Handling /api/users/register POST request');
    await userController.createUser(req, res);
    return true;
  }

  if (trimmedPath === "api/users/verify-email" && method === "get") {
    console.log('[UserRoutes] Handling /api/users/verify-email GET request');
    await userController.verifyEmail(req, res);
    return true;
  }

  if (trimmedPath === "api/auth/login" && method === "post") {
    console.log('[UserRoutes] Handling /api/auth/login POST request');
    await userController.authenticateUser(req, res);
    return true;
  }

  if (trimmedPath === "api/users" || trimmedPath === "api\/users") {
    if (method === "get") {
      console.log('[UserRoutes] Handling /api/users GET request');
      await userController.getAllUsers(req, res);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  const userIdMatch = trimmedPath.match(/^api\/users\/(\d+)$/);
  if (userIdMatch) {
    const id = parseInt(userIdMatch[1]);
    if (method === "get") {
      console.log(`[UserRoutes] Handling /api/users/${id} GET request`);
      await userController.getUserById(req, res, id);
    } else if (method === "put") {
      console.log(`[UserRoutes] Handling /api/users/${id} PUT request`);
      await userController.updateUser(req, res, id);
    } else if (method === "delete") {
      console.log(`[UserRoutes] Handling /api/users/${id} DELETE request`);
      await userController.deleteUser(req, res, id);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  console.log(`[UserRoutes] No user route matched: ${trimmedPath}`);
  return false;
}

module.exports = handleUserRoutes;