const abstractDTO = require("./abstractDTO");
const { executeQuery } = require('../db/dbConnection');
const oracledb = require('oracledb');

class TestimonialDTO extends abstractDTO {
  constructor() {
    super("testimonials");
  }
  
  mapToEntity(dbRow) {
    return {
      id: dbRow.ID,
      userId: dbRow.USER_ID,
      text: dbRow.TESTIMONIAL_TEXT,
      rating: dbRow.RATING,
      location: dbRow.LOCATION,
      createdAt: dbRow.CREATED_AT,
      updatedAt: dbRow.UPDATED_AT,
      userName: dbRow.USER_NAME,
      userRole: dbRow.USER_ROLE,
      userFirstName: dbRow.FIRST_NAME,
      userLastName: dbRow.LAST_NAME
    };
  }
  
  async getAll(connection) {
    try {
      const query = `
        SELECT t.id, t.user_id, t.testimonial_text, t.rating, t.location, t.created_at, t.updated_at,
               u.first_name, u.last_name, u.role as user_role,
               CASE 
                 WHEN u.role = 'shelter' THEN u.first_name
                 ELSE u.first_name || ' ' || u.last_name
               END as user_name
        FROM ${this.tableName} t
        JOIN users u ON t.user_id = u.id
        WHERE t.rating > 3.5
        ORDER BY t.created_at DESC
      `;
      
      const result = await executeQuery(query, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          TESTIMONIAL_TEXT: { type: oracledb.STRING }
        }
      });
      
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      console.error("Error in testimonialDTO.getAll:", error);  
      throw error;
    }
  }
    
  async getRandom(connection, limit = 3) {
    try {
      const query = `
        SELECT * FROM (
          SELECT t.id, t.user_id, t.testimonial_text, t.rating, t.location, t.created_at, t.updated_at,
                 u.first_name, u.last_name, u.role as user_role,
                 CASE 
                   WHEN u.role = 'shelter' THEN u.first_name
                   ELSE u.first_name || ' ' || u.last_name
                 END as user_name
          FROM ${this.tableName} t
          JOIN users u ON t.user_id = u.id
          WHERE t.rating > 3.5
          ORDER BY DBMS_RANDOM.VALUE
        ) WHERE ROWNUM <= :limit
      `;
      
      const result = await executeQuery(query, { limit }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          TESTIMONIAL_TEXT: { type: oracledb.STRING }
        }
      });
      
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      console.error("Error in testimonialDTO.getRandom:", error);
      throw error;
    }
  }

  async getByUser(connection, userId) {
    try {
      const query = `
        SELECT t.id, t.user_id, t.testimonial_text, t.rating, t.location, t.created_at, t.updated_at,
               u.first_name, u.last_name, u.role as user_role,
               CASE 
                 WHEN u.role = 'shelter' THEN u.first_name
                 ELSE u.first_name || ' ' || u.last_name
               END as user_name
        FROM ${this.tableName} t
        JOIN users u ON t.user_id = u.id
        WHERE t.user_id = :userId
        ORDER BY t.created_at DESC
      `;
      
      const result = await executeQuery(query, { userId }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          TESTIMONIAL_TEXT: { type: oracledb.STRING }
        }
      });
      
      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      console.error("Error in testimonialDTO.getByUser:", error);
      throw error;
    }
  }

  async create(connection, testimonialData) {
    try {
      const { user_id, testimonial_text, rating = 5, location } = testimonialData;

      if (!user_id || !testimonial_text) {
        const error = new Error("Missing required fields: user_id or testimonial_text");
        error.code = "VALIDATION_ERROR";
        error.status = 400;
        error.userMessage = "All required fields must be provided";
        throw error;
      }

      const query = `
        INSERT INTO ${this.tableName} (user_id, testimonial_text, rating, location, created_at, updated_at)
        VALUES (:user_id, :testimonial_text, :rating, :location, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id INTO :id
      `;

      const binds = {
        user_id,
        testimonial_text,
        rating,
        location,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };

      const result = await executeQuery(query, binds);
      
      if (result.outBinds && result.outBinds.id && result.outBinds.id[0]) {
        return { id: result.outBinds.id[0], ...testimonialData };
      } else {
        throw new Error("Failed to create testimonial - no ID returned");
      }
    } catch (error) {
      console.error("Error in testimonialDTO.create:", error);
      throw error;
    }
  }

  async update(connection, id, testimonialData) {
    try {
      const updates = [];
      const binds = { id };

      if (testimonialData.user_id !== undefined) {
        updates.push("user_id = :user_id");
        binds.user_id = testimonialData.user_id;
      }
      if (testimonialData.testimonial_text !== undefined) {
        updates.push("testimonial_text = :testimonial_text");
        binds.testimonial_text = testimonialData.testimonial_text;
      }
      if (testimonialData.rating !== undefined) {
        updates.push("rating = :rating");
        binds.rating = testimonialData.rating;
      }
      if (testimonialData.location !== undefined) {
        updates.push("location = :location");
        binds.location = testimonialData.location;
      }

      if (updates.length === 0) {
        throw new Error("No fields to update");
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");

      const query = `
        UPDATE ${this.tableName}
        SET ${updates.join(", ")}
        WHERE id = :id
      `;

      const result = await executeQuery(query, binds);
      
      if (result.rowsAffected === 0) {
        throw new Error("Testimonial not found or not updated");
      }

      return { success: true, rowsAffected: result.rowsAffected };
    } catch (error) {
      console.error("Error in testimonialDTO.update:", error);
      throw error;
    }
  }
}

module.exports = new TestimonialDTO();
