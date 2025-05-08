const http = require('http');
const db = require('./dbConnection');
const handleRoutes = require('./routes');
require("dotenv").config();

const PORT = process.env.DB_PORT;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method.toLowerCase() === 'options') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  await handleRoutes(req, res);
});

// Initialize database and start the server
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