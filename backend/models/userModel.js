const userDTO = require("../dto/userDTO");
const AbstractModel = require("./abstractModel");
const db = require('../db/dbConnection');

class UserModel extends AbstractModel {
  constructor() {
    super(userDTO);
    this.dto = userDTO;
  }

  async createUser(userData) {
    this.validateUserRegistrationData(userData);
    
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.create(connection, userData);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  validateUserRegistrationData(userData) {
    this.validateData(userData);

    this.validateRequired(userData.username, 'Username');
    this.validateRequired(userData.email, 'Email');
    this.validateRequired(userData.password_hash, 'Password');

    this.validateLength(userData.username, 'Username', 3, 50);
    this.validateUsernameFormat(userData.username);

    this.validateLength(userData.email, 'Email', 5, 100);
    this.validateEmailFormat(userData.email);

    if (userData.first_name) {
      this.validateLength(userData.first_name, 'First name', 1, 50);
    }

    if (userData.last_name) {
      this.validateLength(userData.last_name, 'Last name', 1, 50);
    }

    if (userData.phone_number) {
      this.validateLength(userData.phone_number, 'Phone number', 10, 20);
      this.validatePhoneFormat(userData.phone_number);
    }
  }

  validateGoogleUserData(userData) {
    this.validateData(userData);

    this.validateRequired(userData.username, 'Username');
    this.validateRequired(userData.email, 'Email');

    this.validateLength(userData.username, 'Username', 3, 50);
    this.validateUsernameFormat(userData.username);

    this.validateLength(userData.email, 'Email', 5, 100);
    this.validateEmailFormat(userData.email);

    if (userData.first_name) {
      this.validateLength(userData.first_name, 'First name', 1, 50);
    }

    if (userData.last_name) {
      this.validateLength(userData.last_name, 'Last name', 1, 50);
    }

    if (userData.phone_number) {
      this.validateLength(userData.phone_number, 'Phone number', 10, 20);
      this.validatePhoneFormat(userData.phone_number);
    }
  }

  validateUserLoginData(email, password) {
    this.validateRequired(email, 'Email');
    this.validateRequired(password, 'Password');
    this.validateEmailFormat(email);
  }

  validateUsernameFormat(username) {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      throw Object.assign(
        new Error('Username can only contain letters, numbers, and underscores'),
        { code: 'INVALID_USERNAME_FORMAT', status: 400 }
      );
    }
  }

  validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw Object.assign(
        new Error('Please provide a valid email address'),
        { code: 'INVALID_EMAIL_FORMAT', status: 400 }
      );
    }
  }

  validatePhoneFormat(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw Object.assign(
        new Error('Phone number must be between 10 and 15 digits'),
        { code: 'INVALID_PHONE_FORMAT', status: 400 }
      );
    }
  }

  async findUserByEmailToken(token) {
    let connection;
    try {
      connection = await db.getConnection();
      const user = await this.dto.findByToken(connection, token);
      return user;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async verifyUser(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.updateVerificationStatus(connection, userId);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }
  
  async updateUser(id, userData) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.update(connection, id, userData);
      return { success: true, user: result, message: "User updated successfully" };
    } catch (error) {
      console.error('Error updating user:', error);
      return { 
        success: false, 
        message: error.message || "Failed to update user",
        statusCode: error.status || 500
      };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  }

  async updateUserWithFiles(id, fields, files) {
    let connection;
    try {
      connection = await db.getConnection();
      
      const savedFiles = [];
      for (const file of files) {
        if (file.fieldname === 'profile_picture') {
          const savedFile = await this.saveProfilePicture(file, id);
          savedFiles.push(savedFile);
        }
      }
      
      const userData = { ...fields };
      if (savedFiles.length > 0) {
        userData.profile_picture = savedFiles[0].path;
      }
      
      const result = await this.dto.update(connection, id, userData);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async saveProfilePicture(file, userId) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const uploadDir = path.join(process.cwd(), 'server', 'images', 'profile', 'users');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    
    const fileExtension = path.extname(file.filename);
    const fileName = `user_${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    await fs.writeFile(filePath, file.buffer);
    
    const relativePath = `images/profile/users/${fileName}`;
    
    return {
      path: relativePath,
      filename: fileName,
      originalName: file.filename,
      mimeType: file.mimeType
    };
  }

  async authenticate(email, password) {
    let connection;
    try {
      connection = await db.getConnection();
      const authResult = await this.dto.authenticateUser(connection, email, password);
      return authResult;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection in authenticate model:', err);
        }
      }
    }
  }
  async getAllWithAdoptionCounts() {
    try {
      const result = await this.dto.getAllWithAdoptionCounts();
      console.log(`UserModel returned ${result.length} users`);
      return result;
    } catch (error) {
      console.error("Error in UserModel.getAllWithAdoptionCounts:", error);
      throw error;
    }
  }

  async findByEmail(email) {
    let connection;
    try {
      connection = await db.getConnection();
      const user = await this.dto.findByEmail(connection, email);
      return user;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }
  async createUserFromGoogle(userData) {
    this.validateGoogleUserData(userData);
    
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.createGoogleUser(connection, { ...userData, auth_provider: 'google' });
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async saveUserPreferenceTags(userId, tags) {
    let connection;
    try {
      connection = await db.getConnection();
      // 1. Log received tag IDs
      const receivedTagIds = tags.map(tag => tag.id);
      console.log('Received tag IDs for user', userId, ':', receivedTagIds);
      // 2. Check which tag IDs exist in TAGS table
      const result = await connection.execute(
        `SELECT id FROM tags WHERE id IN (${receivedTagIds.map((_, i) => ':id' + i).join(',')})`,
        Object.fromEntries(receivedTagIds.map((id, i) => ['id' + i, id]))
      );
      const existingTagIds = result.rows.map(row => row.ID || row.id);
      const missingTagIds = receivedTagIds.filter(id => !existingTagIds.includes(id));
      if (missingTagIds.length > 0) {
        console.error('Missing tag IDs in TAGS table:', missingTagIds);
        return { success: false, message: 'Some tag IDs do not exist in TAGS table', missingTagIds };
      }
      // 3. Delete old tags
      await connection.execute(
        'DELETE FROM user_preference_tags WHERE user_id = :userId',
        { userId },
        { autoCommit: false }
      );
      // 4. Insert new tags by ID
      for (const tagId of receivedTagIds) {
        await connection.execute(
          'INSERT INTO user_preference_tags (user_id, tag_id) VALUES (:userId, :tagId)',
          { userId, tagId },
          { autoCommit: false }
        );
      }
      await connection.commit();
      return { success: true };
    } catch (error) {
      if (connection) try { await connection.rollback(); } catch (e) {}
      return { success: false, message: error.message };
    } finally {
      if (connection) await connection.close();
    }
  }

  // Get user preference tags for a user (by JWT)
  async getUserPreferenceTags(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await connection.execute(
        'SELECT tag_id FROM user_preference_tags WHERE user_id = :userId',
        { userId }
      );
      return result.rows.map(row => row.TAG_ID || row.tag_id);
    } finally {
      if (connection) await connection.close();
    }
  }
}

module.exports = new UserModel();