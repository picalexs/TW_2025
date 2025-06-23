const abstractDTO = require("./abstractDTO");
const { executeQuery } = require("../db/dbConnection");

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
    const sql = `UPDATE users SET name = :name, email = :email WHERE id = :userId`;
    await executeQuery(sql, [data.name, data.email, userId]);
    return { success: true };
  }
}

module.exports = new ProfileDTO();
