const userDTO = require("../dto/userDTO");
const AbstractModel = require("./abstractModel");
const db = require('../db/dbConnection');

class UserModel extends AbstractModel {
  constructor() {
    super(userDTO);
  }

  async createUser(userData) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.create(connection, userData);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async findUserByEmailToken(token) {
    let connection;
    try {
      connection = await db.getConnection();
      const user = await this.dto.findByToken(connection, token);
      return user;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async verifyUser(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      const result = await this.dto.updateVerificationStatus(connection, userId);
      return result;
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async updateUser(id, userData) {
    return await this.dto.update(id, userData);
  }

  async authenticate(email, password) {
    return await this.dto.authenticateUser(email, password);
  }
}

module.exports = new UserModel();