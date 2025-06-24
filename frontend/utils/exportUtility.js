function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class ExportUtility {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'xml', 'txt'];
  }

  exportData(data, format, filename) {
    if (!this.isValidFormat(format)) {
      throw new Error(`Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data to export');
    }

    const exportedData = this.formatData(data, format);
    const fileExtension = format.toLowerCase();
    const fullFilename = `${filename}.${fileExtension}`;
    
    this.downloadFile(exportedData, fullFilename, this.getContentType(format));
  }

  exportTableData(tableData, format, tableName) {
    if (!tableData || !tableData.columns || !tableData.rows) {
      throw new Error('Invalid table data structure');
    }
    const { columns, rows } = tableData;
    
    const data = rows.map(row => {
      const obj = {};
      columns.forEach((column, index) => {
        obj[column] = row[index];
      });
      return obj;
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `${tableName.toLowerCase()}_export_${timestamp}`;
    
    this.exportData(data, format, filename);
  }

  formatData(data, format) {
    switch (format.toLowerCase()) {
      case 'csv':
        return this.formatAsCSV(data);
      case 'json':
        return this.formatAsJSON(data);
      case 'xml':
        return this.formatAsXML(data);
      case 'txt':
        return this.formatAsTXT(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  formatAsCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.map(header => this.escapeCSVField(header)).join(','));

    data.forEach(row => {
      const csvRow = headers.map(header => {
        const value = row[header];
        return this.escapeCSVField(value);
      }).join(',');
      csvRows.push(csvRow);
    });

    return csvRows.join('\n');
  }

  formatAsJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  formatAsXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
    
    data.forEach(row => {
      xml += '  <record>\n';
      Object.keys(row).forEach(key => {
        const value = row[key];
        const xmlValue = this.escapeXMLValue(value);
        xml += `    <${this.sanitizeXMLTag(key)}>${xmlValue}</${this.sanitizeXMLTag(key)}>\n`;
      });
      xml += '  </record>\n';
    });
    
    xml += '</data>';
    return xml;
  }

  formatAsTXT(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const txtRows = [];
    txtRows.push(headers.join('\t'));

    data.forEach(row => {
      const txtRow = headers.map(header => {
        const value = row[header];
        return this.escapeTXTField(value);
      }).join('\t');
      txtRows.push(txtRow);
    });

    return txtRows.join('\n');
  }

  escapeCSVField(value) {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/[\r\n]+/g, ' ');
    return stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')
      ? `"${stringValue.replace(/"/g, '""')}"`
      : stringValue;
  }

  escapeXMLValue(value) {
    return value == null ? '' : String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  sanitizeXMLTag(tag) {
    return tag.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  escapeTXTField(value) {
    return value == null ? '' : String(value).replace(/[\t\n\r]/g, ' ');
  }

  downloadFile(data, filename, contentType) {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  getContentType(format) {
    const contentTypes = {
      csv: 'text/csv;charset=utf-8;',
      json: 'application/json;charset=utf-8;',
      xml: 'application/xml;charset=utf-8;',
      txt: 'text/plain;charset=utf-8;'
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  isValidFormat(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  previewExport(data, format, maxRows = 5) {
    if (!data || data.length === 0) return 'No data to preview';
    
    const previewData = data.slice(0, maxRows);
    const formatted = this.formatData(previewData, format);
    
    if (data.length > maxRows) {
      const remainingRows = data.length - maxRows;
      return formatted + `\n... and ${remainingRows} more rows`;
    }
    
    return formatted;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportUtility;
} else {
  window.ExportUtility = ExportUtility;
}