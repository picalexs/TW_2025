const url = require("url");
const userDTO = require("./dto/userDTO");
const petDTO = require("./dto/petDTO");

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

async function handleRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();

  try {
    if (trimmedPath === "test") {
      return sendResponse(res, 200, { message: "Server is working!" });
    }

    if (trimmedPath === "api/users" && method === "get") {
      const users = await userDTO.getAll();
      return sendResponse(res, 200, users);
    }

    if (trimmedPath.match(/^api\/users\/\d+$/) && method === "get") {
      const id = parseInt(trimmedPath.split("/").pop());
      const user = await userDTO.getUserById(id);

      if (user) {
        return sendResponse(res, 200, user);
      } else {
        return sendResponse(res, 404, { error: "User not found" });
      }
    }

    if (trimmedPath === "api/users" && method === "post") {
      const userData = await collectRequestData(req);
      const userId = await userDTO.createUser(userData);
      return sendResponse(res, 201, { id: userId });
    }

    if (trimmedPath === "api/pets" && method === "get") {
      try {
        const pets = await petDTO.getAll();
        return sendResponse(res, 200, pets);
      } catch (petError) {
        console.error("Error fetching pets:", petError);
        return sendResponse(res, 500, {
          error: "Failed to fetch pets",
          message: petError.message,
        });
      }
    }

    if (trimmedPath.match(/^api\/pets\/\d+$/) && method === "get") {
      const id = parseInt(trimmedPath.split("/").pop());
      const pet = await petDTO.getById(id);

      if (pet) {
        return sendResponse(res, 200, pet);
      } else {
        return sendResponse(res, 404, { error: "Pet not found" });
      }
    }

    return sendResponse(res, 404, { error: "Route not found" });
  } catch (error) {
    console.error("Route handler error:", error);
    const safeError = {
      error: "Internal server error",
      message: error.message || "Unknown error",
      code: error.code || "UNKNOWN_ERROR",
    };

    return sendResponse(res, 500, safeError);
  }
}

module.exports = handleRoutes;
