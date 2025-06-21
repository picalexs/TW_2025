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

        console.log('[GoogleAuth] Received callback with code:', code ? 'present' : 'missing');

        if (!code) {
            console.error('Google callback error: No authorization code received.');
            return sendResponse(res, 400, { success: false, message: 'Authorization code missing.' });
        }

        try {
            console.log('[GoogleAuth] Exchanging code for tokens...');
            const tokenResponse = await this._exchangeCodeForTokens(code);console.log('[GoogleAuth] Token response received:', tokenResponse);

            const { access_token, id_token } = tokenResponse;

            if (!access_token) {
                console.error('Google token exchange error: No access token received.');
                return sendResponse(res, 500, { success: false, message: 'Failed to obtain access token from Google.' });
            }

             console.log('[GoogleAuth] Decoding Google ID token...');
            const googleUserInfo = this._decodeGoogleIdToken(id_token);
            console.log('[GoogleAuth] Google User Info:', googleUserInfo);

            if (!googleUserInfo || !googleUserInfo.email) {
                console.error('Failed to get user info from Google ID token.');
                return sendResponse(res, 500, { success: false, message: 'Failed to get user profile from Google.' });
            }

            const { email, name, picture } = googleUserInfo;
            console.log(`[GoogleAuth] User email: ${email}, name: ${name}`);

            console.log(`[GoogleAuth] Searching for user by email: ${email}...`);
            let user = await userModel.findByEmail(email); 

            if (!user) {
                console.log(`[GoogleAuth] User not found, creating new user for ${email}...`);
                user = await userModel.createUserFromGoogle({ 
                    email: email, 
                    username: name.replace(/\s/g, '').toLowerCase() + Math.floor(Math.random() * 10000), // Generează un username unic
                    first_name: name.split(' ')[0],
                    last_name: name.split(' ').slice(1).join(' '),
                    profile_picture: picture,
                });

            console.log('[GoogleAuth] New user created:', user);
            if (!user || !user.id) { // Verifică dacă user a fost creat cu succes
                    throw new Error('User creation failed in database.');
                }
            } else {
                console.log('[GoogleAuth] User found:', user);
            }

            console.log('[GoogleAuth] Generating app JWT...');
            const appJwt = jwt.sign(
                { id: user.id, email: user.email, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '1h' } 
            );
            console.log('[GoogleAuth] App JWT generated.');

            // sendResponse(res, 200, { 
            //     success: true, 
            //     message: 'Login successful with Google!', 
            //     token: appJwt,
            //     user: { id: user.id, username: user.username, email: user.email, role: user.role }
            // });

            // Helper to fetch frontend base URL from an API with error handling and fallback
            const frontendBaseUrl = await this.getFrontendBaseUrlFromApi();
            const frontendHomeUrl = `${frontendBaseUrl}/home/home.html?token=${appJwt}&id=${user.id}&username=${user.username}&email=${user.email}&role=${user.role || 'user'}`;
            res.writeHead(302, { 'Location': frontendHomeUrl });
            res.end();
            console.log(`[GoogleAuth] Redirecting to frontend: ${frontendHomeUrl}`);

        } catch (error) {
            console.error('Google authentication failed:', error);
            sendResponse(res, 500, { success: false, message: 'Google authentication failed.' });
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
            const apiUrl = 'http://localhost:8080/api/frontend-url'; 
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
                            console.error('[GoogleAuth] Failed to parse frontend URL API response as JSON:', data);
                        }
                    } else {
                        console.error('[GoogleAuth] Unexpected response from frontend URL API:', data);
                    }
                    // Fallback to default if anything fails
                    console.warn('[GoogleAuth] Falling back to default frontend URL.');
                    resolve('http://127.0.0.1:5501/frontend');
                });
            }).on('error', (err) => {
                console.error('[GoogleAuth] Error fetching frontend URL from API:', err);
                resolve('http://127.0.0.1:5501/frontend');
            });
        });
    }
}

module.exports = new GoogleAuthController();