require("dotenv").config();

const http = require('http');
const zlib = require('zlib');
const db = require('./db/dbConnection');
const handleUserRoutes = require('./routes/userRoutes');
const handlePetRoutes = require('./routes/petRoutes');
const handleRecommendationRoutes = require('./routes/recommendationRoutes');
const { handleTestimonialRoutes } = require('./routes/testimonialRoutes');
const { handleOwnerReviewRoutes } = require('./routes/ownerReviewRoutes');
const handleStaticRoutes = require('./routes/staticRoutes');
const handleConfigRoutes = require('./routes/configRoutes');
const { handleNotificationRoutes } = require('./routes/notificationRoutes');
const handleFrontendRoutes = require('./routes/frontendRoutes');
const { sendResponse } = require('./utils/helpers');

const PORT = process.env.API_PORT || 8080;

const generateAllowedOrigins = () => {
  const frontendPorts = process.env.FRONTEND_PORTS ? 
    process.env.FRONTEND_PORTS.split(',') : ['5500', '5501'];

  const origins = [];
  frontendPorts.forEach(port => {
    origins.push(`http://localhost:${port.trim()}`);
    origins.push(`http://127.0.0.1:${port.trim()}`);
  });
  
  return origins;
};

const compressResponse = (data, acceptEncoding) => {
  if (!acceptEncoding) {
    return { data, encoding: null };
  }

  const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
  
  if (bufferData.length < 512) {
    return { data: bufferData, encoding: null };
  }

  if (acceptEncoding.includes('br')) {
    return { 
      data: zlib.brotliCompressSync(bufferData), 
      encoding: 'br' 
    };
  } else if (acceptEncoding.includes('gzip')) {
    return { 
      data: zlib.gzipSync(bufferData), 
      encoding: 'gzip' 
    };
  } else if (acceptEncoding.includes('deflate')) {
    return { 
      data: zlib.deflateSync(bufferData), 
      encoding: 'deflate' 
    };
  }

  return { data: bufferData, encoding: null };
};

const sendCompressedResponse = (res, statusCode, data, contentType = 'application/json') => {
  let responseData;
  
  if (typeof data === 'object' && contentType === 'application/json') {
    responseData = JSON.stringify(data);
  } else {
    responseData = data;
  }

  const acceptEncoding = res.req ? res.req.headers['accept-encoding'] : '';
  const { data: compressedData, encoding } = compressResponse(responseData, acceptEncoding);

  res.setHeader('Content-Type', contentType);
  
  if (encoding) {
    res.setHeader('Content-Encoding', encoding);
    console.log(`API Response compressed with ${encoding} (${Buffer.byteLength(responseData)} -> ${compressedData.length} bytes)`);
  }
  
  res.setHeader('Content-Length', Buffer.byteLength(compressedData));
  res.writeHead(statusCode);
  res.end(compressedData);
};

const server = http.createServer(async (req, res) => {
  res.req = req;
  
  const allowedOrigins = generateAllowedOrigins();
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method.toLowerCase() === 'options') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/status' && req.method.toLowerCase() === 'get') {
    sendCompressedResponse(res, 200, { 
      status: 'ok', 
      message: 'API server is running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
    return;
  }
  try {
    let routeHandled = await handleConfigRoutes(req, res);
    
    if (!routeHandled) {
      routeHandled = await handleStaticRoutes(req, res);
    }
      if (!routeHandled) {
      routeHandled = await handleUserRoutes(req, res);
    }
    
    if (!routeHandled) {
      routeHandled = await handlePetRoutes(req, res);
    }
    
    if (!routeHandled) {
      routeHandled = await handleRecommendationRoutes(req, res);
    }
      if (!routeHandled) {
      routeHandled = await handleTestimonialRoutes(req, res);
    }
    
    if (!routeHandled) {
      routeHandled = await handleOwnerReviewRoutes(req, res);
    }
    
    if (!routeHandled) {
      routeHandled = await handleNotificationRoutes(req, res);
    }

    if (!routeHandled) {
      routeHandled = await handleFrontendRoutes(req, res);
    }

    if (!routeHandled) {
      console.log(`Route not found: ${req.url}`);
      sendCompressedResponse(res, 404, { 
        error: "Route not found",
        path: req.url,
        method: req.method
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    sendCompressedResponse(res, 500, {
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