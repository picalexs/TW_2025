class AbstractModel {
  constructor(dto) {
    this.dto = dto;
  }

  async getAll() {
    return await this.dto.getAll();
  }

  async getById(id) {
    return await this.dto.getById(id);
  }

  async create(data) {
    // This method should be overridden with validation logic
    return await this.dto.create(data);
  }

  async update(id, data) {
    // This method should be overridden with validation logic
    return await this.dto.update(id, data);
  }

  async delete(id) {
    return await this.dto.delete(id);
  }
}

module.exports = AbstractModel;
