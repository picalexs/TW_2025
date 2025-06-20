// F:\TW_2025\backend\middleware\authMiddleware.js
require('dotenv').config(); // Încarcă variabilele de mediu din .env
const jwt = require('jsonwebtoken'); // Importă biblioteca jsonwebtoken
const { sendResponse } = require('../utils/helpers'); // Importă funcția sendResponse pentru a trimite răspunsuri HTTP

// Secretul JWT și timpul de expirare, preluate din variabilele de mediu
// ESTE CRUCIAL ca JWT_SECRET să fie o cheie secretă complexă și unică,
// iar TOKEN_EXPIRATION să fie setat în fișierul .env.
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '1h'; // Valoare implicită: 1 oră dacă nu e setat în .env

// Asigură-te că secretul JWT este definit. În caz contrar, serverul nu ar trebui să pornească.
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    // În mediu de producție, ai putea dori să oprești procesul aici: process.exit(1);
    // Pentru dezvoltare, poate vrei să permiți continuarea, dar ești avertizat.
}

/**
 * Middleware pentru a verifica un token JWT.
 * Dacă token-ul este valid, atașează payload-ul (informațiile despre utilizator) la req.user
 * și apelează next(). Altfel, trimite un răspuns de eroare 401.
 *
 * @param {object} req - Obiectul cererii HTTP
 * @param {object} res - Obiectul răspunsului HTTP
 * @param {function} next - Funcția de callback pentru a trece la următorul middleware
 */
const verifyToken = (req, res, next) => {
    // Obține antetul Authorization din cerere
    const authHeader = req.headers['authorization'];
    // Extrage token-ul. Formatul așteptat este "Bearer TOKEN_UL_TAU"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Dacă nu există token, utilizatorul nu este autorizat
        console.warn('Access denied: No token provided.');
        return sendResponse(res, 401, { message: 'Access Denied: No token provided.' });
    }

    try {
        // Verifică și decodifică token-ul folosind secretul JWT
        const verified = jwt.verify(token, JWT_SECRET);
        // Atașează informațiile utilizatorului decodificate la obiectul cererii
        // Astfel, rutele și controllerele ulterioare pot accesa req.user
        req.user = verified;
        // Continuă la următorul middleware sau la handler-ul de rută
        next();
    } catch (err) {
        // Gestionează erorile de verificare a token-ului
        console.error('Token verification failed:', err.message);
        if (err.name === 'TokenExpiredError') {
            return sendResponse(res, 401, { message: 'Invalid Token: Token expired.' });
        }
        // Pentru orice altă eroare de verificare (invalid signature, malformed token etc.)
        return sendResponse(res, 401, { message: 'Invalid Token: Access Denied.' });
    }
};

/**
 * Middleware factory pentru a verifica rolul(urile) utilizatorului.
 * Returnează un middleware care verifică dacă req.user.role se potrivește cu rolurile permise.
 *
 * @param {string|string[]} roles - Un singur rol (ex: 'admin') sau un array de roluri (ex: ['admin', 'shelter'])
 * @returns {function} Un middleware care poate fi utilizat într-o rută.
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        // Verifică dacă informațiile utilizatorului sunt disponibile (adică verifyToken a rulat deja cu succes)
        if (!req.user || !req.user.role) {
            console.warn('Access denied: User not authenticated or role missing in token.');
            return sendResponse(res, 403, { message: 'Access Denied: User not authenticated or role missing.' });
        }

        // Asigură-te că 'roles' este întotdeauna un array pentru o verificare consistentă
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        // Verifică dacă rolul utilizatorului este inclus în lista de roluri permise
        if (!allowedRoles.includes(req.user.role)) {
            console.warn(`Access denied: User role "${req.user.role}" not allowed. Required roles: [${allowedRoles.join(', ')}].`);
            return sendResponse(res, 403, { message: 'Access Denied: Insufficient permissions.' });
        }

        // Dacă rolul este permis, continuă la următorul middleware sau la handler-ul de rută
        next();
    };
};

/**
 * Funcție pentru a genera un token JWT.
 * Utilizată de obicei în procesele de login/înregistrare.
 *
 * @param {object} payload - Obiectul care conține informațiile de inclus în token (ex: { userId: '...', role: '...' })
 * @returns {string} Token-ul JWT generat.
 */
const generateToken = (payload) => {
    // Semnează payload-ul cu secretul și setează timpul de expirare
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
};

// Exportă middleware-urile și funcția de generare a token-ului
module.exports = {
    verifyToken,
    checkRole,
    generateToken
};