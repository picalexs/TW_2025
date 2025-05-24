const http = require('http');
const db = require('./db/dbConnection');
const handleUserRoutes = require('./routes/userRoutes');
const handlePetRoutes = require('./routes/petRoutes');
const { sendResponse } = require('./utils/helpers');
require("dotenv").config();

const PORT = process.env.DB_PORT;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method.toLowerCase() === 'options') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    let routeHandled = await handleUserRoutes(req, res);

    if (!routeHandled) {
      routeHandled = await handlePetRoutes(req, res);
    }

    if (!routeHandled) {
      sendResponse(res, 404, { error: "Route not found" });
    }
  } catch (error) {
    console.error("Server error:", error);
    sendResponse(res, 500, {
      error: "Internal server error",
      message: error.message || "Unknown server error",
    });
  }
});

async function startServer() {
  try {
    const poolInitialized = await db.initialize();

    if (poolInitialized) {
      server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });

      process.on('SIGINT', async () => {
        await db.closePool();
        process.exit(0);
      });
    } else {
      console.error('Failed to initialize database connection');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();