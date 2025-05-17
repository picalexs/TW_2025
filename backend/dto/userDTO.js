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
      // Not including password
    };
  }

  async create(userData) {
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error("Missing required user fields");
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const result = await this.executeCustomQuery(
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
  }

  async authenticateUser(email, password) {
    const result = await this.executeCustomQuery(
      `SELECT * FROM users WHERE email = :email`,
      [email],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.PASSWORD_HASH);

    if (!passwordMatch) {
      return null;
    }

    return this.mapToEntity(user);
  }
}

module.exports = new userDTO();