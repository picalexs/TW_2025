const { sendResponse } = require('../utils/helpers');
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
        obj[col] = row[index];
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
        const value = this.escapeXML(row[index]);
        xml += `    <${col.toLowerCase()}>${value}</${col.toLowerCase()}>\n`;
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
        return value !== null && value !== undefined ? String(value).replace(/\t/g, '    ') : '';
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
}

module.exports = new AdminController();