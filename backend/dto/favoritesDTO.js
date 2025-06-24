const abstractDTO = require("./abstractDTO");
const oracledb = require("oracledb");
const validator = require("validator");

class FavoritesDTO extends abstractDTO {
  constructor() {
    super("favorites");
  }

  mapToEntity(dbRow) {
    return {
      id: dbRow.ID,
      userId: dbRow.USER_ID,
      animalId: dbRow.ANIMAL_ID,
      favoritedAt: dbRow.FAVORITED_AT
    };
  }

  async getAllByUser(userId) {
    try {
      const sql = `
        SELECT 
          a.id,
          a.name,
          a.species,
          a.breed,
          a.age,
          a.gender,
          a.description,
          a.adoption_status,
          a.adoption_fee,
          addr.city,
          addr.country,
          (SELECT m.file_path FROM media m WHERE m.animal_id = a.id AND ROWNUM = 1) as image_path
        FROM favorites f 
        JOIN animals a ON f.animal_id = a.id 
        LEFT JOIN address addr ON a.address_id = addr.id
        WHERE f.user_id = :userId
        ORDER BY f.favorited_at DESC
      `;
      
      const result = await this.executeCustomQuery(sql, [userId], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          DESCRIPTION: { type: oracledb.STRING }
        }
      });

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      const transformedRows = result.rows.map(row => ({
        id: row.ID,
        name: row.NAME,
        species: row.SPECIES,
        breed: row.BREED,
        age: row.AGE,
        gender: row.GENDER,
        description: row.DESCRIPTION,
        adoptionStatus: row.ADOPTION_STATUS,
        adoptionFee: row.ADOPTION_FEE,
        city: row.CITY,
        country: row.COUNTRY,
        imagePath: row.IMAGE_PATH || '/assets/default-pet-profile.webp'
      }));
      
      return transformedRows;
    } catch (error) {
      console.error("Error in FavoritesDTO.getAllByUser:", error);
      throw Object.assign(new Error(`Failed to get favorites for user: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }

  async add(userId, animalId) {
    try {
      const safeUserId = (typeof userId === 'string' && userId != null) ? validator.escape(userId) : userId;
      const safeAnimalId = (typeof animalId === 'string' && animalId != null) ? validator.escape(animalId) : animalId;
      const sql = `INSERT INTO favorites (user_id, animal_id) VALUES (:userId, :animalId)`;
      await this.executeCustomQuery(sql, [safeUserId, safeAnimalId], { autoCommit: true });
      return { success: true };
    } catch (error) {
      if (error.errorNum === 1) {
        throw Object.assign(new Error("Favorite already exists"), {
          code: "DUPLICATE_FAVORITE",
          status: 409,
          originalError: error
        });
      }
      throw Object.assign(new Error(`Failed to add favorite: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }

  async remove(userId, animalId) {
    try {
      const sql = `DELETE FROM favorites WHERE user_id = :userId AND animal_id = :animalId`;
      const result = await this.executeCustomQuery(sql, [userId, animalId], { autoCommit: true });
      
      if (result.rowsAffected === 0) {
        throw Object.assign(new Error("Favorite not found"), {
          code: "NOT_FOUND",
          status: 404
        });
      }
      
      return { success: true };
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }
      throw Object.assign(new Error(`Failed to remove favorite: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }
}

module.exports = new FavoritesDTO();
