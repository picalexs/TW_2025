const url = require("url");
const userDTO = require("./dto/userDTO");

// Helper function to parse request body
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
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
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
      const users = await userDTO.getAllUsers();
      return sendResponse(res, 200, users);
    } else if (trimmedPath.match(/^api\/users\/\d+$/) && method === "get") {
      const id = parseInt(trimmedPath.split("/").pop());
      const user = await userDTO.getUserById(id);

      if (user) {
        return sendResponse(res, 200, user);
      } else {
        return sendResponse(res, 404, { error: "User not found" });
      }
    } else if (trimmedPath === "api/users" && method === "post") {
      const userData = await collectRequestData(req);
      const userId = await userDTO.createUser(userData);
      return sendResponse(res, 201, { id: userId });
    }
    return sendResponse(res, 404, { error: "Route not found" });
  } catch (error) {
    console.error("Route handler error:", error);
    return sendResponse(res, 500, {
      error: "Internal server error",
      details: error.message,
    });
  }
}

module.exports = handleRoutes;
