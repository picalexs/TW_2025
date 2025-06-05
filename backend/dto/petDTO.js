const abstractDTO = require("./abstractDTO");
const oracledb = require("oracledb");
const path = require("path");

class petDTO extends abstractDTO {
  constructor() {
    super("animals");
  }
  mapToEntity(dbRow) {
    let imagePath = dbRow.FILE_PATH;

    if (imagePath) {
      if (imagePath.startsWith("/")) {
        imagePath = imagePath.substring(1);
      }
      if (!imagePath.startsWith("http")) {
        imagePath = `/server/${imagePath}`;
      }
    } else {
      imagePath = "/server/images/profile/default-pet-profile.jpg";
    }

    return {
      id: dbRow.ID,
      name: dbRow.NAME,
      species: dbRow.SPECIES,
      breed: dbRow.BREED,
      age: dbRow.AGE,
      gender: dbRow.GENDER,
      sizeCategory: dbRow.SIZE_CATEGORY,
      weightKg: dbRow.WEIGHT_KG,
      color: dbRow.COLOR,
      healthStatus: dbRow.HEALTH_STATUS,
      description: dbRow.DESCRIPTION || "No description available",
      adoptionStatus: dbRow.ADOPTION_STATUS,
      adoptionFee: dbRow.ADOPTION_FEE,
      relationWithOthers: dbRow.RELATION_WITH_OTHERS,
      createdAt: dbRow.CREATED_AT,
      imagePath: imagePath,
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
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          DESCRIPTION: { type: oracledb.STRING },
        },
      }
    );

    return result.rows.map((row) => this.mapToEntity(row));
  }

  async getById(id) {
    const result = await this.executeCustomQuery(
      `SELECT a.*, m.file_path, 
              addr.street, addr.city, addr.country, addr.postal_code,
              u.first_name as shelter_first_name, u.last_name as shelter_last_name,
              u.email as shelter_email, u.phone as shelter_phone,
              u.profile_picture as shelter_profile_picture
       FROM animals a
       LEFT JOIN media m ON a.id = m.animal_id
       LEFT JOIN address addr ON a.address_id = addr.id
       LEFT JOIN users u ON a.shelter_id = u.id
       WHERE a.id = :id AND (m.id IS NULL OR m.id = (
         SELECT MIN(id) FROM media WHERE animal_id = a.id
       ))`,
      [id],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          DESCRIPTION: { type: oracledb.STRING },
        },
      }
    );

    if (result.rows.length === 0) {
      return null;
    }

    const pet = this.mapToEntity(result.rows[0]);

    if (result.rows[0].STREET || result.rows[0].CITY) {
      pet.address = {
        street: result.rows[0].STREET,
        city: result.rows[0].CITY,
        country: result.rows[0].COUNTRY,
        postalCode: result.rows[0].POSTAL_CODE,
      };
    }

    if (result.rows[0].SHELTER_FIRST_NAME) {
      pet.shelter = {
        firstName: result.rows[0].SHELTER_FIRST_NAME,
        lastName: result.rows[0].SHELTER_LAST_NAME,
        email: result.rows[0].SHELTER_EMAIL,
        phone: result.rows[0].SHELTER_PHONE,
        profilePicture: result.rows[0].SHELTER_PROFILE_PICTURE,
      };
    }

    const tagsResult = await this.executeCustomQuery(
      `SELECT t.id, t.name
       FROM tags t
       JOIN animal_tags at ON t.id = at.tag_id
       WHERE at.animal_id = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    pet.tags = tagsResult.rows.map((tag) => ({
      id: tag.ID,
      name: tag.NAME,
    }));

    const medicalResult = await this.executeCustomQuery(
      `SELECT id, description, record_date
       FROM medical_history
       WHERE animal_id = :id
       ORDER BY record_date DESC`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    pet.medicalHistory = medicalResult.rows.map((record) => ({
      id: record.ID,
      description: record.DESCRIPTION,
      recordDate: record.RECORD_DATE,
    }));

    const careResult = await this.executeCustomQuery(
      `SELECT id, activity, hour, frequency
       FROM care_schedule
       WHERE animal_id = :id
       ORDER BY hour`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    pet.careSchedule = careResult.rows.map((care) => ({
      id: care.ID,
      activity: care.ACTIVITY,
      hour: care.HOUR,
      frequency: care.FREQUENCY,
    }));

    const resourcesResult = await this.executeCustomQuery(
      `SELECT id, resource_type, title, content
       FROM care_resources
       WHERE animal_id = :id
       ORDER BY resource_type, title`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    pet.careResources = resourcesResult.rows.map((resource) => ({
      id: resource.ID,
      resourceType: resource.RESOURCE_TYPE,
      title: resource.TITLE,
      content: resource.CONTENT,
    }));

    const mediaResult = await this.executeCustomQuery(
      `SELECT id, type, file_path
       FROM media
       WHERE animal_id = :id
       ORDER BY id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    pet.media = mediaResult.rows.map((media) => ({
      id: media.ID,
      type: media.TYPE,
      filePath: media.FILE_PATH,
    }));

    const metricsResult = await this.executeCustomQuery(
      `SELECT favorites_count, views_count, adoption_requests_count, 
              avg_time_to_adoption, last_updated
       FROM animal_metrics
       WHERE animal_id = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (metricsResult.rows.length > 0) {
      pet.metrics = {
        favoritesCount: metricsResult.rows[0].FAVORITES_COUNT || 0,
        viewsCount: metricsResult.rows[0].VIEWS_COUNT || 0,
        adoptionRequestsCount:
          metricsResult.rows[0].ADOPTION_REQUESTS_COUNT || 0,
        avgTimeToAdoption: metricsResult.rows[0].AVG_TIME_TO_ADOPTION,
        lastUpdated: metricsResult.rows[0].LAST_UPDATED,
      };
    }

    const adoptionResult = await this.executeCustomQuery(
      `SELECT status, request_date, adoption_date
       FROM adoptions
       WHERE animal_id = :id
       ORDER BY request_date DESC`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    pet.adoptionRequests = adoptionResult.rows.map((adoption) => ({
      status: adoption.STATUS,
      requestDate: adoption.REQUEST_DATE,
      adoptionDate: adoption.ADOPTION_DATE,
    }));

    return pet;
  }

  async create(petData) {
    const {
      name,
      species,
      healthStatus,
      description,
      relationWithOthers,
      tags,
    } = petData;

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

    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
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
