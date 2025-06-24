const abstractDTO = require("./abstractDTO");
const { executeQuery } = require("../db/dbConnection");
const validator = require("validator");

class ProfileDTO extends abstractDTO {
  constructor() {
    super("users"); 
  }

  async getById(userId) {
    const sql = `SELECT * FROM users WHERE id = :userId`;
    const result = await executeQuery(sql, [userId]);
    return result.rows[0];
  }

  async update(userId, data) {
    const safeName = data.name != null ? validator.escape(data.name) : null;
    const safeEmail = data.email != null ? validator.normalizeEmail(data.email) : null;
    const sql = `UPDATE users SET name = :name, email = :email WHERE id = :userId`;
    await executeQuery(sql, [safeName, safeEmail, userId]);
    return { success: true };
  }
}

module.exports = new ProfileDTO();
