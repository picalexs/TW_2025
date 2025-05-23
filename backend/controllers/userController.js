// backend/controllers/userController.js
const userModel = require("../models/userModel");
const { sendResponse, collectRequestData } = require("../../utils/helpers"); // Functii utilitare generale

class UserController {
  // Obtine toti utilizatorii
  async getAllUsers(req, res) {
    try {
      const users = await userModel.getAllUsers();
      sendResponse(res, 200, users);
    } catch (error) {
      console.error("Error getting all users:", error);
      sendResponse(res, 500, { error: "Failed to fetch users", message: error.message });
    }
  }

  // Obtine un utilizator dupa ID
  async getUserById(req, res, id) {
    try {
      const user = await userModel.getUserById(id);
      if (user) {
        sendResponse(res, 200, user);
      } else {
        sendResponse(res, 404, { error: "User not found" });
      }
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to fetch user", message: error.message });
    }
  }

  // Creeaza un utilizator nou
  async createUser(req, res) {
    try {
      const userData = await collectRequestData(req);
      const userId = await userModel.createUser(userData);
      sendResponse(res, 201, { id: userId, message: "User created successfully" });
    } catch (error) {
      console.error("Error creating user:", error);
      sendResponse(res, 400, { error: "Failed to create user", message: error.message });
    }
  }

  // Actualizeaza un utilizator
  async updateUser(req, res, id) {
    try {
      const userData = await collectRequestData(req);
      const updatedUser = await userModel.updateUser(id, userData);
      if (updatedUser) {
        sendResponse(res, 200, updatedUser);
      } else {
        sendResponse(res, 404, { error: "User not found for update" });
      }
    } catch (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to update user", message: error.message });
    }
  }

  // Sterge un utilizator
  async deleteUser(req, res, id) {
    try {
      const deleted = await userModel.deleteUser(id);
      if (deleted) {
        sendResponse(res, 204, {}); // 204 No Content for successful deletion
      } else {
        sendResponse(res, 404, { error: "User not found for deletion" });
      }
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to delete user", message: error.message });
    }
  }

  // Autentifica utilizatorul
  async authenticateUser(req, res) {
    try {
      const { email, password } = await collectRequestData(req);
      const user = await userModel.authenticate(email, password);
      if (user) {
        sendResponse(res, 200, { message: "Authentication successful", user });
      } else {
        sendResponse(res, 401, { error: "Authentication failed", message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      sendResponse(res, 500, { error: "Authentication failed", message: error.message });
    }
  }
}

module.exports = new UserController();