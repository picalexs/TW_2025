const testimonialController = require("../controllers/testimonialController");
const url = require("url");
const { sendResponse } = require("../utils/helpers");

async function handleTestimonialRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  const method = req.method.toLowerCase();
  console.log(`Processing testimonial route: ${trimmedPath}, method: ${method}`);

  if (trimmedPath === "api/testimonials" && method === "get") {
    console.log('[TestimonialRoutes] Handling /api/testimonials GET request');
    await testimonialController.getAllTestimonials(req, res);
    return true;
  }

  if (trimmedPath.startsWith("api/testimonials/random") && method === "get") {
    console.log('[TestimonialRoutes] Handling /api/testimonials/random GET request');
    await testimonialController.getRandomTestimonials(req, res);
    return true;
  }

  if (trimmedPath.match(/^api\/testimonials\/\d+$/) && method === "get") {
    console.log('[TestimonialRoutes] Handling /api/testimonials/:id GET request');
    const id = parseInt(trimmedPath.split("/")[3]);
    await testimonialController.getTestimonialById(req, res, id);
    return true;
  }

  if (trimmedPath === "api/testimonials" && method === "post") {
    console.log('[TestimonialRoutes] Handling /api/testimonials POST request');
    await testimonialController.createTestimonial(req, res);
    return true;
  }

  if (trimmedPath.match(/^api\/testimonials\/\d+$/) && method === "put") {
    console.log('[TestimonialRoutes] Handling /api/testimonials/:id PUT request');
    const id = parseInt(trimmedPath.split("/")[3]);
    await testimonialController.updateTestimonial(req, res, id);
    return true;
  }

  if (trimmedPath.match(/^api\/testimonials\/\d+$/) && method === "delete") {
    console.log('[TestimonialRoutes] Handling /api/testimonials/:id DELETE request');
    const id = parseInt(trimmedPath.split("/")[3]);
    await testimonialController.deleteTestimonial(req, res, id);
    return true;
  }

  const userTestimonialsMatch = trimmedPath.match(/^api\/testimonials\/user\/(\d+)$/);
  if (userTestimonialsMatch && method === "get") {
    console.log('[TestimonialRoutes] Handling /api/testimonials/user/:userId GET request');
    const userId = parseInt(userTestimonialsMatch[1]);
    await testimonialController.getTestimonialsByUser(req, res, userId);
    return true;
  }

  return false;
}

module.exports = {
  handleTestimonialRoutes
};
