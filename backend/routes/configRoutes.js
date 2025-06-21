const { sendResponse } = require('../utils/helpers');

function handleConfigRoutes(req, res) {
  if (req.method === 'GET' && req.url === '/api/config') {
    const config = {
      apiPort: process.env.API_PORT || 8080,
      apiHost: process.env.API_HOST || 'localhost'
    };
    
    sendResponse(res, 200, config);
    return true;
  } 
  if (req.method === 'GET' && req.url === '/api/frontend-url') {
    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5501/frontend';
    sendResponse(res, 200, { url: frontendUrl });
    return true;
  }

  return false;
}

module.exports = handleConfigRoutes;
