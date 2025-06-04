const userModel = require("../models/userModel");
const { sendResponse, collectRequestData } = require("../utils/helpers");
const bcrypt = require('bcrypt'); 
const crypto = require('crypto'); 
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
//require("dotenv").config();

class UserController {
  async getAllUsers(req, res) {
    try {
      const users = await userModel.getAll();
      sendResponse(res, 200, users);
    } catch (error) {
      console.error("Error getting all users:", error);
      sendResponse(res, 500, { error: "Failed to fetch users", message: error.message });
    }
  }

  async getUserById(req, res, id) {
    try {
      const user = await userModel.getById(id);
      if (user) {
        sendResponse(res, 200, user);
      } else {
        sendResponse(res, 404, { error: "User not found" });
      }
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch user", message: error.message });
    }
  }

  async createUser(req, res) {
    try {
      const { username, email, password } = await collectRequestData(req);

      if (!username || !email || !password) {
        return sendResponse(res, 400, { message: 'All fields are required.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const emailToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await userModel.createUser({
        username,
        password_hash: passwordHash,
        email,
        email_token: emailToken,
        token_expires: tokenExpires
      });

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const verificationLink = `http://localhost:${process.env.API_PORT}/api/users/verify-email?token=${emailToken}`;
      const mailOptions = {
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email Address',
        html: `<p>Please click this link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return sendResponse(res, 500, { message: 'User registered, but failed to send verification email.' });
        }
        console.log('Verification email sent:', info.response);
      });

      sendResponse(res, 201, { message: 'User registered successfully. Please check your email for verification.' });

    } catch (error) {
      console.error("Error during user registration:", error);
      if (error.message.includes('ORA-20001')) {
        sendResponse(res, 409, { error: 'Conflict', message: 'Username already exists.' });
      } else if (error.message.includes('ORA-20002')) {
        sendResponse(res, 409, { error: 'Conflict', message: 'Email address already exists.' });
      } else {
        sendResponse(res, 500, { error: "Failed to register user", message: error.message });
      }
    }
  }

  async verifyEmail(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const token = parsedUrl.searchParams.get('token');

    if (!token) {
      return sendResponse(res, 400, { error: 'Bad Request', message: 'Verification token is missing.' });
    }

    try {
      const user = await userModel.findUserByEmailToken(token);

      if (!user) {
        return sendResponse(res, 400, { error: 'Invalid Token', message: 'Invalid or expired verification token.' });
      }

      const now = new Date();
      if (user.token_expires && new Date(user.token_expires) < now) {
        return sendResponse(res, 400, { error: 'Token Expired', message: 'Verification token has expired.' });
      }

      await userModel.verifyUser(user.id);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified</title>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Quicksand', sans-serif;
                text-align: center;
                background: linear-gradient(to bottom right, #e0f7ff, #ffffff);
                margin: 0;
                padding: 40px 20px;
                color: #2c3e50;
            }

            .container {
                max-width: 500px;
                margin: auto;
                background-color: #ffffff;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 8px 20px rgba(0, 123, 255, 0.2);
            }

            h1 {
                color: #007bff;
                font-size: 2em;
                margin-bottom: 20px;
            }

            p {
                font-size: 1.1em;
                line-height: 1.6;
                margin-bottom: 15px;
            }

            .button {
                background-color: #007bff;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 25px;
                font-size: 1em;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.3s ease;
            }

            .button:hover {
                background-color: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Email Verified! 🐶</h1>
            <p>Your email address has been successfully verified.</p>
            <p>You can now return to the website and log in to your account.</p>
            <button class="button" onclick="window.close();">Close this window</button>
        </div>
    </body>
    </html>
      `);

    } catch (error) {
      console.error('Error during email verification:', error);
      sendResponse(res, 500, { error: 'Server Error', message: 'Server error during email verification.' });
    }
  }


  async updateUser(req, res, id) {
    try {
      const userData = await collectRequestData(req);
      const updatedUser = await userModel.updateUser(id, userData);
      if (updatedUser) {
        sendResponse(res, 200, updatedUser);
      } else {
        sendResponse(res, 404, { error: "User not found for update" });
      }
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to update user", message: error.message });
    }
  }

  async deleteUser(req, res, id) {
    try {
      const deleted = await userModel.delete(id);
      if (deleted) {
        sendResponse(res, 204, {});
      } else {
        sendResponse(res, 404, { error: "User not found for deletion" });
      }
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to delete user", message: error.message });
    }
  }

   async authenticateUser(req, res) {
        try {
            const { email, password } = await collectRequestData(req);

            // Aici primești obiectul { success: boolean, message: string, user?: object }
            const authResult = await userModel.authenticate(email, password); 

            if (authResult.success && authResult.user) {
                // Acum ai acces la obiectul utilizatorului autentificat prin authResult.user
                const user = authResult.user;

                // Opțional, poți reintroduce verificarea is_verified aici, deși DTO-ul o face deja.
                // Dar pentru o claritate mai bună, lasă DTO-ul să decidă autentificarea completă.
                // Daca ai mesaj de eroare in DTO pentru "The account is not verified", atunci nu mai ai nevoie de acest if aici.
                // Verifica DTO-ul tau!
                // Conform DTO-ului tău actual, dacă IS_VERIFIED nu e 1, DTO-ul deja returnează success: false cu mesajul "The account is not verified".
                // Deci, e suficient să verifici doar authResult.success.

                // Generează un token JWT
                const token = jwt.sign(
                    { id: user.id, email: user.email, username: user.username }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '1h' } 
                );

                // Prepară datele utilizatorului pentru răspuns
                const userResponse = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    is_verified: user.is_verified // DTO-ul tău returnează IS_VERIFIED, care este mapat la is_verified
                };

                sendResponse(res, 200, { 
                    success: true,
                    message: authResult.message, // Folosește mesajul din DTO
                    token: token, 
                    user: userResponse 
                });

            } else {
                // Dacă autentificarea a eșuat (authResult.success este false)
                // DTO-ul tău deja returnează mesaje specifice pentru "Incorrect email or word" și "The account is not verified"
                const statusCode = authResult.message.includes("not verified") ? 401 : 401; // Poți folosi un alt status code dacă vrei (ex: 403 Forbidden pentru neverificat)
                sendResponse(res, statusCode, { 
                    success: false, 
                    error: "Authentication failed", 
                    message: authResult.message 
                });
            }
        } catch (error) {
            console.error("Error during authentication in UserController:", error); // Adaugă un log mai specific aici
            sendResponse(res, 500, { 
                success: false,
                error: "Authentication failed", 
                message: error.message || "Internal server error during authentication." 
            });
        }
    }

  async login(req, res) {
    try {
      const body = await collectRequestData(req);
      const { email, password } = JSON.parse(body);

      if (!email || !password) {
        return sendResponse(res, 400, { error: "Bad Request", message: "Email și parolă sunt obligatorii." });
      }

      const authResult = await userModel.authenticate(email, password);

      if (authResult.success) {
        sendResponse(res, 200, { message: authResult.message, user: authResult.user });
      } else {
        sendResponse(res, 401, { error: "Unauthorized", message: authResult.message });
      }

    } catch (error) {
      console.error("Error during user login:", error);
      sendResponse(res, 500, { error: "Server Error", message: "Eroare internă a serverului în timpul autentificării." });
    }
  }
}
module.exports = new UserController();