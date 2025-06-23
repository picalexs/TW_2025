const { sendResponse } = require('../utils/helpers');

function handleConfigRoutes(req, res) {
  if (req.method === 'GET' && req.url === '/api/config') {
    const config = {
      apiPort: process.env.API_PORT || 8080,
      apiHost: process.env.API_HOST || 'localhost',
      apiProtocol: process.env.API_PROTOCOL || 'http',
      baseUrl: process.env.BASE_URL || `${process.env.API_PROTOCOL || 'http'}://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || 8080}`,
      googleAuth: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        redirectUri: process.env.GOOGLE_REDIRECT_URI
      }
    };
    
    sendResponse(res, 200, config);
    return true;
  }
  return false;
}

module.exports = handleConfigRoutes;
