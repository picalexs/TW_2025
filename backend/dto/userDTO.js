const abstractDTO = require("./abstractDTO");
const bcrypt = require("bcrypt");
const oracledb = require("oracledb");

class userDTO extends abstractDTO {
  constructor() {
    super('users');
  }
  mapToEntity(dbRow) {
    let imagePath = dbRow.FILE_PATH;
    
    if (imagePath) {
      if (imagePath.startsWith('/')) {
        imagePath = imagePath.substring(1);
      }
      if (!imagePath.startsWith('http')) {
        imagePath = `/server/${imagePath}`;
      }
    } else {
      imagePath = '/server/images/profile/default-person-profile.jpg';
    }

    return {
      id: dbRow.ID,
      username: dbRow.USERNAME,
      email: dbRow.EMAIL,
      first_name: dbRow.FIRST_NAME,
      last_name: dbRow.LAST_NAME,
      phone: dbRow.PHONE,
      role: dbRow.ROLE,
      profile_picture: dbRow.PROFILE_PICTURE,
      createdAt: dbRow.CREATED_AT,
      imagePath: imagePath
    };
  }
  async create(connection, userData) {
    try {
      const { username, password_hash, email, email_token, token_expires } = userData;
      
      if (!username || !password_hash || !email) {
        const error = new Error('Missing required fields: username, password, or email');
        error.code = 'VALIDATION_ERROR';
        error.status = 400;
        error.userMessage = 'All required fields must be provided';
        throw error;
      }

      const existingUser = await this.checkUserExists(connection, username, email);
      if (existingUser.usernameExists) {
        const error = new Error('Username already exists');
        error.code = 'USERNAME_ALREADY_EXISTS';
        error.status = 409;
        error.field = 'username';
        error.userMessage = 'Username is already taken. Please choose a different username.';
        throw error;
      }
      
      if (existingUser.emailExists) {
        const error = new Error('Email already exists');
        error.code = 'EMAIL_ALREADY_EXISTS';
        error.status = 409;
        error.field = 'email';
        error.userMessage = 'Email address is already registered. Please use a different email or try logging in.';
        throw error;
      }

      const sql = `INSERT INTO users (username, password_hash, email, is_verified, email_token, token_expires)
                   VALUES (:username, :password_hash, :email, 0, :email_token, :token_expires)`;
      const binds = { username, password_hash, email, email_token, token_expires };
      const options = { autoCommit: true };
      
      const result = await connection.execute(sql, binds, options);
      return result;
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }
      
      if (error.errorNum || error.message?.includes('ORA-')) {
        const { enhanceOracleError } = require('../db/dbConnection');
        throw enhanceOracleError(error, 'INSERT INTO users');
      }
      
      error.code = 'USER_CREATION_ERROR';
      error.status = 500;
      error.userMessage = 'Failed to create user account. Please try again.';
      throw error;
    }
  }

  async checkUserExists(connection, username, email) {
    try {
      const sql = `SELECT 
                     SUM(CASE WHEN UPPER(username) = UPPER(:username) THEN 1 ELSE 0 END) as username_count,
                     SUM(CASE WHEN UPPER(email) = UPPER(:email) THEN 1 ELSE 0 END) as email_count
                   FROM users`;
      const binds = { username, email };
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      
      const result = await connection.execute(sql, binds, options);
      const row = result.rows[0];
      
      return {
        usernameExists: row.USERNAME_COUNT > 0,
        emailExists: row.EMAIL_COUNT > 0
      };
    } catch (error) {
      console.error('Error checking user existence:', error);
      return { usernameExists: false, emailExists: false };
    }
  }

  async findByToken(connection, token) {
    const sql = `SELECT ID, USERNAME, EMAIL, IS_VERIFIED, TOKEN_EXPIRES FROM users WHERE email_token = :token`;
    const binds = { token };
    const options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };
    const result = await connection.execute(sql, binds, options);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const mappedUser = {};
      for (const key in user) {
        mappedUser[key.toLowerCase()] = user[key];
      }
      return mappedUser;
    }
    return null;
  }

  async findByUsername(connection, username) {
    const sql = `SELECT ID, USERNAME, PASSWORD_HASH, EMAIL, IS_VERIFIED FROM users WHERE username = :username`;
    const binds = { username };
    const options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT 
    };
    const result = await connection.execute(sql, binds, options);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const mappedUser = {};
      for (const key in user) {
        mappedUser[key.toLowerCase()] = user[key];
      }
      return mappedUser;
    }
    return null;
  }

  async updateVerificationStatus(connection, userId) {
    const sql = `UPDATE users SET is_verified = 1, email_token = NULL, token_expires = NULL WHERE id = :userId`;
    const binds = { userId };
    const options = { autoCommit: true };
    const result = await connection.execute(sql, binds, options);
    return result.rowsAffected > 0;
  }


  // async authenticateUser(email, password) {
  //   let connection;
  //   try {
  //     connection = await this.getConnection(); // Utilizează metoda din AbstractDTO
  //     const sql = `SELECT ID, USERNAME, PASSWORD_HASH, EMAIL, IS_VERIFIED FROM users WHERE email = :email`;
  //     const binds = { email };
  //     const result = await connection.execute(sql, binds);

  //     if (result.rows.length > 0) {
  //       const user = result.rows[0];
  //       const isMatch = await bcrypt.compare(password, user.PASSWORD_HASH);
  //       if (isMatch) {
  //         return {
  //           id: user.ID,
  //           username: user.USERNAME,
  //           email: user.EMAIL,
  //           is_verified: user.IS_VERIFIED
  //         };
  //       }
  //     }
  //     return null;
  //   } catch (error) {
  //     console.error("Error during authentication DTO:", error);
  //     throw error;
  //   } finally {
  //     if (connection) {
  //       await connection.close();
  //     }
  //   }
  // }

  async authenticateUser(connection, email, password) { 
    try {
      const sql = `SELECT ID, USERNAME, PASSWORD_HASH, EMAIL, IS_VERIFIED FROM users WHERE email = :email`;
      const binds = { email };
      const options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await connection.execute(sql, binds, options);

      if (result.rows.length === 0) {
        return { success: false, message: "Incorrect email or word." };
      }

      const user = result.rows[0];

      const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);

      if (!passwordMatch) {
        return { success: false, message: "Incorrect email or word." };
      }

      if (user.IS_VERIFIED !== 1) { 
        return { success: false, message: "The account is not verified. Please check your email." };
      }

      const mappedUser = {};
      for (const key in user) {
        mappedUser[key.toLowerCase()] = user[key];
      }
      return { success: true, message: "Authentication successful!", user: mappedUser };

    } catch (error) {
      console.error("Error during authentication DTO:", error);
      throw error; 
    }
  }

}
module.exports = new userDTO();