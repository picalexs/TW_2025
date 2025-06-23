const https = require('https');
const url = require('url');
const { sendResponse, collectRequestData } = require('../utils/helpers');
const jwt = require('jsonwebtoken'); 
const userModel = require('../models/userModel'); 

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

class GoogleAuthController {    
    
    async handleGoogleCallback(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const code = parsedUrl.query.code;
        const error = parsedUrl.query.error;        
        
        if (error === 'access_denied') {
            console.log('[GoogleAuth] User cancelled Google login, redirecting to login page');
            const baseUrl = this.getBaseUrl();
            const loginUrl = `${baseUrl}/frontend/login/login.html?message=Google login was cancelled`;
            res.writeHead(302, { 'Location': loginUrl });
            res.end();
            return;
        }

        if (!code) {
            console.error('Google callback error: No authorization code received.');
            const baseUrl = this.getBaseUrl();
            const loginUrl = `${baseUrl}/frontend/login/login.html?error=auth_failed`;
            res.writeHead(302, { 'Location': loginUrl });
            res.end();
            return;
        }

        try {
            const tokenResponse = await this._exchangeCodeForTokens(code);
            const { access_token, id_token } = tokenResponse;

            if (!access_token) {
                console.error('Google token exchange error: No access token received.');
                return sendResponse(res, 500, { success: false, message: 'Failed to obtain access token from Google.' });
            }

            const googleUserInfo = this._decodeGoogleIdToken(id_token);
            if (!googleUserInfo || !googleUserInfo.email) {
                console.error('Failed to get user info from Google ID token.');
                return sendResponse(res, 500, { success: false, message: 'Failed to get user profile from Google.' });
            }

            const { email, name, picture } = googleUserInfo;
            let user;
            try {
                user = await userModel.findByEmail(email);
            } catch (err) {
                console.error(`[GoogleAuth] Error searching for user by email: ${email}`, err);
                return sendResponse(res, 500, { success: false, message: 'Database error during user lookup.' });
            }            
            
            if (!user) {
                try {
                    const userData = {
                        email,
                        username: this.generateUsernameFromEmail(email),
                        first_name: name ? name.split(' ')[0] : null,
                        last_name: name ? name.split(' ').slice(1).join(' ') : null,
                        profile_picture: picture,
                        auth_provider: 'google',
                        is_verified: true
                    };
                    console.log('[GoogleAuth] Creating new user with data:', { ...userData, profile_picture: userData.profile_picture ? 'present' : 'null' });
                    user = await userModel.createUserFromGoogle(userData);
                    console.log('[GoogleAuth] New user created successfully:', user.id);
                } catch (err) {
                    console.error('Error creating new user from Google profile:', err);
                    const baseUrl = this.getBaseUrl();
                    const loginUrl = `${baseUrl}/frontend/login/login.html?error=registration_failed&message=${encodeURIComponent('Failed to create account. Please try again.')}`;
                    res.writeHead(302, { 'Location': loginUrl });
                    res.end();
                    return;
                }
            }

            console.log('[GoogleAuth] Generating app JWT...');
            const appJwt = jwt.sign(
                { id: user.id, email: user.email, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '1h' } 
            );
            console.log('[GoogleAuth] App JWT generated.');            const baseUrl = this.getBaseUrl();
            const frontendHomeUrl = `${baseUrl}/frontend/home/home.html?token=${appJwt}&id=${user.id}&username=${user.username}&email=${user.email}&role=${user.role || 'user'}`;
            res.writeHead(302, { 'Location': frontendHomeUrl });
            res.end();
            console.log(`[GoogleAuth] Redirecting to frontend: ${frontendHomeUrl}`);
        } catch (error) {
            console.error('[GoogleAuth] Error in handleGoogleCallback:', error);
            const baseUrl = this.getBaseUrl();
            const loginUrl = `${baseUrl}/frontend/login/login.html?error=auth_failed`;
            res.writeHead(302, { 'Location': loginUrl });
            res.end();
            return;
        }
    }

    _exchangeCodeForTokens(code) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                code: code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString();

            const options = {
                hostname: 'oauth2.googleapis.com',
                path: '/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse token response: ' + data));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });
    }

    _decodeGoogleIdToken(idToken) {
        try {
            const base64Url = idToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding Google ID token:', error);
            return null;
        }
    }

    generateUsernameFromEmail(email) {
        const baseUsername = email.split('@')[0]
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        
        const randomSuffix = Math.floor(Math.random() * 10000);
        return `${baseUsername}${randomSuffix}`;
    }    
    getBaseUrl() {
        return process.env.BASE_URL || 
               `${process.env.FRONTEND_PROTOCOL || 'http'}://${process.env.FRONTEND_HOST || 'localhost'}:${process.env.FRONTEND_PORTS?.split(',')[0] || '5500'}`;
    }
      
    getFrontendBaseUrlFromApi() {
        return new Promise((resolve) => {
            if (frontendUrl) {
                resolve(frontendUrl);
                return;
            }
            
            const baseUrl = process.env.BASE_URL;
            if (baseUrl) {
                const fallbackUrl = `${baseUrl}/frontend`;
                console.log(`[GoogleAuth] Using BASE_URL fallback: ${fallbackUrl}`);
                resolve(fallbackUrl);
                return;
            }
            
            const finalFallback = 'http://127.0.0.1:5500/frontend';
            console.log(`[GoogleAuth] Using hardcoded fallback: ${finalFallback}`);
            resolve(finalFallback);
        });
    }
}

module.exports = new GoogleAuthController();