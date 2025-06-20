// const userController = require("../controllers/userController");
// const url = require("url");
// const { sendResponse } = require("../utils/helpers")
// const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// async function handleUserRoutes(req, res) {
//   let routeHandled = false;
//   const parsedUrl = url.parse(req.url, true);
//   const path = parsedUrl.pathname;
//   const trimmedPath = path.replace(/^\/+|\/+$/g, "");  
//   const method = req.method.toLowerCase();

//   if (trimmedPath === "api/users/register" && method === "post") {
//     console.log('[UserRoutes] Handling /api/users/register POST request');
//     await userController.createUser(req, res);
//     return true;
//   }

//   if (trimmedPath === "api/users/verify-email" && method === "get") {
//     console.log('[UserRoutes] Handling /api/users/verify-email GET request');
//     await userController.verifyEmail(req, res);
//     return true;
//   }
//   if (trimmedPath === "api/auth/login" && method === "post") {
//     console.log('[UserRoutes] Handling /api/auth/login POST request');
//     await userController.authenticateUser(req, res);
//     return true;
//   }

//   if (trimmedPath === "api/users/with-adoptions" && method === "get") {
//     console.log('[UserRoutes] Handling /api/users/with-adoptions GET request');
//     await userController.getAllUsersWithAdoptions(req, res);
//     return true;
//   }

//   if (trimmedPath === "api/users" || trimmedPath === "api\/users") {
//     if (method === "get") {
//       console.log('[UserRoutes] Handling /api/users GET request');
//       await userController.getAllUsers(req, res);
//     } else {
//       sendResponse(res, 405, { error: "Method not allowed" });
//     }
//     return true;
//   }

//   const userIdMatch = trimmedPath.match(/^api\/users\/(\d+)$/);
//   if (userIdMatch) {
//     const id = parseInt(userIdMatch[1]);
//     if (method === "get") {
//       console.log(`[UserRoutes] Handling /api/users/${id} GET request`);
//       await userController.getUserById(req, res, id);
//     } else if (method === "put") {
//       console.log(`[UserRoutes] Handling /api/users/${id} PUT request`);
//       await userController.updateUser(req, res, id);
//     } else if (method === "delete") {
//       console.log(`[UserRoutes] Handling /api/users/${id} DELETE request`);
//       await userController.deleteUser(req, res, id);
//     } else {
//       sendResponse(res, 405, { error: "Method not allowed" });
//     }
//     return true;
//   }

//   console.log(`[UserRoutes] No user route matched: ${trimmedPath}`);
//   return false;
// }

// module.exports = handleUserRoutes;


// userRoutes.js
const userController = require("../controllers/userController");
const url = require("url");
const { sendResponse } = require("../utils/helpers");
// **IMPORTĂ MIDDLEWARE-URILE DE AUTENTIFICARE ȘI AUTORIZARE**
const { verifyToken, checkRole } = require('../middleware/authMiddleware'); // <-- Adaugă asta

