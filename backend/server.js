// backend/server.js
const http = require('http');
const db = require('./db/dbConnection'); // Calea a fost ajustata
const handleUserRoutes = require('./routes/userRoutes'); // Importa rutele pentru utilizatori
const handlePetRoutes = require('./routes/petRoutes');   // Importa rutele pentru animale
const { sendResponse } = require('../utils/helpers'); // Functii utilitare generale
require("dotenv").config();

const PORT = process.env.DB_PORT || 3000; // Seteaza un port implicit daca nu e in .env

const server = http.createServer(async (req, res) => {
  // Setare headere CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Adaugat Authorization pentru autentificare

  // Gestioneaza preflight requests (OPTIONS)
  if (req.method.toLowerCase() === 'options') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Incearca sa gestionezi rutele de utilizatori
    let routeHandled = await handleUserRoutes(req, res);

    // Daca ruta de utilizatori nu a fost gestionata, incearca rutele de animale
    if (!routeHandled) {
      routeHandled = await handlePetRoutes(req, res);
    }

    // Daca nicio ruta nu a fost gestionata
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

// Initializeaza baza de date si porneste serverul
async function startServer() {
  try {
    const poolInitialized = await db.initialize();

    if (poolInitialized) {
      server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });

      // Inchide pool-ul la oprirea aplicatiei
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