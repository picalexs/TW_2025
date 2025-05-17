const db = require("../dbConnection");
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
    let query = `SELECT * FROM ${this.tableName}`;
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    const result = await db.executeQuery(query, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    return result.rows.map(row => this.mapToEntity(row));
  }

  async getById(id) {
    const result = await db.executeQuery(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async create(entityData) {
    throw new Error("create method must be implemented by subclass");
  }

  async update(id, entityData) {
    const updates = [];
    const binds = { id };

    Object.entries(entityData).forEach(([key, value]) => {
      if (value !== undefined && key !== this.primaryKey) {
        updates.push(`${key} = :${key}`);
        binds[key] = value;
      }
    });

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    const query = `UPDATE ${this.tableName} SET ${updates.join(", ")} WHERE ${this.primaryKey} = :id`;

    await db.executeQuery(query, binds, { autoCommit: true });
    return this.getById(id);
  }

  async delete(id) {
    await db.executeQuery(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = :id`, 
      [id], 
      { autoCommit: true }
    );
    return true;
  }

  async executeCustomQuery(query, params = [], options = {}) {
    const defaultOptions = { outFormat: oracledb.OUT_FORMAT_OBJECT, ...options };
    return db.executeQuery(query, params, defaultOptions);
  }
}
module.exports = abstractDTO;