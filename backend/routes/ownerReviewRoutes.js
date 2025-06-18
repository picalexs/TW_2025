const OwnerReviewController = require('../controllers/ownerReviewController');
const { sendResponse, getRequestBody } = require('../utils/helpers');
const url = require('url');

const ownerReviewController = new OwnerReviewController();

async function handleOwnerReviewRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");  
  const method = req.method.toLowerCase();

  if (method === 'get' && trimmedPath.match(/^api\/owner-reviews\/owner\/\d+$/)) {
    console.log('[OwnerReviewRoutes] Handling /api/owner-reviews/owner/:id GET request');
    const ownerId = trimmedPath.split('/').pop();
    req.params = { ownerId };
    await ownerReviewController.getReviewsForOwner(req, res);
    return true;
  }

  if (method === 'get' && trimmedPath.match(/^api\/owner-reviews\/user\/\d+$/)) {
    console.log('[OwnerReviewRoutes] Handling /api/owner-reviews/user/:id GET request');
    const userId = trimmedPath.split('/').pop();
    req.params = { userId };
    await ownerReviewController.getReviewsByUser(req, res);
    return true;
  }

  if (method === 'get' && trimmedPath.match(/^api\/owner-reviews\/adoption\/\d+$/)) {
    console.log('[OwnerReviewRoutes] Handling /api/owner-reviews/adoption/:id GET request');
    const adoptionId = trimmedPath.split('/').pop();
    req.params = { adoptionId };
    await ownerReviewController.getReviewByAdoption(req, res);
    return true;
  }

  if (method === 'get' && trimmedPath.match(/^api\/owner-reviews\/can-review\/\d+\/\d+$/)) {
    console.log('[OwnerReviewRoutes] Handling /api/owner-reviews/can-review/:userId/:adoptionId GET request');
    const parts = trimmedPath.split('/');
    const adoptionId = parts.pop();
    const userId = parts.pop();
    req.params = { userId, adoptionId };
    await ownerReviewController.checkCanReview(req, res);
    return true;
  }

  if (method === 'post' && trimmedPath === 'api/owner-reviews') {
    console.log('[OwnerReviewRoutes] Handling /api/owner-reviews POST request');
    try {
      const body = await getRequestBody(req);
      req.body = body;
      await ownerReviewController.createReview(req, res);
      return true;
    } catch (error) {
      sendResponse(res, 400, { 
        success: false, 
        message: 'Invalid request body',
        error: error.message 
      });
      return true;
    }
  }

  if (method === 'put' && trimmedPath.match(/^api\/owner-reviews\/\d+$/)) {
    console.log('[OwnerReviewRoutes] Handling /api/owner-reviews/:id PUT request');
    try {
      const reviewId = trimmedPath.split('/').pop();
      const body = await getRequestBody(req);
      req.params = { reviewId };
      req.body = body;
      await ownerReviewController.updateReview(req, res);
      return true;
    } catch (error) {
      sendResponse(res, 400, { 
        success: false, 
        message: 'Invalid request body',
        error: error.message 
      });
      return true;
    }
  }
  return false;
}

module.exports = { handleOwnerReviewRoutes };
