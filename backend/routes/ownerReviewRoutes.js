const OwnerReviewController = require('../controllers/ownerReviewController');
const { sendResponse, getRequestBody } = require('../utils/helpers');

const ownerReviewController = new OwnerReviewController();

async function handleOwnerReviewRoutes(req, res) {
  const url = req.url;
  const method = req.method.toLowerCase();

  if (method === 'get' && url.match(/^\/api\/owner-reviews\/owner\/\d+$/)) {
    const ownerId = url.split('/').pop();
    req.params = { ownerId };
    return await ownerReviewController.getReviewsForOwner(req, res);
  }

  if (method === 'get' && url.match(/^\/api\/owner-reviews\/user\/\d+$/)) {
    const userId = url.split('/').pop();
    req.params = { userId };
    return await ownerReviewController.getReviewsByUser(req, res);
  }

  if (method === 'get' && url.match(/^\/api\/owner-reviews\/adoption\/\d+$/)) {
    const adoptionId = url.split('/').pop();
    req.params = { adoptionId };
    return await ownerReviewController.getReviewByAdoption(req, res);
  }

  if (method === 'get' && url.match(/^\/api\/owner-reviews\/can-review\/\d+\/\d+$/)) {
    const parts = url.split('/');
    const adoptionId = parts.pop();
    const userId = parts.pop();
    req.params = { userId, adoptionId };
    return await ownerReviewController.checkCanReview(req, res);
  }

  if (method === 'post' && url === '/api/owner-reviews') {
    try {
      const body = await getRequestBody(req);
      req.body = body;
      return await ownerReviewController.createReview(req, res);
    } catch (error) {
      sendResponse(res, 400, { 
        success: false, 
        message: 'Invalid request body',
        error: error.message 
      });
      return true;
    }
  }

  if (method === 'put' && url.match(/^\/api\/owner-reviews\/\d+$/)) {
    try {
      const reviewId = url.split('/').pop();
      const body = await getRequestBody(req);
      req.params = { reviewId };
      req.body = body;
      return await ownerReviewController.updateReview(req, res);
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
