const profileModel = require('../models/profileModel');
const { sendResponse } = require('../utils/helpers');

class ProfileController {
  async getProfile(req, res, userId) {
    try {
      const user = await profileModel.getById(userId);
      if (!user) {
        sendResponse(res, 404, { error: 'User not found' });
        return;
      }
      sendResponse(res, 200, user);
    } catch (error) {
      sendResponse(res, 500, { error: 'Failed to fetch profile', message: error.message });
    }
  }

  async updateProfile(req, res, userId) {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        const data = JSON.parse(body);
        const result = await profileModel.update(userId, data);
        sendResponse(res, 200, result);
      });
    } catch (error) {
      sendResponse(res, 500, { error: 'Failed to update profile', message: error.message });
    }
  }
}

module.exports = new ProfileController();
