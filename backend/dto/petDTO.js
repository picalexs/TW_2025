const abstractDTO = require("./abstractDTO");
const oracledb = require("oracledb");

class petDTO extends abstractDTO {
  constructor() {
    super('animals');
  }

  mapToEntity(dbRow) {
    return {
      id: dbRow.ID,
      name: dbRow.NAME,
      species: dbRow.SPECIES,
      healthStatus: dbRow.HEALTH_STATUS,
      description: dbRow.DESCRIPTION,
      relationWithOthers: dbRow.RELATION_WITH_OTHERS,
      createdAt: dbRow.CREATED_AT,
      imagePath: dbRow.FILE_PATH
    };
  }

  async getAll() {
    const result = await this.executeCustomQuery(
      `SELECT a.*, m.file_path 
       FROM animals a 
       LEFT JOIN media m ON a.id = m.animal_id 
       WHERE m.id IS NULL OR m.id = (
         SELECT MIN(id) FROM media WHERE animal_id = a.id
       )`,
      [], 
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.map(row => this.mapToEntity(row));
  }

  async getById(id) {
    const result = await this.executeCustomQuery(
      `SELECT a.*, m.file_path 
       FROM animals a 
       LEFT JOIN media m ON a.id = m.animal_id 
       WHERE a.id = :id AND (m.id IS NULL OR m.id = (
         SELECT MIN(id) FROM media WHERE animal_id = a.id
       ))`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return null;
    }

    const pet = this.mapToEntity(result.rows[0]);
    
    const tagsResult = await this.executeCustomQuery(
      `SELECT t.id, t.name
       FROM tags t
       JOIN animal_tags at ON t.id = at.tag_id
       WHERE at.animal_id = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    pet.tags = tagsResult.rows.map(tag => ({
      id: tag.ID,
      name: tag.NAME
    }));

    return pet;
  }

  async create(petData) {
    const { name, species, healthStatus, description, relationWithOthers } = petData;
    
    if (!name || !species) {
      throw new Error("Missing required pet fields");
    }

    const result = await this.executeCustomQuery(
      `INSERT INTO animals (name, species, health_status, description, relation_with_others) 
       VALUES (:name, :species, :healthStatus, :description, :relationWithOthers)
       RETURNING id INTO :id`,
      {
        name,
        species,
        healthStatus,
        description,
        relationWithOthers,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true }
    );

    const petId = result.outBinds.id[0];
    
    if (petData.tags && Array.isArray(petData.tags)) {
      for (const tagId of petData.tags) {
        await this.executeCustomQuery(
          `INSERT INTO animal_tags (animal_id, tag_id) VALUES (:animalId, :tagId)`,
          { animalId: petId, tagId },
          { autoCommit: true }
        );
      }
    }
    
    return petId;
  }
}
module.exports = new petDTO();