const db = require("../dbConnection");
const oracledb = require("oracledb");

// Data Transfer Object for User entity
const userDTO = {
  mapToUser(dbRow) {
    return {
      id: dbRow.ID,
      username: dbRow.USERNAME,
      email: dbRow.EMAIL,
      createdAt: dbRow.CREATED_AT,
      //not including password
    };
  },

  async getAllUsers() {
    const result = await db.executeQuery("SELECT * FROM users", [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return result.rows.map(this.mapToUser);
  },

  async getUserById(id) {
    const result = await db.executeQuery(
      "SELECT * FROM users WHERE id = :id",
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToUser(result.rows[0]);
  },

  async createUser(userData) {
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error("Missing required user fields");
    }

    //!!!!!!!!!!!!!!!!!!!!!!
    const passwordHash = userData.password;
    //!!!!! NEEDS to be replace with proper hashing -or other method!!!!!

    const result = await db.executeQuery(
      `INSERT INTO users (username, email, password_hash) 
       VALUES (:username, :email, :password_hash)
       RETURNING id INTO :id`,
      {
        username: userData.username,
        email: userData.email,
        password_hash: passwordHash,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    return result.outBinds.id[0];
  },

  async updateUser(id, userData) {
    const updates = [];
    const binds = { id };

    if (userData.username) {
      updates.push("username = :username");
      binds.username = userData.username;
    }

    if (userData.email) {
      updates.push("email = :email");
      binds.email = userData.email;
    }

    //other fields too!!!

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = :id`;

    await db.executeQuery(query, binds, { autoCommit: true });

    return this.getUserById(id);
  },

  async deleteUser(id) {
    await db.executeQuery("DELETE FROM users WHERE id = :id", [id], {
      autoCommit: true,
    });

    return true;
  },
};

module.exports = userDTO;
