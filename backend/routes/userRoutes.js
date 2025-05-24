const userController = require("../controllers/userController");
const url = require("url");

async function handleUserRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();

  if (trimmedPath === "test" && method === "get") {
    return sendResponse(res, 200, { message: "Server is working!" });
  }

  if (trimmedPath === "api/users") {
    if (method === "get") {
      await userController.getAllUsers(req, res);
    } else if (method === "post") {
      await userController.createUser(req, res);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  const userIdMatch = trimmedPath.match(/^api\/users\/(\d+)$/);
  if (userIdMatch) {
    const id = parseInt(userIdMatch[1]);
    if (method === "get") {
      await userController.getUserById(req, res, id);
    } else if (method === "put") {
      await userController.updateUser(req, res, id);
    } else if (method === "delete") {
      await userController.deleteUser(req, res, id);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true;
  }

  if (trimmedPath === "api/auth/login" && method === "post") {
    await userController.authenticateUser(req, res);
    return true;
  }

  return false;
}

module.exports = handleUserRoutes;