const { executeQuery } = require("../db/dbConnection");
const oracledb = require("oracledb");

class abstractDTO {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  mapToEntity(dbRow) {
    throw new Error("mapToEntity must be implemented by subclass");
  }
  async getAll(orderBy = null) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;

      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }      const result = await executeQuery(query, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });

      return result.rows.map(row => this.mapToEntity(row));
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }
      
      throw Object.assign(new Error(`Failed to fetch all ${this.tableName}: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }
  async getById(id) {
    try {
      if (!id) {
        throw Object.assign(new Error(`${this.tableName} ID is required`), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }
      const result = await executeQuery(
        `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows.length === 0) {
        throw Object.assign(new Error(`${this.tableName} with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404
        });
      }

      return this.mapToEntity(result.rows[0]);
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }
      
      throw Object.assign(new Error(`Failed to fetch ${this.tableName} by ID: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }

  async create(entityData) {
    throw new Error("create method must be implemented by subclass");
  }
  
  async update(id, entityData) {
    try {
      if (!id) {
        throw Object.assign(new Error(`${this.tableName} ID is required for update`), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }
      
      const checkExists = await this.getById(id);
      if (!checkExists) {
        throw Object.assign(new Error(`${this.tableName} with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404
        });
      }
      
      const updates = [];
      const binds = { id };

      Object.entries(entityData).forEach(([key, value]) => {
        if (value !== undefined && key !== this.primaryKey) {
          updates.push(`${key} = :${key}`);
          binds[key] = value;
        }
      });

      if (updates.length === 0) {
        throw Object.assign(new Error("No fields to update"), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }

      const query = `UPDATE ${this.tableName} SET ${updates.join(", ")} WHERE ${this.primaryKey} = :id`;

      await executeQuery(query, binds, { autoCommit: true });
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
      }
      
      throw Object.assign(new Error(`Failed to update ${this.tableName}: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }
  async delete(id) {
    try {
      if (!id) {
        throw Object.assign(new Error(`${this.tableName} ID is required for deletion`), {
          code: "VALIDATION_ERROR",
          status: 400
        });
      }
      
      const checkExists = await this.getById(id);
      if (!checkExists) {
        throw Object.assign(new Error(`${this.tableName} with id ${id} not found`), {
          code: "NOT_FOUND",
          status: 404
        });
      }
      await executeQuery(
        `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = :id`,
        [id],
        { autoCommit: true }
      );
      
      return true;
    } catch (error) {
      if (error.code && error.status) {
        throw error;
      }
      
      if (error.errorNum === 2292) {
        throw Object.assign(new Error(`Cannot delete ${this.tableName} because it is referenced by other records`), {
          code: "CHILD_RECORD_EXISTS",
          status: 409,
          originalError: error
        });
      }
      
      throw Object.assign(new Error(`Failed to delete ${this.tableName}: ${error.message}`), {
        code: error.code || "DB_ERROR",
        status: error.status || 500,
        originalError: error
      });
    }
  }
  async executeCustomQuery(query, params = [], options = {}) {
    try {
      const defaultOptions = { outFormat: oracledb.OUT_FORMAT_OBJECT, ...options };
      return await executeQuery(query, params, defaultOptions);
    } catch (error) {
      throw Object.assign(error, {
        entityName: this.tableName,
        operation: 'custom_query',
        queryParams: JSON.stringify(params).substring(0, 100)
      });
    }
  }
}
module.exports = abstractDTO;