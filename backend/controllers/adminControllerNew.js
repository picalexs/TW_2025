const AdminDTO = require('../dto/adminDTO');
const { handleError } = require('../utils/errorHandler');
const fs = require('fs');
const path = require('path');

class AdminController {
  async getAvailableTables(req, res) {
    try {
      const tables = await AdminDTO.getAvailableTables();
      
      res.status(200).json({
        success: true,
        tables: tables
      });
    } catch (error) {
      console.error('Error fetching available tables:', error);
      handleError(res, error);
    }
  }

  async getTableSchema(req, res) {
    try {
      const { tableName } = req.params;
      const schema = await AdminDTO.getTableSchema(tableName);
      
      res.status(200).json({
        success: true,
        tableName: tableName,
        schema: schema
      });
    } catch (error) {
      console.error('Error fetching table schema:', error);
      handleError(res, error);
    }
  }

  async getTableStats(req, res) {
    try {
      const { tableName } = req.params;
      const stats = await AdminDTO.getTableStats(tableName);
      
      res.status(200).json({
        success: true,
        stats: stats
      });
    } catch (error) {
      console.error('Error fetching table stats:', error);
      handleError(res, error);
    }
  }

  async exportTableData(req, res) {
    try {
      const { tableName, format, limit } = req.body;
      const allowedFormats = ['csv', 'json', 'xml', 'txt'];
      if (!allowedFormats.includes(format.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Allowed formats: ' + allowedFormats.join(', ')
        });
      }

      const tableData = await AdminDTO.getTableData(tableName, limit);
      
      if (!tableData || tableData.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data found for the specified table.'
        });
      }

      const exportData = this.formatExportData(tableData, format.toLowerCase());
      const filename = this.generateFilename(tableName, format.toLowerCase());
      
      const contentType = this.getContentType(format.toLowerCase());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.status(200).send(exportData);
    } catch (error) {
      console.error('Error exporting table data:', error);
      handleError(res, error);
    }
  }

  async downloadExportedFile(req, res) {
    try {
      const { filename } = req.params;
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      const exportsDir = path.join(__dirname, '..', 'exports');
      const filePath = path.join(exportsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      res.download(filePath, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({
            success: false,
            message: 'Error downloading file'
          });
        }
        
        setTimeout(() => {
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.error('Error cleaning up file:', cleanupError);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error in downloadExportedFile:', error);
      handleError(res, error);
    }
  }

  formatExportData(tableData, format) {
    const { columns, rows } = tableData;
    
    switch (format) {
      case 'csv':
        return this.formatAsCSV(columns, rows);
      case 'json':
        return this.formatAsJSON(columns, rows);
      case 'xml':
        return this.formatAsXML(tableData.tableName, columns, rows);
      case 'txt':
        return this.formatAsTXT(columns, rows);
      default:
        throw new Error('Unsupported format');
    }
  }

  formatAsCSV(columns, rows) {
    const csvRows = [];
    csvRows.push(columns.map(col => `"${col}"`).join(','));
    
    rows.forEach(row => {
      const csvRow = row.map(cell => {
        if (cell === null || cell === undefined) return '""';
        const cellStr = String(cell);
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(',');
      csvRows.push(csvRow);
    });    
    return csvRows.join('\n');
  }

  formatAsJSON(columns, rows) {
    const jsonData = rows.map(row => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
    
    return JSON.stringify(jsonData, null, 2);
  }

  formatAsXML(tableName, columns, rows) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${tableName.toLowerCase()}_export>\n`;
    
    rows.forEach(row => {
      xml += '  <record>\n';
      columns.forEach((col, index) => {
        const value = row[index];
        const xmlValue = value !== null && value !== undefined ? 
          String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        xml += `    <${col.toLowerCase()}>${xmlValue}</${col.toLowerCase()}>\n`;
      });
      xml += '  </record>\n';
    });
    
    xml += `</${tableName.toLowerCase()}_export>`;
    return xml;
  }

  formatAsTXT(columns, rows) {
    const txtRows = [];
    txtRows.push(columns.join('\t'));
    rows.forEach(row => {
      const txtRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t');
      txtRows.push(txtRow);
    });
    
    return txtRows.join('\n');
  }

  generateFilename(tableName, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${tableName.toLowerCase()}_export_${timestamp}.${format}`;
  }

  getContentType(format) {
    const contentTypes = {
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      txt: 'text/plain'
    };
    return contentTypes[format] || 'application/octet-stream';
  }
}
module.exports = new AdminController();