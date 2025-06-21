const abstractDTO = require("./abstractDTO");
const db = require("../db/dbConnection");

class FavoritesDTO extends abstractDTO {
  constructor() {
    super("favorites");
  }

  async getAllByUser(userId) {
    const sql = `SELECT a.* FROM favorites f JOIN animals a ON f.animal_id = a.id WHERE f.user_id = :userId`;
    const result = await db.execute(sql, [userId]);
    return result.rows;
  }

  async add(userId, animalId) {
    const sql = `INSERT INTO favorites (user_id, animal_id) VALUES (:userId, :animalId)`;
    await db.execute(sql, [userId, animalId]);
    return { success: true };
  }

  async remove(userId, animalId) {
    const sql = `DELETE FROM favorites WHERE user_id = :userId AND animal_id = :animalId`;
    await db.execute(sql, [userId, animalId]);
    return { success: true };
  }
}

module.exports = new FavoritesDTO();
