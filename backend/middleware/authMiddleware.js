require('dotenv').config();
const jwt = require('jsonwebtoken'); 
const { sendResponse } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '1h';

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
}

/**
 *
 * @param {object} req
 * @param {object} res 
 * @param {function} next 
 */
const verifyToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.warn('Access denied: No token provided.');
        return sendResponse(res, 401, { message: 'Access Denied: No token provided.' });
    }    
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        if (err.name === 'TokenExpiredError') {
            return sendResponse(res, 401, { message: 'Invalid Token: Token expired.' });
        }
        return sendResponse(res, 401, { message: 'Invalid Token: Access Denied.' });
    }
};

/**
 * @param {string|string[]} roles 
 * @returns {function} 
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            console.warn('Access denied: User not authenticated or role missing in token.');
            return sendResponse(res, 403, { message: 'Access Denied: User not authenticated or role missing.' });
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            console.warn(`Access denied: User role "${req.user.role}" not allowed. Required roles: [${allowedRoles.join(', ')}].`);
            return sendResponse(res, 403, { message: 'Access Denied: Insufficient permissions.' });
        }

        next();
    };
};

/**
 * @param {object} payload
 * @returns {string}
 */
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
};

module.exports = {
    verifyToken,
    checkRole,
    generateToken
};