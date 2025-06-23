const { sendResponse, collectRequestData } = require('../utils/helpers');
const db = require('../db/dbConnection');

class AdminController {  constructor() {
    this.allowedTables = [
      'USERS',
      'ANIMALS',
      'TAGS',
      'ANIMAL_TAGS',
      'ADOPTIONS',
      'TESTIMONIALS',
      'FAVORITES',
      'OWNER_REVIEWS',
      'SYSTEM_NOTIFICATIONS',
      'USER_PREFERENCE_TAGS',
      'ADDRESS',
      'MEDIA',
      'CONVERSATIONS',
      'MESSAGES'
    ];
  }

  async getAvailableTables(req, res) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return sendResponse(res, 403, { 
          success: false, 
          message: 'Forbidden: Admin access required' 
        });
      }

      const tableInfo = [];
        for (const tableName of this.allowedTables) {
        try {
          const countResult = await db.executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = countResult.rows[0][0] || 0;
          
          const columnsResult = await db.executeQuery(`
            SELECT COLUMN_NAME 
            FROM USER_TAB_COLUMNS 
            WHERE TABLE_NAME = :tableName
            ORDER BY COLUMN_ID
          `, [tableName.toUpperCase()]);
          
          const columns = columnsResult.rows.map(row => row[0]);
          
          tableInfo.push({
            name: tableName,
            displayName: this.getTableDisplayName(tableName),
            rowCount: count,
            columns: columns
          });
        } catch (error) {
          console.error(`Error getting info for table ${tableName}:`, error);
        }
      }

      sendResponse(res, 200, {
        success: true,
        tables: tableInfo
      });
    } catch (error) {
      console.error('Error getting available tables:', error);
      sendResponse(res, 500, {
        success: false,
        message: 'Failed to get available tables',
        error: error.message
      });
    }
  }

  async exportTable(req, res) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return sendResponse(res, 403, { 
          success: false, 
          message: 'Forbidden: Admin access required' 
        });
      }
      const { table, format, limit } = req.query;

      if (!table || !this.allowedTables.includes(table.toUpperCase())) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Invalid or unauthorized table name'
        });
      }

      const supportedFormats = ['csv', 'json', 'xml', 'txt'];
      if (!format || !supportedFormats.includes(format.toLowerCase())) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Invalid format. Supported formats: ' + supportedFormats.join(', ')
        });
      }
      let query = `SELECT * FROM ${table.toUpperCase()}`;
      const queryParams = [];

      if (limit && !isNaN(parseInt(limit)) && parseInt(limit) > 0) {
        query += ` WHERE ROWNUM <= :limit`;
        queryParams.push(parseInt(limit));
      }
      const result = await db.executeQuery(query, queryParams);

      const columnsResult = await db.executeQuery(`
        SELECT COLUMN_NAME 
        FROM USER_TAB_COLUMNS 
        WHERE TABLE_NAME = :tableName
        ORDER BY COLUMN_ID
      `, [table.toUpperCase()]);
      
      const columns = columnsResult.rows.map(row => row[0]);
      const formattedData = this.formatExportData(result.rows, columns, format.toLowerCase());
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `${table}_export_${timestamp}.${format.toLowerCase()}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getContentType(format.toLowerCase()));

      res.writeHead(200);
      res.end(formattedData);

    } catch (error) {
      console.error('Error exporting table:', error);
      sendResponse(res, 500, {
        success: false,
        message: 'Failed to export table data',
        error: error.message
      });
    }
  }

  async previewTable(req, res) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return sendResponse(res, 403, { 
          success: false, 
          message: 'Forbidden: Admin access required' 
        });
      }
      const { table, limit = 10 } = req.query;

      if (!table || !this.allowedTables.includes(table.toUpperCase())) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Invalid or unauthorized table name'
        });
      }
      const previewLimit = Math.min(parseInt(limit) || 10, 50);
      const result = await db.executeQuery(`SELECT * FROM ${table.toUpperCase()} WHERE ROWNUM <= :previewLimit`, [previewLimit]);

      const columnsResult = await db.executeQuery(`
        SELECT COLUMN_NAME 
        FROM USER_TAB_COLUMNS 
        WHERE TABLE_NAME = :tableName
        ORDER BY COLUMN_ID
      `, [table.toUpperCase()]);
      
      const columns = columnsResult.rows.map(row => row[0]);

      const countResult = await db.executeQuery(`SELECT COUNT(*) as count FROM ${table.toUpperCase()}`);
      const totalRows = countResult.rows[0][0] || 0;      sendResponse(res, 200, {
        success: true,
        preview: {
          table: table,
          columns: columns,
          rows: result.rows,
          totalRows: totalRows,
          previewRows: result.rows.length
        }
      });

    } catch (error) {
      console.error('Error previewing table:', error);
      sendResponse(res, 500, {
        success: false,
        message: 'Failed to preview table data',
        error: error.message
      });
    }
  }
  
  async importTable(req, res) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return sendResponse(res, 403, { 
          success: false, 
          message: 'Forbidden: Admin access required' 
        });
      }      const requestData = await collectRequestData(req);
      console.log('Request data received:', Object.keys(requestData));
      
      const table = req.body?.table || requestData.table;
      const format = requestData.format;
      const file = requestData.files?.file;
      
      console.log('Import parameters:', { table, format, fileReceived: !!file });

      if (!table || !this.allowedTables.includes(table.toUpperCase())) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Invalid or unauthorized table name'
        });
      }

      const supportedFormats = ['csv', 'json', 'xml', 'txt'];
      if (!format || !supportedFormats.includes(format.toLowerCase())) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Invalid format. Supported formats: ' + supportedFormats.join(', ')
        });
      }

      if (!file || !file.data) {
        return sendResponse(res, 400, {
          success: false,
          message: 'No file provided for import'
        });
      }

      const columnsResult = await db.executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, NULLABLE 
        FROM USER_TAB_COLUMNS 
        WHERE TABLE_NAME = :tableName
        ORDER BY COLUMN_ID
      `, [table.toUpperCase()]);
      
      const tableColumns = columnsResult.rows.map(row => ({
        name: row[0],
        type: row[1],
        nullable: row[2] === 'Y'
      }));

      const fileContent = file.data.toString('utf8');
      let parsedData;

      try {
        parsedData = this.parseImportData(fileContent, format.toLowerCase(), tableColumns);
      } catch (parseError) {
        return sendResponse(res, 400, {
          success: false,
          message: `Failed to parse file: ${parseError.message}`
        });
      }

      const validationResult = this.validateImportData(parsedData, tableColumns);
      if (!validationResult.valid) {
        return sendResponse(res, 400, {
          success: false,
          message: `Data validation failed: ${validationResult.errors.join(', ')}`
        });
      }      
      
      let rowsImported = 0;
      let connection;
      
      try {
        connection = await db.getConnection();
        
        console.log('Starting import transaction...');
        
        for (const row of parsedData) {
          try {
            await this.insertRowIntoTable(connection, table.toUpperCase(), row, tableColumns);
            rowsImported++;
            console.log(`Successfully imported row ${rowsImported}/${parsedData.length}`);
          } catch (insertError) {
            console.error(`Failed to insert row ${rowsImported + 1}:`, row, insertError.message);
          }
        }
        
        await connection.commit();
        console.log(`Transaction committed. Imported ${rowsImported} rows successfully.`);
        
        sendResponse(res, 200, {
          success: true,
          message: `Successfully imported ${rowsImported} rows into ${table}`,
          rowsImported,
          totalRows: parsedData.length
        });
      } catch (error) {
        console.error('Import transaction error:', error);
        if (connection) {
          try {
            await connection.rollback();
            console.log('Transaction rolled back due to error');
          } catch (rollbackError) {
            console.error('Error during rollback:', rollbackError);
          }
        }
        throw error;
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (closeError) {
            console.error('Error closing connection:', closeError);
          }
        }
      }

    } catch (error) {
      console.error('Error importing table:', error);
      sendResponse(res, 500, {
        success: false,
        message: 'Failed to import table data',
        error: error.message
      });
    }
  }

  formatExportData(rows, columns, format) {
    switch (format) {
      case 'csv':
        return this.formatAsCSV(rows, columns);
      case 'json':
        return this.formatAsJSON(rows, columns);
      case 'xml':
        return this.formatAsXML(rows, columns);
      case 'txt':
        return this.formatAsTXT(rows, columns);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  formatAsCSV(rows, columns) {
    const csvRows = [];
    csvRows.push(columns.map(col => this.escapeCSVField(col)).join(','));
    
    rows.forEach(row => {
      const csvRow = row.map(value => {
        if (value instanceof Date) {
          return this.escapeCSVField(value.toISOString());
        }
        if (typeof value === 'string' && value.match(/^\d{2}-\w{3}-\d{2}/)) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return this.escapeCSVField(date.toISOString());
            }
          } catch (e) {
            //just return as string
          }
        }
        return this.escapeCSVField(value);
      }).join(',');
      csvRows.push(csvRow);
    });
    
    return csvRows.join('\n');
  }
 
  formatAsJSON(rows, columns) {
    const jsonData = rows.map(row => {
      const obj = {};
      columns.forEach((col, index) => {
        let value = row[index];
        
        if (value instanceof Date) {
          value = value.toISOString();
        }
        else if (typeof value === 'string' && value.match(/^\d{2}-\w{3}-\d{2}/)) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toISOString();
            }
          } catch (e) {
            //just return as string
          }
        }
        
        obj[col] = value;
      });
      return obj;
    });
    return JSON.stringify(jsonData, null, 2);
  }

  formatAsXML(rows, columns) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
    
    rows.forEach(row => {
      xml += '  <record>\n';
      columns.forEach((col, index) => {
        let value = row[index];
        
        if (value instanceof Date) {
          value = value.toISOString();
        }
        else if (typeof value === 'string' && value.match(/^\d{2}-\w{3}-\d{2}/)) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toISOString();
            }
          } catch (e) {
            //just return as string
          }
        }
        
        const xmlValue = this.escapeXML(value);
        xml += `    <${col.toLowerCase()}>${xmlValue}</${col.toLowerCase()}>\n`;
      });
      xml += '  </record>\n';
    });
    
    xml += '</data>';
    return xml;
  }

  formatAsTXT(rows, columns) {
    const txtRows = [];
    txtRows.push(columns.join('\t'));
    
    rows.forEach(row => {
      const txtRow = row.map(value => {
        if (value === null || value === undefined) return '';
        
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'string' && value.match(/^\d{2}-\w{3}-\d{2}/)) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            //just return as string
          }
        }
        
        return String(value).replace(/\t/g, '    ');
      }).join('\t');
      txtRows.push(txtRow);
    });
    
    return txtRows.join('\n');
  }

  escapeCSVField(value) {
    if (value === null || value === undefined) return '';
    
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  escapeXML(value) {
    if (value === null || value === undefined) return '';
    
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  getContentType(format) {
    const contentTypes = {
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
      'txt': 'text/plain'
    };
    return contentTypes[format] || 'text/plain';
  }

  getTableDisplayName(tableName) {
    const displayNames = {
      'USERS': 'Users',
      'ANIMALS': 'Animals/Pets',
      'TAGS': 'Tags',
      'ANIMAL_TAGS': 'Animal Tags',
      'ADOPTIONS': 'Adoptions',
      'TESTIMONIALS': 'Testimonials',
      'FAVORITES': 'Favorites',
      'OWNER_REVIEWS': 'Owner Reviews',
      'SYSTEM_NOTIFICATIONS': 'System Notifications',
      'USER_PREFERENCE_TAGS': 'User Preference Tags',
      'ADDRESS': 'Addresses',
      'MEDIA': 'Media Files',
      'CONVERSATIONS': 'Conversations',
      'MESSAGES': 'Messages'
    };
    return displayNames[tableName] || tableName;
  }

  parseImportData(content, format, tableColumns) {
    switch (format) {
      case 'csv':
        return this.parseCSV(content, tableColumns);
      case 'json':
        return this.parseJSON(content);
      case 'xml':
        return this.parseXML(content);
      case 'txt':
        return this.parseTXT(content, tableColumns);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  parseCSV(content, tableColumns) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toUpperCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        let value = values[index] || null;
        
        if (value !== null) {
          value = value.trim();
          if (value === '' || value === 'null' || value === 'undefined') {
            value = null;
          }
        }
        
        row[header] = value;
      });
      
      data.push(row);
    }

    return data;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    result.push(current.trim());
    return result;
  }

  parseJSON(content) {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of objects');
    }
    
    return data.map(item => {
      const row = {};
      Object.keys(item).forEach(key => {
        row[key.toUpperCase()] = item[key];
      });
      return row;
    });
  }

  parseXML(content) {
    const records = content.match(/<record>(.*?)<\/record>/gs) || [];
    const data = [];

    records.forEach(record => {
      const row = {};
      const fields = record.match(/<(\w+)>(.*?)<\/\1>/g) || [];
      
      fields.forEach(field => {
        const match = field.match(/<(\w+)>(.*?)<\/\1>/);
        if (match) {
          row[match[1].toUpperCase()] = match[2];
        }
      });
      
      data.push(row);
    });

    return data;
  }

  parseTXT(content, tableColumns) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('TXT file must have at least a header and one data row');
    }

    const headers = lines[0].split('\t').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const row = {};
      
      headers.forEach((header, index) => {
        row[header.toUpperCase()] = values[index] || null;
      });
      
      data.push(row);
    }

    return data;
  }

  validateImportData(data, tableColumns) {
    const errors = [];
    const columnNames = tableColumns.map(col => col.name);

    if (data.length === 0) {
      errors.push('No data rows found');
      return { valid: false, errors };
    }

    const firstRow = data[0];
    const providedColumns = Object.keys(firstRow);
    
    const requiredColumns = tableColumns
      .filter(col => !col.nullable && col.name !== 'ID')
      .map(col => col.name);

    const missingColumns = requiredColumns.filter(col => !providedColumns.includes(col));
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const unknownColumns = providedColumns.filter(col => !columnNames.includes(col));
    if (unknownColumns.length > 0) {
      errors.push(`Unknown columns: ${unknownColumns.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async insertRowIntoTable(connection, tableName, row, tableColumns) {
    const validColumns = tableColumns.map(col => col.name);
    const filteredRow = {};
    const timestampColumns = [];
    
    Object.keys(row).forEach(key => {
      if (validColumns.includes(key) && key !== 'ID') {
        const value = row[key];
        const columnInfo = tableColumns.find(col => col.name === key);
        
        if (columnInfo.type.toUpperCase().includes('TIMESTAMP') || columnInfo.type.toUpperCase().includes('DATE')) {
          if (value && value !== null) {
            timestampColumns.push(key);
            filteredRow[key] = value;
          } else {
            filteredRow[key] = null;
          }
        } else {
          filteredRow[key] = this.convertValueForOracle(value, columnInfo);
        }
      }
    });

    if (Object.keys(filteredRow).length === 0) {
      throw new Error('No valid columns found in row');
    }

    const columns = Object.keys(filteredRow);
    
    const binds = {};
    const placeholders = columns.map(col => {
      const bindName = col.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      if (timestampColumns.includes(col) && filteredRow[col] !== null) {
        binds[bindName] = filteredRow[col];
        const timestampValue = filteredRow[col];
        
        if (timestampValue.includes('T') && timestampValue.includes('Z')) {
          return `TO_TIMESTAMP(:${bindName}, 'YYYY-MM-DD"T"HH24:MI:SS.FF"Z"')`;
        } else if (timestampValue.includes('T')) {
          return `TO_TIMESTAMP(:${bindName}, 'YYYY-MM-DD"T"HH24:MI:SS')`;
        } else if (timestampValue.includes(' ')) {
          return `TO_TIMESTAMP(:${bindName}, 'YYYY-MM-DD HH24:MI:SS')`;
        } else {
          return `TO_TIMESTAMP(:${bindName})`;
        }
      } else {
        binds[bindName] = filteredRow[col];
        return `:${bindName}`;
      }
    }).join(', ');

    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    console.log('Executing query:', query);
    console.log('With binds:', binds);

    await connection.execute(query, binds, { autoCommit: false });
  }

  convertValueForOracle(value, columnInfo) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const dataType = columnInfo.type.toUpperCase();
    
    try {
      if (dataType.startsWith('NUMBER')) {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? null : numValue;
      }
      
      // For VARCHAR2, CHAR, CLOB and other string types, return as string
      if (dataType.includes('VARCHAR') || dataType.includes('CHAR') || dataType.includes('CLOB')) {
        return String(value).trim();
      }
      
      return String(value);
    } catch (error) {
      console.warn(`Error converting value "${value}" for column ${columnInfo.name} (${dataType}):`, error);
      return null;
    }
  }
}

module.exports = new AdminController();