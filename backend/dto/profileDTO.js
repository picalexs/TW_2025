const abstractDTO = require("./abstractDTO");
const db = require("../db/dbConnection");

class ProfileDTO extends abstractDTO {
  constructor() {
    super("users"); // Assuming profile data is in the users table
  }

  async getById(userId) {
    const sql = `SELECT * FROM users WHERE id = :userId`;
    const result = await db.execute(sql, [userId]);
    return result.rows[0];
  }

  async update(userId, data) {
    // Example: update name and email
    const sql = `UPDATE users SET name = :name, email = :email WHERE id = :userId`;
    await db.execute(sql, [data.name, data.email, userId]);
    return { success: true };
  }
}

module.exports = new ProfileDTO();