async function handleUserRoutes(req, res) {
    let routeHandled = false;
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, "");
    const method = req.method.toLowerCase();

    // Rute Publice (nu necesită JWT) - deja gestionate în server.js, dar le menționăm aici pentru claritate
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

    // --- RUTE PROTEJATE CU JWT ---
    // Pentru aceste rute, vom apela middleware-ul verifyToken înainte de controller.
    // Middleware-ul verifyToken populează req.user dacă token-ul este valid.

    // Exemplu: Protejarea rutelor de obținere a utilizatorilor
    // Presupunem că doar utilizatorii autentificați ar trebui să poată cere liste de utilizatori.
    // De asemenea, vom adăuga o verificare de rol pentru "admin" pentru rute sensibile.

    // Aici vom re-structura puțin logica pentru a integra middleware-urile.
    // Vom verifica rutele și apoi vom aplica middleware-urile.

    if (trimmedPath === "api/users/with-adoptions" && method === "get") {
        // console.log('[UserRoutes] Handling /api/users/with-adoptions GET request (Protected)');
        // Aplică verifyToken înainte de a apela controller-ul
        // await new Promise((resolve, reject) => {
        //     verifyToken(req, res, async (err) => {
        //         if (err) return reject(err); // verifyToken a trimis deja răspunsul de eroare
        //         // Opțional: checkRole pentru această rută, dacă doar anumiți utilizatori o pot accesa
        //         // checkRole('admin')(req, res, async (roleErr) => {
        //         //     if (roleErr) return reject(roleErr);
        //             await userController.getAllUsersWithAdoptions(req, res);
        //             resolve();
        //         // });
        //     });
        // });
        console.log('[UserRoutes] Handling /api/users/with-adoptions GET request (Public via server.js whitelist)');
        await userController.getAllUsersWithAdoptions(req, res);
        return true;
    }

    if (trimmedPath === "api/users" || trimmedPath === "api/users/") {
        if (method === "get") {
            console.log('[UserRoutes] Handling /api/users GET request (Protected - requires admin)');
            await new Promise((resolve, reject) => {
                verifyToken(req, res, async (err) => { // Aceasta rămâne dacă vrei ca /api/users (toți) să necesite token
                    if (err) return reject(err);
                    checkRole('admin')(req, res, async (roleErr) => {
                        if (roleErr) return reject(roleErr);
                        await userController.getAllUsers(req, res);
                        resolve();
                    });
                });
            });
            return true;
        } else {
            sendResponse(res, 405, { error: "Method not allowed for /api/users." });
            return true;
        }
    }

    // if (trimmedPath === "api/users" || trimmedPath === "api/users/") { // Adăugat '/' pentru consistență
    //     if (method === "get") {
    //         console.log('[UserRoutes] Handling /api/users GET request (Protected)');
    //         await new Promise((resolve, reject) => {
    //             verifyToken(req, res, async (err) => {
    //                 if (err) return reject(err);
    //                 // Poate vrei ca doar adminii să poată vedea TOȚI utilizatorii
    //                 checkRole('admin')(req, res, async (roleErr) => { // <-- Exemplu de verificare rol
    //                     if (roleErr) return reject(roleErr);
    //                     await userController.getAllUsers(req, res);
    //                     resolve();
    //                 });
    //             });
    //         });
    //         return true;
    //     } else {
    //         // Răspuns pentru metode HTTP nepermise pe /api/users (ex: POST, DELETE - dacă nu sunt implementate)
    //         sendResponse(res, 405, { error: "Method not allowed for /api/users." });
    //         return true;
    //     }
    // }

    const userIdMatch = trimmedPath.match(/^api\/users\/(\d+)$/);
    if (userIdMatch) {
        const id = parseInt(userIdMatch[1]);

        if (method === "get") {
            console.log(`[UserRoutes] Handling /api/users/${id} GET request (Protected)`);
            await new Promise((resolve, reject) => {
                verifyToken(req, res, async (err) => {
                    if (err) return reject(err);
                    // Un utilizator ar trebui să poată vedea propriul profil SAU un admin poate vedea orice profil
                    // Logica de autorizare complexă ar trebui să fie în controller/model
                    // Aici, asigurăm doar că este autentificat
                    await userController.getUserById(req, res, id);
                    resolve();
                });
            });
            return true;
        } else if (method === "put") {
            console.log(`[UserRoutes] Handling /api/users/${id} PUT request (Protected)`);
            await new Promise((resolve, reject) => {
                verifyToken(req, res, async (err) => {
                    if (err) return reject(err);
                    // Doar utilizatorul însuși SAU un admin ar trebui să poată actualiza.
                    // Aici vom adăuga o verificare de rol de "admin" pentru exemplu.
                    // Logica pentru "utilizatorul își poate edita propriul profil" ar trebui să fie în controller.
                    checkRole('admin')(req, res, async (roleErr) => { // <-- Exemplu de verificare rol
                        if (roleErr) return reject(roleErr);
                        await userController.updateUser(req, res, id);
                        resolve();
                    });
                });
            });
            return true;
        } else if (method === "delete") {
            console.log(`[UserRoutes] Handling /api/users/${id} DELETE request (Protected)`);
            await new Promise((resolve, reject) => {
                verifyToken(req, res, async (err) => {
                    if (err) return reject(err);
                    // Doar un admin poate șterge utilizatori
                    checkRole('admin')(req, res, async (roleErr) => { // <-- Exemplu de verificare rol
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

    console.log(`[UserRoutes] No user route matched: ${trimmedPath}`);
    return false;
}

module.exports = handleUserRoutes;