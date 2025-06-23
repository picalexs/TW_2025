const AbstractModel = require('./abstractModel');
const adminDTO = require('../dto/adminDTO');

class AdminModel extends AbstractModel {
  constructor() {
    super(adminDTO);
  }

  async getAvailableTables() {
    return await this.dto.getAvailableTables();
  }

  async getTableSchema(tableName) {
    return await this.dto.getTableSchema(tableName);
  }

  async getTableData(tableName, limit) {
    return await this.dto.getTableData(tableName, limit);
  }

  async getTableStats(tableName) {
    return await this.dto.getTableStats(tableName);
  }
}

module.exports = new AdminModel();