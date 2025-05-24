const userModel = require("../models/userModel");
const { sendResponse, collectRequestData } = require("../utils/helpers");

class UserController {
  async getAllUsers(req, res) {
    try {
      const users = await userModel.getAll();
      sendResponse(res, 200, users);
    } catch (error) {
      console.error("Error getting all users:", error);
      sendResponse(res, 500, { error: "Failed to fetch users", message: error.message });
    }
  }

  async getUserById(req, res, id) {
    try {
      const user = await userModel.getById(id);
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

  async deleteUser(req, res, id) {
    try {
      const deleted = await userModel.delete(id);
      if (deleted) {
        sendResponse(res, 204, {});
      } else {
        sendResponse(res, 404, { error: "User not found for deletion" });
      }
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      sendResponse(res, 500, { error: "Failed to delete user", message: error.message });
    }
  }

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