const testimonialDTO = require("../dto/testimonialDTO");
const AbstractModel = require("./abstractModel");
const db = require('../db/dbConnection');

class TestimonialModel extends AbstractModel {
  constructor() {
    super(testimonialDTO);
    this.dto = testimonialDTO;
  }

  async getAllActive() {
    let connection;
    try {
      connection = await db.getConnection();
      const testimonials = await this.dto.getAll(connection);
      return testimonials;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async createTestimonial(testimonialData) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.create(connection, testimonialData);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async updateTestimonial(id, testimonialData) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.update(connection, id, testimonialData);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }
  
  async getRandomTestimonials(count = 3) {
    let connection;
    try {
      connection = await db.getConnection();
      const testimonials = await this.dto.getRandom(connection, count);
      return testimonials;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }
}

module.exports = new TestimonialModel();
