const AbstractModel = require("./abstractModel");
const testimonialDTO = require("../dto/testimonialDTO");

class TestimonialModel extends AbstractModel {
  constructor() {
    super(testimonialDTO);
    this.dto = testimonialDTO;
  }

  async getAllActive() {
    return await this.dto.getAll();
  }

  async createTestimonial(testimonialData) {
    return await this.dto.create(testimonialData);
  }

  async updateTestimonial(id, testimonialData) {
    return await this.dto.update(id, testimonialData);
  }

  async getRandomTestimonials(count = 3) {
    return await this.dto.getRandom(count);
  }

  async getByUser(userId) {
    return await this.dto.getByUser(userId);
  }
}

module.exports = new TestimonialModel();