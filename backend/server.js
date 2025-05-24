const http = require('http');
const db = require('./db/dbConnection');
const handleUserRoutes = require('./routes/userRoutes');
const handlePetRoutes = require('./routes/petRoutes');
const { sendResponse } = require('./utils/helpers');
require("dotenv").config();

const PORT = process.env.API_PORT || 8080;

const server = http.createServer(async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // In production, remove this wildcard and strictly use allowedOrigins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method.toLowerCase() === 'options') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Status endpoint for health checks and connection testing
  if (req.url === '/api/status' && req.method.toLowerCase() === 'get') {
    sendResponse(res, 200, { 
      status: 'ok', 
      message: 'API server is running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    let routeHandled = await handleUserRoutes(req, res);

    if (!routeHandled) {
      routeHandled = await handlePetRoutes(req, res);
    }

    if (!routeHandled) {
      console.log(`Route not found: ${req.url}`);
      sendResponse(res, 404, { 
        error: "Route not found",
        path: req.url,
        method: req.method
      });
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
        console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api/status`);
      });

      process.on('SIGINT', async () => {
        console.log('\nShutting down server...');
        await db.closePool();
        console.log('Database connections closed.');
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