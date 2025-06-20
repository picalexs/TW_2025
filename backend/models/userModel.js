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
    return await this.dto.update(id, userData);
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
}

module.exports = new UserModel();