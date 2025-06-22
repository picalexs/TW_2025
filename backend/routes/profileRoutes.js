const profileController = require('../controllers/profileController');
const url = require('url');

async function handleProfileRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method.toLowerCase();
  const userId = req.user?.id || req.user?.userId || req.user?.sub || parseInt(parsedUrl.query.user_id);

  const profileMatch = path.match(/^\/api\/profile\/(\d+)$/);
  if (profileMatch && method === 'get') {
    await profileController.getProfile(req, res, parseInt(profileMatch[1]));
    return true;
  }

  if (profileMatch && method === 'put') {
    await profileController.updateProfile(req, res, parseInt(profileMatch[1]));
    return true;
  }

  return false;
}

module.exports = handleProfileRoutes;
