const abstractDTO = require("./abstractDTO");
const oracledb = require("oracledb");
const path = require("path");
const { getConnection, executeQuery } = require("../db/dbConnection");

class petDTO extends abstractDTO {
  constructor() {
    super("animals");
  }
  
  mapToEntity(dbRow) {
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
      imagePath: null,
    };
  }
  
  async getAll() {
    try {
      const result = await this.executeCustomQuery(
        `SELECT a.*
         FROM animals a
         ORDER BY a.created_at DESC`,
        [],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            DESCRIPTION: { type: oracledb.STRING },
          },
        }
      );

      const pets = result.rows.map((row) => this.mapToEntity(row));
      
      for (const pet of pets) {
        try {
          const mediaResult = await this.executeCustomQuery(
            `SELECT file_path FROM media WHERE animal_id = :id ORDER BY id FETCH FIRST 1 ROWS ONLY`,
            [pet.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          
          if (mediaResult.rows.length > 0) {
            pet.imagePath = mediaResult.rows[0].FILE_PATH;
          }
        } catch (mediaError) {
          console.error(`Error fetching profile image for pet ${pet.id}:`, mediaError);
        }
        try {
          const tagsResult = await this.executeCustomQuery(
            `SELECT t.id, t.name
             FROM tags t
             JOIN animal_tags at ON t.id = at.tag_id
             WHERE at.animal_id = :id`,
            [pet.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          pet.tags = tagsResult.rows.map((tag) => ({
            id: tag.ID,
            name: tag.NAME,
          }));
        } catch (tagError) {
          pet.tags = [];
          console.error(`Error fetching tags for pet ${pet.id}:`, tagError);
        }
      }

      return pets;
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
        `SELECT a.*, 
                addr.street, addr.city, addr.country, addr.postal_code,
                u.id as shelter_user_id, u.first_name as shelter_first_name, u.last_name as shelter_last_name,
                u.email as shelter_email, u.phone as shelter_phone,
                u.profile_picture as shelter_profile_picture
         FROM animals a
         LEFT JOIN address addr ON a.address_id = addr.id
         LEFT JOIN users u ON a.shelter_id = u.id
         WHERE a.id = :id`,
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
          id: result.rows[0].SHELTER_USER_ID,
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
          { 
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchInfo: {
              DESCRIPTION: { type: oracledb.STRING }
            }
          }
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
          { 
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchInfo: {
              CONTENT: { type: oracledb.STRING }
            }
          }
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
        
        // Set the profile image from the first media item for backward compatibility
        // The frontend will use pet.media[0] as the profile image
        if (pet.media.length > 0) {
          pet.imagePath = pet.media[0].filePath;
        }
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
        `SELECT a.*
         FROM animals a
         WHERE a.shelter_id = :shelterId
         ORDER BY a.created_at DESC`,
        [shelterId],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            DESCRIPTION: { type: oracledb.STRING },
          },
        }
      );

      const pets = result.rows.map((row) => this.mapToEntity(row));
      
      for (const pet of pets) {
        try {
          const mediaResult = await this.executeCustomQuery(
            `SELECT file_path FROM media WHERE animal_id = :id ORDER BY id FETCH FIRST 1 ROWS ONLY`,
            [pet.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          
          if (mediaResult.rows.length > 0) {
            pet.imagePath = mediaResult.rows[0].FILE_PATH;
          }
        } catch (mediaError) {
          console.error(`Error fetching profile image for pet ${pet.id}:`, mediaError);
        }
      }

      return pets;
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
        shelterId,
        tags,
        city,
        country,
        address,
        postalCode
      } = petData;

      if (!name || !species) {
        throw Object.assign(
          new Error(
            "Missing required pet fields: name and species are mandatory"
          ),
          { code: "VALIDATION_ERROR", status: 400 }
        );
      }

      let addressId = null;
      if (city && country) {
        addressId = await this.createAddress({
          street: address,
          city,
          country,
          postalCode
        });
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

      // Tags are now handled separately by the controller
      // No longer processing tags in the DTO create method

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

  async saveMediaPaths(petId, mediaPaths) {
    try {
      for (const media of mediaPaths) {
        await this.executeCustomQuery(
          `INSERT INTO media (animal_id, type, file_path) VALUES (:petId, :type, :path)`,
          [petId, media.type, media.path],
          { autoCommit: true }
        );
      }
      return true;
    } catch (error) {
      console.error("Error saving media paths:", error);
      throw Object.assign(new Error(`Failed to save media paths: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }

  async saveTags(petId, tags) {
    try {
      for (const tagId of tags) {
        await this.executeCustomQuery(
          `INSERT INTO animal_tags (animal_id, tag_id) VALUES (:petId, :tagId)`,
          [petId, tagId],
          { autoCommit: true }
        );
      }
      return true;
    } catch (error) {
      console.error("Error saving tags:", error);
      throw Object.assign(new Error(`Failed to save tags: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }

  async saveMedicalHistory(petId, medicalHistory) {
    try {
      for (const entry of medicalHistory) {
        await this.executeCustomQuery(
          `INSERT INTO medical_history (animal_id, description, record_date) VALUES (:petId, :description, :recordDate)`,
          [petId, entry.description, entry.date || new Date()],
          { autoCommit: true }
        );
      }
      return true;
    } catch (error) {
      console.error("Error saving medical history:", error);
      throw Object.assign(new Error(`Failed to save medical history: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }
  async saveCareResources(petId, careResources) {
    try {
      for (const resource of careResources) {
        await this.executeCustomQuery(
          `INSERT INTO care_resources (animal_id, resource_type, title, content) VALUES (:petId, :resourceType, :title, :content)`,
          [petId, resource.type, resource.title, resource.content],
          { autoCommit: true }
        );
      }
      return true;
    } catch (error) {
      console.error("Error saving care resources:", error);
      throw Object.assign(new Error(`Failed to save care resources: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }
  async saveCareSchedule(petId, careSchedule) {
    try {
      for (const schedule of careSchedule) {
        await this.executeCustomQuery(
          `INSERT INTO care_schedule (animal_id, activity, hour, frequency) VALUES (:petId, :activity, :hour, :frequency)`,
          [petId, schedule.activity, schedule.hour, schedule.frequency],
          { autoCommit: true }
        );
      }
      return true;
    } catch (error) {
      console.error("Error saving care schedule:", error);
      throw Object.assign(new Error(`Failed to save care schedule: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }

  async getTagById(tagId) {
    try {
      const result = await this.executeCustomQuery(
        `SELECT id, name FROM tags WHERE id = :tagId`,
        [tagId],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("Error fetching tag by ID:", error);
      return null;
    }
  }

  async createTag(tagName) {
    try {
      const existingResult = await this.executeCustomQuery(
        `SELECT id FROM tags WHERE LOWER(name) = LOWER(:tagName)`,
        [tagName],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (existingResult.rows.length > 0) {
        return existingResult.rows[0].ID;
      }

      const result = await this.executeCustomQuery(
        `INSERT INTO tags (name) VALUES (:tagName) RETURNING id INTO :id`,
        {
          tagName: tagName,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: true }
      );

      return result.outBinds.id[0];
    } catch (error) {
      console.error("Error creating tag:", error);
      throw Object.assign(new Error(`Failed to create tag: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }

  async createAddress(addressData) {
    try {
      const { street, city, country, postalCode } = addressData;
      
      if (!city || !country) {
        throw Object.assign(
          new Error("City and country are required for address"),
          { code: "VALIDATION_ERROR", status: 400 }
        );
      }

      const result = await this.executeCustomQuery(
        `INSERT INTO address (street, city, country, postal_code) 
         VALUES (:street, :city, :country, :postalCode) 
         RETURNING id INTO :id`,
        {
          street: street || null,
          city,
          country,
          postalCode: postalCode || null,
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: true }
      );

      return result.outBinds.id[0];
    } catch (error) {
      console.error("Error creating address:", error);
      throw Object.assign(new Error(`Failed to create address: ${error.message}`), {
        code: "DB_ERROR",
        status: 500,
        originalError: error,
      });
    }
  }

  async clearPetTags(petId) {
    try {
      await executeQuery(
        `DELETE FROM animal_tags WHERE animal_id = :petId`,
        [petId],
        { autoCommit: true }
      );
    } catch (error) {
      console.error('Error clearing pet tags:', error);
      throw error;
    }
  }

  async clearMedicalHistory(petId) {
    try {
      await executeQuery(
        `DELETE FROM medical_history WHERE animal_id = :petId`,
        [petId],
        { autoCommit: true }
      );
    } catch (error) {
      console.error('Error clearing medical history:', error);
      throw error;
    }
  }

  async clearCareResources(petId) {
    try {
      await executeQuery(
        `DELETE FROM care_resources WHERE animal_id = :petId`,
        [petId],
        { autoCommit: true }
      );
    } catch (error) {
      console.error('Error clearing care resources:', error);
      throw error;
    }
  }

  async clearCareSchedule(petId) {
    try {
      await executeQuery(
        `DELETE FROM care_schedule WHERE animal_id = :petId`,
        [petId],
        { autoCommit: true }
      );
    } catch (error) {
      console.error('Error clearing care schedule:', error);
      throw error;
    }
  }

  async clearCareScheduleForPet(petId) {
    try {
      await executeQuery(
        `DELETE FROM care_schedule WHERE animal_id = :petId`,
        [petId],
        { autoCommit: true }
      );
    } catch (error) {
      console.error('Error clearing care schedule:', error);
      throw error;    }
  }

  async update(id, entityData) {
    try {
      if (!id) {
        throw Object.assign(new Error(`Pet ID is required for update`), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }
      
      // Check if pet exists
      const checkExists = await this.getById(id);
      if (!checkExists) {
        throw Object.assign(new Error(`Pet with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404
        });
      }
      
      const updates = [];
      const binds = { id };
      let addressId = null;

      // Handle address fields separately
      const addressFields = ['address', 'city', 'country', 'postalCode'];
      const hasAddressFields = addressFields.some(field => entityData[field] !== undefined);
      
      if (hasAddressFields) {
        // Create or update address
        const addressData = {
          street: entityData.address,
          city: entityData.city,
          country: entityData.country,
          postalCode: entityData.postalCode
        };
        
        if (addressData.city && addressData.country) {
          addressId = await this.createAddress(addressData);
          updates.push(`address_id = :addressId`);
          binds.addressId = addressId;
        }
      }

      // Handle other pet fields, mapping to correct column names
      const fieldMapping = {
        name: 'name',
        species: 'species',
        breed: 'breed',
        age: 'age',
        gender: 'gender',
        sizeCategory: 'size_category',
        weightKg: 'weight_kg',
        color: 'color',
        healthStatus: 'health_status',
        description: 'description',
        adoptionStatus: 'adoption_status',
        adoptionFee: 'adoption_fee',
        relationWithOthers: 'relation_with_others',
        shelterId: 'shelter_id'
      };

      Object.entries(entityData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && !addressFields.includes(key)) {
          const columnName = fieldMapping[key] || key;
          updates.push(`${columnName} = :${key}`);
          binds[key] = value;
        }
      });

      if (updates.length === 0) {
        throw Object.assign(new Error("No fields to update"), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }

      const query = `UPDATE animals SET ${updates.join(", ")} WHERE id = :id`;

      await this.executeCustomQuery(query, binds, { autoCommit: true });
      return this.getById(id);
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }
      
      if (error.errorNum === 1407) {
        throw Object.assign(new Error("Cannot update column to NULL"), {
          code: "NULL_CONSTRAINT",
          status: 400,
          originalError: error
        });
      } else if (error.errorNum === 12899) {
        throw Object.assign(new Error("Value too large for one or more fields"), {
          code: "VALUE_TOO_LARGE",
          status: 400,
          originalError: error
        });
      } else if (error.errorNum === 1) {
        throw Object.assign(new Error("Unique constraint violated"), {
          code: "UNIQUE_CONSTRAINT",
          status: 409,
          originalError: error
        });
      } else if (error.errorNum === 2290) {
        throw Object.assign(new Error("Check constraint violated"), {
          code: "CHECK_CONSTRAINT",
          status: 400,
          originalError: error
        });
      } else if (error.errorNum === 2291) {
        throw Object.assign(new Error("Foreign key constraint violated"), {
          code: "FOREIGN_KEY_CONSTRAINT",
          status: 400,
          originalError: error
        });
      } else if (error.errorNum === 904) {
        throw Object.assign(new Error("Invalid column name in update query"), {
          code: "INVALID_IDENTIFIER",
          status: 500,
          originalError: error
        });
      }
      
      throw Object.assign(new Error(`Failed to update pet: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }

async getPetsByTagOverlap(userId, limit = 20) {
    try {
        const query = `
            WITH animal_scores AS (
                -- Pasul 1: Calculăm scorul pentru fiecare animal ID, fără a atinge coloanele CLOB
                SELECT
                    at.animal_id,
                    COUNT(upt.tag_id) AS matching_score
                FROM animal_tags at
                INNER JOIN user_preference_tags upt ON at.tag_id = upt.tag_id
                WHERE upt.user_id = :userId
                GROUP BY at.animal_id
            )
            -- Pasul 2: Selectăm toate detaliile animalelor, le unim cu scorurile și le sortăm
            SELECT 
                a.*, 
                NVL(s.matching_score, 0) AS matching_score -- Folosim NVL pentru a afișa 0 în loc de NULL dacă nu există scor
            FROM animals a
            LEFT JOIN animal_scores s ON a.id = s.animal_id
            WHERE a.adoption_status = 'available'
            ORDER BY matching_score DESC, a.created_at DESC
            FETCH FIRST :limit ROWS ONLY
        `;

        const result = await this.executeCustomQuery(
            query, 
            { userId: Number(userId), limit: Number(limit) }, 
            { 
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: {
                    DESCRIPTION: { type: oracledb.STRING } // Important pentru a citi corect CLOB-ul
                }
            }
        );
        
        // Procesarea rezultatelor pentru a adăuga imagini, tag-uri, etc. rămâne la fel
        const pets = [];
        for (const row of result.rows) {
            const pet = this.mapToEntity(row);
            pet.matchingScore = row.MATCHING_SCORE;

            // Adaugă imaginea principală
            try {
                const mediaResult = await this.executeCustomQuery(
                    `SELECT file_path FROM media WHERE animal_id = :id ORDER BY id FETCH FIRST 1 ROWS ONLY`,
                    [pet.id],
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );
                if (mediaResult.rows.length > 0) {
                    pet.imagePath = mediaResult.rows[0].FILE_PATH;
                }
            } catch (e) {
                pet.imagePath = null;
            }

            // Adaugă tag-urile
            try {
                const tagsResult = await this.executeCustomQuery(
                    `SELECT t.id, t.name FROM tags t JOIN animal_tags at ON t.id = at.tag_id WHERE at.animal_id = :id`,
                    [pet.id],
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );
                pet.tags = tagsResult.rows.map(tag => ({ id: tag.ID, name: tag.NAME }));
            } catch (e) {
                pet.tags = [];
            }
            
            pets.push(pet);
        }
        
        return pets;

    } catch (error) {
        console.error("Error in getPetsByTagOverlap DTO:", error);
        throw Object.assign(new Error(`Failed to fetch pets by tag overlap: ${error.message}`), {
            code: "DB_ERROR",
            status: 500,
            originalError: error,
        });
    }
}
}
module.exports = new petDTO();
