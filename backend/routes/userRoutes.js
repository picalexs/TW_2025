// backend/routes/userRoutes.js
const userController = require("../controllers/userController");
const url = require("url");

// Functie pentru a colecta datele din cerere (mutata aici pentru ca era folosita de rute)
async function collectRequestData(req) {
  return new Promise((resolve, reject) => {
    const body = [];
    req.on("data", (chunk) => {
      body.push(chunk);
    });
    req.on("end", () => {
      const parsedBody = Buffer.concat(body).toString();
      try {
        resolve(JSON.parse(parsedBody));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", (error) => {
      reject(error);
    });
  });
}

// Functie pentru a trimite raspunsuri (mutata aici pentru ca era folosita de rute)
function sendResponse(res, statusCode, data) {
  if (res.headersSent) {
    console.warn("Headers already sent, cannot send response");
    return;
  }

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  let responseBody;
  try {
    const safeStringify = (obj) => {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (key === 'conn' || key === 'pool' || key === 'desc' || key === 'cOpts') {
          return '[Circular]';
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    };
    responseBody = safeStringify(data);
  } catch (error) {
    console.error("Failed to stringify response data:", error);
    const safeError = {
      error: "Internal server error",
      message: "Failed to serialize response data"
    };
    responseBody = JSON.stringify(safeError);
  }
  res.end(responseBody);
}


async function handleUserRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();

  // Test route
  if (trimmedPath === "test" && method === "get") {
    return sendResponse(res, 200, { message: "Server is working!" });
  }

  // Rute pentru utilizatori
  if (trimmedPath === "api/users") {
    if (method === "get") {
      await userController.getAllUsers(req, res);
    } else if (method === "post") {
      await userController.createUser(req, res);
    } else {
      sendResponse(res, 405, { error: "Method not allowed" });
    }
    return true; // Indicam ca ruta a fost gestionata
  }

  // Rute pentru un anumit utilizator dupa ID
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

  // Ruta de autentificare
  if (trimmedPath === "api/auth/login" && method === "post") {
    await userController.authenticateUser(req, res);
    return true;
  }

  return false; // Ruta nu a fost gestionata de acest handler
}

module.exports = handleUserRoutes;