const abstractDTO = require("./abstractDTO");
const bcrypt = require("bcrypt");
const oracledb = require("oracledb");

class userDTO extends abstractDTO {
  constructor() {
    super('users');
  }

  mapToEntity(dbRow) {
    return {
      id: dbRow.ID,
      username: dbRow.USERNAME,
      email: dbRow.EMAIL,
      createdAt: dbRow.CREATED_AT

    };
  }

  async create(connection, userData) {
  const { username, password_hash, email, email_token, token_expires } = userData;
  const sql = `INSERT INTO users (username, password_hash, email, is_verified, email_token, token_expires)
               VALUES (:username, :password_hash, :email, 0, :email_token, :token_expires)`;
  const binds = { username, password_hash, email, email_token, token_expires };
  const options = { autoCommit: true };
  const result = await connection.execute(sql, binds, options);
  return result;
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