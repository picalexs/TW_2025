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

        if (!code) {
            console.error('Google callback error: No authorization code received.');
            return sendResponse(res, 400, { success: false, message: 'Authorization code missing.' });
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
                    user = await userModel.createUser({ email, name, picture });
                } catch (err) {
                    console.error('Error creating new user from Google profile:', err);
                    return sendResponse(res, 500, { success: false, message: 'Failed to create user from Google profile.' });
                }
            }

            console.log('[GoogleAuth] Generating app JWT...');
            const appJwt = jwt.sign(
                { id: user.id, email: user.email, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '1h' } 
            );
            console.log('[GoogleAuth] App JWT generated.');

            const frontendBaseUrl = await this.getFrontendBaseUrlFromApi();
            const frontendHomeUrl = `${frontendBaseUrl}/home/home.html?token=${appJwt}&id=${user.id}&username=${user.username}&email=${user.email}&role=${user.role || 'user'}`;
            res.writeHead(302, { 'Location': frontendHomeUrl });
            res.end();
            console.log(`[GoogleAuth] Redirecting to frontend: ${frontendHomeUrl}`);

        } catch (error) {
            console.error('[GoogleAuth] Error in handleGoogleCallback:', error);
            return sendResponse(res, 500, { success: false, message: 'Internal server error during Google authentication.' });
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

    getFrontendBaseUrlFromApi() {
        return new Promise((resolve) => {
            const http = require('http');
            const baseUrl = process.env.BASE_URL;
            const apiUrl = `${baseUrl}/api/frontend-url`;
            const frontendUrl = `${baseUrl}/frontend`;

            http.get(apiUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const contentType = res.headers['content-type'] || '';
                    if (res.statusCode === 200 && contentType.includes('application/json')) {
                        try {
                            const result = JSON.parse(data);
                            if (result && result.url) {
                                resolve(result.url);
                                return;
                            }
                        } catch (e) {
                            console.error('Error parsing frontend URL response:', e);
                        }
                    } else {
                        console.error('Failed to get frontend URL from API. Status:', res.statusCode, 'Content-Type:', contentType);
                    }
                });
            }).on('error', (err) => {
                console.error('HTTP error while fetching frontend base URL:', err);
            });
        });
    }
}

module.exports = new GoogleAuthController();