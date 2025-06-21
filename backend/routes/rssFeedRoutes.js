const rssFeedController = require('../controllers/rssFeedController');

async function handleRSSRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  switch (url.pathname) {
    case '/api/rss':
    case '/api/rss/pets':
      await rssFeedController.generateRSSFeed(req, res);
      break;
    
    case '/api/rss/demo':
      await rssFeedController.generateDemoRSSFeed(req, res);
      break;
    
    case '/api/rss/trending':
      await rssFeedController.generateTrendingRSSFeed(req, res);
      break;
    
    case '/api/rss/share':
      await rssFeedController.getShareableLinks(req, res);
      break;
    
    default:
      return false;
  }
  return true;
}
module.exports = handleRSSRoutes;