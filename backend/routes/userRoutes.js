const userController = require("../controllers/userController");
const url = require("url");
const { sendResponse } = require("../utils/helpers");
const googleAuthController = require('../controllers/googleAuthController');

const { verifyToken, checkRole } = require('../middleware/authMiddleware'); 

async function handleUserRoutes(req, res) {
    let routeHandled = false;
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, "");
    const method = req.method.toLowerCase();

    if (trimmedPath === "api/users/register" && method === "post") {
        console.log('[UserRoutes] Handling /api/users/register POST request (Public)');
        await userController.createUser(req, res);
        return true;
    }

    if (trimmedPath === "api/users/verify-email" && method === "get") {
        console.log('[UserRoutes] Handling /api/users/verify-email GET request (Public)');
        await userController.verifyEmail(req, res);
        return true;
    }

    if (trimmedPath === "api/auth/login" && method === "post") {
        console.log('[UserRoutes] Handling /api/auth/login POST request (Public)');
        await userController.authenticateUser(req, res);
        return true;
    }

    if (trimmedPath === "api/users/with-adoptions" && method === "get") {
        console.log('[UserRoutes] Handling /api/users/with-adoptions GET request (Public via server.js whitelist)');
        await userController.getAllUsersWithAdoptions(req, res);
        return true;
    }

    if (trimmedPath === "api/users" || trimmedPath === "api/users/") {
        if (method === "get") {
            console.log('[UserRoutes] Handling /api/users GET request (Public)');
            await userController.getAllUsers(req, res); 
            return true;
        } else {
            sendResponse(res, 405, { error: "Method not allowed for /api/users." });
            return true;
        }
    }

    const userIdMatch = trimmedPath.match(/^api\/users\/(\d+)$/);
    if (userIdMatch) {
        const id = parseInt(userIdMatch[1]);

        if (method === "get") {
            console.log(`[UserRoutes] Handling /api/users/${id} GET request (Public)`);
            await userController.getUserById(req, res, id);
            return true;  
        } else if (method === "put") {
            console.log(`[UserRoutes] Handling /api/users/${id} PUT request (Protected - Own Profile)`);
            await new Promise((resolve, reject) => {
                verifyToken(req, res, async (err) => {
                    if (err) {
                        console.error(`[UserRoutes] Token verification failed for PUT /api/users/${id}:`, err);
                        return reject(err);
                    }
                    console.log(`[UserRoutes] Token verified for user update: ${req.user?.id} updating user ${id}`);
                    await userController.updateUser(req, res, id);
                    resolve();
                });
            });
            return true;
        } else if (method === "delete") {
            console.log(`[UserRoutes] Handling /api/users/${id} DELETE request (Protected)`);
            await new Promise((resolve, reject) => {
                verifyToken(req, res, async (err) => {
                    if (err) return reject(err);
                    checkRole('admin')(req, res, async (roleErr) => {
                        if (roleErr) return reject(roleErr);
                        await userController.deleteUser(req, res, id);
                        resolve();
                    });
                });
            });
            return true;
        } else {
            sendResponse(res, 405, { error: "Method not allowed for user ID routes" });
            return true;
        }
    }

    if (trimmedPath === "api/auth/google/callback" && method === "get") {
        console.log('[UserRoutes] Handling /api/auth/google/callback GET request');
        await googleAuthController.handleGoogleCallback(req, res);
        return true;
    }

    console.log(`[UserRoutes] No user route matched: ${trimmedPath}`);
    return false;
}

module.exports = handleUserRoutes;