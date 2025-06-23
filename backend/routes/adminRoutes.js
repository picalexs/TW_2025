const adminController = require('../controllers/adminController');
const url = require('url');
const { sendResponse } = require('../utils/helpers');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

async function handleAdminRoutes(req, res) {
  let routeHandled = false;
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();

  const requireAdmin = async (handler) => {
    return new Promise((resolve) => {
      verifyToken(req, res, async (err) => {
        if (err) {
          console.log('[AdminRoutes] Authentication failed:', err.message);
          sendResponse(res, 401, { success: false, message: 'Authentication required' });
          return resolve(true);
        }
        
        checkRole('admin')(req, res, async (roleErr) => {
          if (roleErr) {
            console.log('[AdminRoutes] Admin role check failed:', roleErr.message);
            sendResponse(res, 403, { success: false, message: 'Admin access required' });
            return resolve(true);
          }
          
          try {
            await handler();
          } catch (error) {
            console.error('[AdminRoutes] Error in admin handler:', error);
            sendResponse(res, 500, { success: false, message: 'Internal server error' });
          }
          resolve(true);
        });
      });
    });
  };

  if (trimmedPath === "api/admin/tables" && method === "get") {
    console.log('[AdminRoutes] Handling /api/admin/tables GET request (Protected - Admin Only)');
    routeHandled = await requireAdmin(async () => {
      await adminController.getAvailableTables(req, res);
    });
    return routeHandled;
  }

  if (trimmedPath.startsWith("api/admin/tables/") && trimmedPath.endsWith("/export") && method === "get") {
    console.log('[AdminRoutes] Handling table export GET request (Protected - Admin Only)');
    const pathParts = trimmedPath.split('/');
    const tableName = pathParts[3];
    
    const combinedQuery = { ...parsedUrl.query, table: tableName };
    req.query = combinedQuery;
    
    routeHandled = await requireAdmin(async () => {
      await adminController.exportTable(req, res);
    });
    return routeHandled;
  }

  if (trimmedPath.startsWith("api/admin/tables/") && trimmedPath.endsWith("/preview") && method === "get") {
    console.log('[AdminRoutes] Handling table preview GET request (Protected - Admin Only)');
    const pathParts = trimmedPath.split('/');
    const tableName = pathParts[3];
    
    const combinedQuery = { ...parsedUrl.query, table: tableName };
    req.query = combinedQuery;
    
    routeHandled = await requireAdmin(async () => {
      await adminController.previewTable(req, res);
    });
    return routeHandled;
  }

  return routeHandled;
}
module.exports = handleAdminRoutes;