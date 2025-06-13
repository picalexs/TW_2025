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
    try {
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
    } catch (error) {
      if (error.errorNum) {
        if (error.errorNum === 942) {
          throw Object.assign(new Error("Table or view does not exist"), {
            code: "SCHEMA_ERROR",
            status: 500,
          });
        } else if (error.errorNum === 904) {
          throw Object.assign(new Error("Invalid column name"), {
            code: "COLUMN_ERROR",
            status: 500,
          });
        }
      }
      throw Object.assign(new Error(`Failed to fetch pets: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }
  async getById(id) {
    try {
      if (!id) {
        throw Object.assign(new Error("Pet ID is required"), {
          code: "VALIDATION_ERROR",
          status: 400,
        });
      }

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
        throw Object.assign(new Error(`Pet with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404,
        });
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

      try {
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
      } catch (tagError) {
        pet.tags = [];
        console.error("Error fetching pet tags:", tagError);
      }

      try {
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
      } catch (medicalError) {
        pet.medicalHistory = [];
        console.error("Error fetching pet medical history:", medicalError);
      }

      try {
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
      } catch (careError) {
        pet.careSchedule = [];
        console.error("Error fetching pet care schedule:", careError);
      }

      try {
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
      } catch (resourcesError) {
        pet.careResources = [];
        console.error("Error fetching pet care resources:", resourcesError);
      }

      try {
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
      } catch (mediaError) {
        pet.media = [];
        console.error("Error fetching pet media:", mediaError);
      }

      try {
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
      } catch (metricsError) {
        pet.metrics = {
          favoritesCount: 0,
          viewsCount: 0,
          adoptionRequestsCount: 0,
        };
        console.error("Error fetching pet metrics:", metricsError);
      }

      try {
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
      } catch (adoptionError) {
        pet.adoptionRequests = [];
        console.error("Error fetching pet adoption requests:", adoptionError);
      }

      return pet;
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        throw error;
      }

      if (error.errorNum) {
        if (error.errorNum === 942) {
          throw Object.assign(new Error("Table or view does not exist"), {
            code: "SCHEMA_ERROR",
            status: 500,
          });
        } else if (error.errorNum === 904) {
          throw Object.assign(new Error("Invalid column name"), {
            code: "COLUMN_ERROR",
            status: 500,
          });
        } else if (error.errorNum === 1017) {
          throw Object.assign(new Error("Invalid database credentials"), {
            code: "AUTH_ERROR",
            status: 500,
          });
        } else if (error.errorNum === 12541) {
          throw Object.assign(new Error("Database connection failed"), {
            code: "CONNECTION_ERROR",
            status: 503,
          });
        }
      }

      throw Object.assign(
        new Error(`Failed to fetch pet details: ${error.message}`),
        {
          code: "DB_ERROR",
          status: 500,
          originalError: error,
        }
      );
    }
  }

  async getByShelter(shelterId) {
    try {
      if (!shelterId) {
        throw Object.assign(new Error("Shelter ID is required"), {
          code: "VALIDATION_ERROR",
          status: 400,
        });
      }

      const result = await this.executeCustomQuery(
        `SELECT a.*, m.file_path
         FROM animals a
         LEFT JOIN media m ON a.id = m.animal_id
         WHERE a.shelter_id = :shelterId
         AND (m.id IS NULL OR m.id = (
           SELECT MIN(id) FROM media WHERE animal_id = a.id
         ))
         ORDER BY a.created_at DESC`,
        [shelterId],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            DESCRIPTION: { type: oracledb.STRING },
          },
        }
      );

      return result.rows.map((row) => this.mapToEntity(row));
    } catch (error) {
      throw Object.assign(
        new Error(`Failed to fetch pets for shelter: ${error.message}`),
        {
          code: "DB_ERROR",
          status: 500,
          originalError: error,
        }
      );
    }
  }

  async create(petData) {
    try {
      const {
        name,
        species,
        breed,
        age,
        gender,
        sizeCategory,
        weightKg,
        color,
        healthStatus,
        description,
        adoptionStatus,
        adoptionFee,
        relationWithOthers,
        addressId,
        shelterId,
        tags,
      } = petData;

      if (!name || !species) {
        throw Object.assign(
          new Error(
            "Missing required pet fields: name and species are mandatory"
          ),
          { code: "VALIDATION_ERROR", status: 400 }
        );
      }

      const result = await this.executeCustomQuery(
        `INSERT INTO animals (
          name, 
          species, 
          breed, 
          age, 
          gender, 
          size_category, 
          weight_kg, 
          color, 
          health_status, 
          description, 
          adoption_status, 
          adoption_fee, 
          relation_with_others,
          address_id,
          shelter_id
        )
        VALUES (
          :name, 
          :species, 
          :breed, 
          :age, 
          :gender, 
          :sizeCategory, 
          :weightKg, 
          :color, 
          :healthStatus, 
          :description, 
          :adoptionStatus, 
          :adoptionFee, 
          :relationWithOthers,
          :addressId,
          :shelterId
        )
        RETURNING id INTO :id`,
        {
          name,
          species,
          breed,
          age,
          gender,
          sizeCategory,
          weightKg,
          color,
          healthStatus,
          description,
          adoptionStatus,
          adoptionFee,
          relationWithOthers,
          addressId,
          shelterId,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );

      const petId = result.outBinds.id[0];

      if (tags && Array.isArray(tags)) {
        for (const tagId of tags) {
          try {
            await this.executeCustomQuery(
              `INSERT INTO animal_tags (animal_id, tag_id) VALUES (:animalId, :tagId)`,
              { animalId: petId, tagId },
              { autoCommit: true }
            );
          } catch (tagError) {
            console.error(
              `Error assigning tag ${tagId} to pet ${petId}:`,
              tagError
            );
            if (tagError.errorNum === 2291) {
              throw Object.assign(new Error(`Invalid tag ID: ${tagId}`), {
                code: "INVALID_TAG",
                status: 400,
                originalError: tagError,
              });
            }
          }
        }
      }

      return petId;
    } catch (error) {
      if (error.code) {
        throw error;
      }

      if (error.errorNum) {
        if (error.errorNum === 1) {
          throw Object.assign(
            new Error("A pet with this unique identifier already exists"),
            { code: "DUPLICATE_PET", status: 409 }
          );
        } else if (error.errorNum === 1400) {
          throw Object.assign(new Error("Required field cannot be null"), {
            code: "NULL_CONSTRAINT",
            status: 400,
          });
        } else if (error.errorNum === 2290) {
          throw Object.assign(
            new Error("Invalid data for pet: check constraints violated"),
            { code: "CHECK_CONSTRAINT", status: 400 }
          );
        } else if (error.errorNum === 2291) {
          throw Object.assign(
            new Error(
              "Referenced record does not exist (foreign key violation)"
            ),
            { code: "FOREIGN_KEY_VIOLATION", status: 400 }
          );
        } else if (error.errorNum === 12899) {
          throw Object.assign(
            new Error("Value too large for one or more fields"),
            { code: "VALUE_TOO_LARGE", status: 400 }
          );
        }
      }

      throw Object.assign(new Error(`Failed to create pet: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }
}
module.exports = new petDTO();
