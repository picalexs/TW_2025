require("dotenv").config();
const oracledb = require("oracledb");

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
};

async function initialize() {
  try {
    await oracledb.createPool(dbConfig);
    console.log("Oracle DB connection pool created");
    return true;
  } catch (err) {
    console.error("Error creating connection pool:", err);
    return false;
  }
}

async function getConnection() {
  try {
    const connection = await oracledb.getConnection();
    return connection;
  } catch (err) {
    console.error("Error getting connection from pool:", err);
    throw err;
  }
}

async function closeConnection(connection) {
  if (connection) {
    try {
      await connection.close();
    } catch (err) {
      console.error("Error closing connection:", err);
    }
  }
}

async function closePool() {
  try {
    await oracledb.getPool().close(0);
    console.log("Connection pool closed");
  } catch (err) {
    console.error("Error closing pool:", err);
  }
}

async function executeQuery(query, binds = [], options = {}) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, binds, options);
    return result;
  } catch (err) {
    console.error("Error executing query:", err);
    throw err;
  } finally {
    if (connection) {
      await closeConnection(connection);
    }
  }
}

module.exports = {
  initialize,
  getConnection,
  closeConnection,
  closePool,
  executeQuery
};
