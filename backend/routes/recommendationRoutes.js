const recommendationController = require('../controllers/recommendationController');
const url = require('url');
const { sendResponse, collectRequestData } = require('../utils/helpers');

// Helper function to validate numeric IDs
const validateId = (id, paramName = 'ID') => {
    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
        throw new Error(`Valid ${paramName} is required`);
    }
    return numId;
};

async function handleRecommendationRoutes(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, "");
    const method = req.method.toLowerCase();
    const query = parsedUrl.query;
    
    console.log(`Processing recommendation route: ${trimmedPath}, method: ${method}`);

    try {
        // GET /api/recommendations/pets/:userId - Get intelligent pet recommendations
        const petRecommendationsMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/pets\/(\d+)\/?$/);
        if (petRecommendationsMatch && method === 'get') {
            const userId = validateId(petRecommendationsMatch[1], 'user ID');
            
            // Validate and set limit
            let limit = parseInt(query.limit) || 10;
            limit = Math.min(Math.max(limit, 1), 50);
            
            const refresh = query.refresh === 'true';
            
            await recommendationController.getSmartRecommendations(req, res, userId, { limit, refresh });
            return true;
        }

        // GET /api/recommendations/compatibility/:userId/:petId - Get compatibility score
        const compatibilityMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/compatibility\/(\d+)\/(\d+)\/?$/);
        if (compatibilityMatch && method === 'get') {
            const userId = validateId(compatibilityMatch[1], 'user ID');
            const petId = validateId(compatibilityMatch[2], 'pet ID');
            
            await recommendationController.getCompatibilityScore(req, res, userId, petId);
            return true;
        }

        // POST /api/recommendations/preferences/:userId - Update user preferences
        const preferencesMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/preferences\/(\d+)\/?$/);
        if (preferencesMatch && method === 'post') {
            const userId = validateId(preferencesMatch[1], 'user ID');
            
            await recommendationController.updateUserPreferences(req, res, userId);
            return true;
        }

        // GET /api/recommendations/preferences/:userId - Get user preferences
        if (preferencesMatch && method === 'get') {
            const userId = validateId(preferencesMatch[1], 'user ID');
            
            await recommendationController.getUserPreferences(req, res, userId);
            return true;
        }

        // GET /api/recommendations/schedule/:userId - Get optimized care schedule
        const scheduleMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/schedule\/(\d+)\/?$/);
        if (scheduleMatch && method === 'get') {
            const userId = validateId(scheduleMatch[1], 'user ID');
            
            const weekOffset = parseInt(query.week_offset) || 0;
            await recommendationController.getOptimizedSchedule(req, res, userId, { weekOffset });
            return true;
        }

        // POST /api/recommendations/schedule/optimize/:userId - Trigger schedule optimization
        const optimizeMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/schedule\/optimize\/(\d+)\/?$/);
        if (optimizeMatch && method === 'post') {
            const userId = validateId(optimizeMatch[1], 'user ID');
            
            await recommendationController.optimizeCareSchedule(req, res, userId);
            return true;
        }

        // GET /api/recommendations/analytics/weekly/:userId - Get weekly care report
        const weeklyReportMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/analytics\/weekly\/(\d+)\/?$/);
        if (weeklyReportMatch && method === 'get') {
            const userId = validateId(weeklyReportMatch[1], 'user ID');
            
            const weekOffset = parseInt(query.week_offset) || 0;
            await recommendationController.getWeeklyCareReport(req, res, userId, { weekOffset });
            return true;
        }

        // GET /api/recommendations/analytics/engagement/:userId - Get user engagement analytics
        const engagementMatch = trimmedPath.match(/^(?:\/)?api\/recommendations\/analytics\/engagement\/(\d+)\/?$/);
        if (engagementMatch && method === 'get') {
            const userId = validateId(engagementMatch[1], 'user ID');
            
            const days = parseInt(query.days) || 30;
            await recommendationController.getUserEngagementAnalytics(req, res, userId, { days });
            return true;
        }

        // POST /api/recommendations/feedback - Submit recommendation feedback
        if (trimmedPath === 'api/recommendations/feedback' && method === 'post') {
            await recommendationController.submitRecommendationFeedback(req, res);
            return true;
        }

        // Route not handled by this handler
        return false;

    } catch (error) {
        console.error('Recommendation route error:', error);
        sendResponse(res, 400, {
            error: error.message || 'Invalid request parameters',
            code: 'VALIDATION_ERROR'
        });
        return true;
    }
}

module.exports = handleRecommendationRoutes;
