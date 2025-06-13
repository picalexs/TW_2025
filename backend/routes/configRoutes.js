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
  
  return false;
}

module.exports = handleConfigRoutes;
