const dbConnection = require('../db/dbConnection');

class AdminDTO {
  static async getAvailableTables() {
    try {
      const query = `
        SELECT table_name 
        FROM user_tables 
        WHERE table_name IN (
          'ADDRESS', 'USERS', 'ANIMALS', 'ADOPTIONS', 'ANIMAL_METRICS', 
          'ADOPTION_STATUS_HISTORY', 'FAVORITES', 'CARE_SCHEDULE', 
          'CARE_RESOURCES', 'MEDICAL_HISTORY', 'MEDIA', 'TAGS', 
          'ANIMAL_TAGS', 'USER_PREFERENCE_TAGS', 'SYSTEM_NOTIFICATIONS', 
          'CONVERSATIONS', 'MESSAGES', 'USER_PREFERENCES', 'SYSTEM_LOGS', 
          'TESTIMONIALS', 'OWNER_REVIEWS'
        )
        ORDER BY table_name
      `;
      
      const result = await dbConnection.execute(query);
      return result.rows.map(row => row[0]);
    } catch (error) {
      console.error('Error fetching available tables:', error);
      throw new Error('Failed to fetch available tables');
    }
  }

  static async getTableSchema(tableName) {
    try {
      const allowedTables = await this.getAvailableTables();
      if (!allowedTables.includes(tableName.toUpperCase())) {
        throw new Error('Invalid table name');
      }

      const query = `
        SELECT 
          column_name,
          data_type,
          nullable,
          data_length,
          data_precision,
          data_scale
        FROM user_tab_columns 
        WHERE table_name = :tableName
        ORDER BY column_id
      `;
      
      const result = await dbConnection.execute(query, [tableName.toUpperCase()]);
      return result.rows.map(row => ({
        columnName: row[0],
        dataType: row[1],
        nullable: row[2],
        dataLength: row[3],
        dataPrecision: row[4],
        dataScale: row[5]
      }));
    } catch (error) {
      console.error('Error fetching table schema:', error);
      throw new Error('Failed to fetch table schema');
    }
  }

  static async getTableData(tableName, limit = null) {
    try {
      const allowedTables = await this.getAvailableTables();
      if (!allowedTables.includes(tableName.toUpperCase())) {
        throw new Error('Invalid table name');
      }

      const schema = await this.getTableSchema(tableName);
      const columnNames = schema.map(col => col.columnName);

      let query = `SELECT * FROM ${tableName.toUpperCase()}`;
      if (limit && limit > 0) {
        query += ` ORDER BY 1 FETCH FIRST ${limit} ROWS ONLY`;
      }

      const result = await dbConnection.execute(query);
      
      return {
        tableName: tableName.toUpperCase(),
        columns: columnNames,
        rows: result.rows,
        totalRows: result.rows.length
      };
    } catch (error) {
      console.error('Error fetching table data:', error);
      throw new Error(`Failed to fetch data from table: ${tableName}`);
    }
  }

  static async getTableStats(tableName) {
    try {
      const allowedTables = await this.getAvailableTables();
      if (!allowedTables.includes(tableName.toUpperCase())) {
        throw new Error('Invalid table name');
      }

      const countQuery = `SELECT COUNT(*) FROM ${tableName.toUpperCase()}`;
      const countResult = await dbConnection.execute(countQuery);
      const rowCount = countResult.rows[0][0];

      const sizeQuery = `
        SELECT 
          bytes/1024/1024 as size_mb,
          num_rows,
          last_analyzed
        FROM user_tables t
        LEFT JOIN user_segments s ON t.table_name = s.segment_name
        WHERE t.table_name = :tableName
      `;
      
      const sizeResult = await dbConnection.execute(sizeQuery, [tableName.toUpperCase()]);
      const sizeInfo = sizeResult.rows[0] || [0, rowCount, null];

      return {
        tableName: tableName.toUpperCase(),
        rowCount: rowCount,
        sizeMB: sizeInfo[0] || 0,
        lastAnalyzed: sizeInfo[2]
      };
    } catch (error) {
      console.error('Error fetching table stats:', error);
      throw new Error('Failed to fetch table statistics');
    }
  }
}

module.exports = AdminDTO;
