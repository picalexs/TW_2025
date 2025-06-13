const testimonialModel = require("../models/testimonialModel");
const { sendResponse, collectRequestData } = require("../utils/helpers");

class TestimonialController {
  async getAllTestimonials(req, res) {
    try {
      const testimonials = await testimonialModel.getAllActive();
      sendResponse(res, 200, testimonials);
    } catch (error) {
      console.error("Error getting all testimonials:", error);
      sendResponse(res, 500, { error: "Failed to fetch testimonials", message: error.message });
    }
  }

  async getRandomTestimonials(req, res) {
    try {
      const count = parseInt(req.url.split('count=')[1]) || 3;
      const testimonials = await testimonialModel.getRandomTestimonials(count);
      sendResponse(res, 200, testimonials);
    } catch (error) {
      console.error("Error getting random testimonials:", error);
      sendResponse(res, 500, { error: "Failed to fetch random testimonials", message: error.message });
    }
  }

  async getTestimonialById(req, res, id) {
    try {
      const testimonial = await testimonialModel.getById(id);
      if (testimonial) {
        sendResponse(res, 200, testimonial);
      } else {
        sendResponse(res, 404, { error: "Testimonial not found" });
      }
    } catch (error) {
      console.error(`Error getting testimonial by ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch testimonial", message: error.message });
    }
  }
  async createTestimonial(req, res) {
    try {
      const testimonialData = await collectRequestData(req);

      if (!testimonialData.user_id || !testimonialData.testimonial_text) {
        return sendResponse(res, 400, { 
          error: "Missing required fields", 
          message: "User ID and testimonial text are required" 
        });
      }

      const newTestimonial = await testimonialModel.createTestimonial(testimonialData);
      sendResponse(res, 201, newTestimonial);
    } catch (error) {
      console.error("Error creating testimonial:", error);
      if (error.code === "VALIDATION_ERROR") {
        sendResponse(res, error.status || 400, { error: error.userMessage || error.message });
      } else {
        sendResponse(res, 500, { error: "Failed to create testimonial", message: error.message });
      }
    }
  }

  async updateTestimonial(req, res, id) {
    try {
      const testimonialData = await collectRequestData(req);
      const result = await testimonialModel.updateTestimonial(id, testimonialData);
      
      if (result.success) {
        sendResponse(res, 200, { message: "Testimonial updated successfully" });
      } else {
        sendResponse(res, 404, { error: "Testimonial not found" });
      }
    } catch (error) {
      console.error(`Error updating testimonial with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to update testimonial", message: error.message });
    }
  }
  async deleteTestimonial(req, res, id) {
    try {
      const result = await testimonialModel.deleteById(id);
      
      if (result.success) {
        sendResponse(res, 200, { message: "Testimonial deleted successfully" });
      } else {
        sendResponse(res, 404, { error: "Testimonial not found" });
      }
    } catch (error) {
      console.error(`Error deleting testimonial with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to delete testimonial", message: error.message });
    }
  }
}

module.exports = new TestimonialController();
