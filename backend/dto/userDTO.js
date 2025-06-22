const abstractDTO = require("./abstractDTO");
const bcrypt = require("bcrypt");
const oracledb = require("oracledb");
const { executeQuery } = require("../db/dbConnection");
const ImagePathHandler = require("../utils/imagePathHandler");

class userDTO extends abstractDTO {
  constructor() {
    super("users");
  }

  mapToEntity(dbRow) {
    console.log('[DEBUG] mapToEntity user row:', dbRow);
    return {
      id: dbRow.ID,
      username: dbRow.USERNAME,
      email: dbRow.EMAIL,
      first_name: dbRow.FIRST_NAME,
      last_name: dbRow.LAST_NAME,
      phone: dbRow.PHONE,
      role: dbRow.ROLE,
      profile_picture: dbRow.PROFILE_PICTURE,      
      created_at: dbRow.CREATED_AT,
      imagePath: ImagePathHandler.processUserImagePath(dbRow.PROFILE_PICTURE),
      adoption_count: dbRow.ADOPTION_COUNT || 0,
      pets_helped_count: dbRow.PETS_HELPED_COUNT || 0,
      is_verified: dbRow.IS_VERIFIED,
    };
  }

  async create(connection, userData) {
    try {
      const { username, password_hash, email, email_token, token_expires } = userData;

      if (!username || !password_hash || !email) {
        const error = new Error(
          "Missing required fields: username, password, or email"
        );
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        error.userMessage = "All required fields must be provided";
        throw error;
      }

      const sql = `INSERT INTO users (username, password_hash, email, is_verified, email_token, token_expires)
                   VALUES (:username, :password_hash, :email, 0, :email_token, :token_expires)`;
      const binds = {
        username,
        password_hash,
        email,
        email_token,
        token_expires,
      };
      const options = { autoCommit: true };

      const result = await connection.execute(sql, binds, options);
      return result;
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }

      if (error.errorNum || error.message?.includes("ORA-")) {
        const { enhanceOracleError } = require("../db/dbConnection");
        throw enhanceOracleError(error, "INSERT INTO users");
      }

      error.code = "USER_CREATION_ERROR";
      error.status = 500;
      error.userMessage = "Failed to create user account. Please try again.";
      throw error;
    }
  }

  async findByToken(connection, token) {
    const sql = `SELECT ID, USERNAME, EMAIL, IS_VERIFIED, TOKEN_EXPIRES FROM users WHERE email_token = :token`;
    const binds = { token };
    const options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
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
      outFormat: oracledb.OUT_FORMAT_OBJECT,
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

  async authenticateUser(connection, email, password) {
    try {
      const sql = `SELECT ID, USERNAME, PASSWORD_HASH, EMAIL, IS_VERIFIED, ROLE FROM users WHERE email = :email`;
      const binds = { email };
      const options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
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
        return {
          success: false,
          message: "The account is not verified. Please check your email.",
        };
      }

      const mappedUser = this.mapToEntity(user);
      return {
        success: true,
        message: "Authentication successful!",
        user: mappedUser,
      };
    } catch (error) {
      console.error("Error during authentication DTO:", error);
      throw error;
    }
  }  
  
  async getById(id) {
    try {
      if (!id) {
        throw Object.assign(new Error("User ID is required"), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }

      const query = `
        SELECT u.*, 
               NVL(adoption_stats.adoption_count, 0) as ADOPTION_COUNT,
               NVL(pets_helped_stats.pets_helped_count, 0) as PETS_HELPED_COUNT
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as adoption_count
          FROM adoptions 
          WHERE status = 'completed'
          GROUP BY user_id
        ) adoption_stats ON u.id = adoption_stats.user_id
        LEFT JOIN (
          SELECT a.shelter_id, COUNT(*) as pets_helped_count
          FROM animals a
          JOIN adoptions ad ON a.id = ad.animal_id
          WHERE ad.status = 'completed'
          GROUP BY a.shelter_id
        ) pets_helped_stats ON u.id = pets_helped_stats.shelter_id
        WHERE u.id = :id
      `;

      const result = await executeQuery(query, { id }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

      if (result.rows.length === 0) {
        throw Object.assign(new Error(`User with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404
        });
      }
      
      const mappedUser = this.mapToEntity(result.rows[0]);
      mappedUser.adoption_count = result.rows[0].ADOPTION_COUNT || 0;
      mappedUser.pets_helped_count = result.rows[0].PETS_HELPED_COUNT || 0;
      return mappedUser;
    } catch (error) {
      console.error("Error in UserDTO.getById:", error);
      if (error.code && error.status) {
        throw error;
      }
      
      throw Object.assign(new Error(`Failed to fetch user by ID: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }

  async getAllWithAdoptionCounts() {
    try {
      const query = `
        SELECT u.*, 
               NVL(adoption_stats.adoption_count, 0) as ADOPTION_COUNT
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as adoption_count
          FROM adoptions 
          WHERE status = 'completed'
          GROUP BY user_id
        ) adoption_stats ON u.id = adoption_stats.user_id
        ORDER BY u.created_at DESC
      `;

      const result = await executeQuery(query, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

      const mappedUsers = result.rows.map(row => {
        const mappedUser = this.mapToEntity(row);
        mappedUser.adoption_count = row.ADOPTION_COUNT || 0;
        return mappedUser;
      });
      
      return mappedUsers;
    } catch (error) {
      console.error("Error in UserDTO.getAllWithAdoptionCounts:", error);
      if (error.code && error.status) {
        throw error;
      }
      
      throw Object.assign(new Error(`Failed to fetch users with adoption counts: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }

  async findByEmail(connection, email) {
        const sql = `SELECT ID, USERNAME, EMAIL, FIRST_NAME, LAST_NAME, ROLE, IS_VERIFIED, PROFILE_PICTURE FROM users WHERE email = :email`;
        const binds = { email };
        const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
        const result = await connection.execute(sql, binds, options);
        if (result.rows.length > 0) {
            return this.mapToEntity(result.rows[0]);
        }
        return null;
    }async createGoogleUser(connection, userData) {
        try {
            const { username, email, first_name, last_name, profile_picture, auth_provider } = userData;

            // Generate a default password hash for Google users
            const defaultPasswordHash = await bcrypt.hash('google_auth_user', 10);

            const sql = `INSERT INTO users (username, email, is_verified, first_name, last_name, profile_picture, role, password_hash, auth_provider)
                         VALUES (:username, :email, 1, :first_name, :last_name, :profile_picture, :role, :password_hash, :auth_provider)`;
            
            const binds = { 
                username, 
                email, 
                first_name, 
                last_name, 
                profile_picture, 
                role: 'user',
                password_hash: defaultPasswordHash,
                auth_provider: auth_provider || 'google'
            };
            
            const options = { autoCommit: true };
            const result = await connection.execute(sql, binds, options);

            if (result.rowsAffected > 0) {
                // Fetch and return the newly created user
                const newUser = await this.findByEmail(connection, email);
                return newUser;
            } else {
                throw new Error('Failed to create user - no rows affected');
            }
        } catch (error) {
            console.error('Error in createGoogleUser:', error);
            throw error;
        }
    }

  async update(connection, id, userData) {
    try {
      if (!id) {
        throw Object.assign(new Error('User ID is required for update'), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }
      
      const checkQuery = `SELECT id FROM ${this.tableName} WHERE id = :id`;
      const checkResult = await connection.execute(checkQuery, { id }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      
      if (checkResult.rows.length === 0) {
        throw Object.assign(new Error(`User with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404
        });
      }
      
      const updates = [];
      const binds = { id };

      if (userData.first_name !== undefined) {
        updates.push("first_name = :first_name");
        binds.first_name = userData.first_name;
      }
      if (userData.last_name !== undefined) {
        updates.push("last_name = :last_name");
        binds.last_name = userData.last_name;
      }
      if (userData.username !== undefined) {
        updates.push("username = :username");
        binds.username = userData.username;
      }
      if (userData.email !== undefined) {
        updates.push("email = :email");
        binds.email = userData.email;
      }
      if (userData.phone_number !== undefined) {
        updates.push("phone = :phone_number");
        binds.phone_number = userData.phone_number;
      }
      if (userData.role !== undefined) {
        updates.push("role = :role");
        binds.role = userData.role;
      }
      if (userData.profile_picture !== undefined) {
        updates.push("profile_picture = :profile_picture");
        binds.profile_picture = userData.profile_picture;
      }

      if (updates.length === 0) {
        throw Object.assign(new Error("No fields to update"), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }

      const query = `UPDATE ${this.tableName} SET ${updates.join(", ")} WHERE id = :id`;

      const result = await connection.execute(query, binds, { autoCommit: true });
      
      if (result.rowsAffected === 0) {
        throw Object.assign(new Error("User not found or not updated"), {
          code: "NOT_FOUND",
          status: 404
        });
      }

      const getUpdatedQuery = `
        SELECT id, username, email, first_name, last_name, phone, role, profile_picture, created_at
        FROM ${this.tableName} 
        WHERE id = :id
      `;
      const updatedResult = await connection.execute(getUpdatedQuery, { id }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

      return this.mapToEntity(updatedResult.rows[0]);
    } catch (error) {
      console.error('Error in userDTO.update:', error);
      
      if (error.code && error.status) {
        throw error;
      }
      
      if (error.errorNum === 1407) {
        throw Object.assign(new Error("Cannot update required field to NULL"), {
          code: "NULL_CONSTRAINT",
          status: 400,
          originalError: error
        });
      } else if (error.errorNum === 12899) {
        throw Object.assign(new Error("Value too large for one or more fields"), {
          code: "VALUE_TOO_LARGE",
          status: 400,
          originalError: error
        });
      } else if (error.errorNum === 1) {
        throw Object.assign(new Error("Username or email already exists"), {
          code: "UNIQUE_CONSTRAINT",
          status: 409,
          originalError: error
        });
      } else if (error.errorNum === 2290) {
        throw Object.assign(new Error("Invalid data format"), {
          code: "CHECK_CONSTRAINT",
          status: 400,
          originalError: error
        });
      }
      
      throw Object.assign(new Error(`Failed to update user: ${error.message}`), {
        code: "UPDATE_ERROR",
        status: 500,
        originalError: error
      });
    }
  }

}
module.exports = new userDTO();
