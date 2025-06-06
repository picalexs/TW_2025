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

function getPool() {
  return oracledb.getPool();
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
    const enhancedError = enhanceOracleError(err, query);
    console.error("Error executing query:", enhancedError);
    throw enhancedError;
  } finally {
    if (connection) {
      await closeConnection(connection);
    }
  }
}

function enhanceOracleError(error, query) {
  if (!error.errorNum && !error.message?.includes('ORA-')) {
    return error;
  }

  const enhancedError = Object.assign(error, { 
    originalQuery: query ? query.substring(0, 200) + (query.length > 200 ? '...' : '') : 'N/A',
    timestamp: new Date().toISOString(),
    isOracleError: true
  });

  // Handle application errors (custom triggers)
  if (error.message?.includes('ORA-20001')) {
    enhancedError.code = "USERNAME_ALREADY_EXISTS";
    enhancedError.status = 409;
    enhancedError.userMessage = "Username is already taken. Please choose a different username.";
    enhancedError.field = "username";
    return enhancedError;
  }
  
  if (error.message?.includes('ORA-20002')) {
    enhancedError.code = "EMAIL_ALREADY_EXISTS";
    enhancedError.status = 409;
    enhancedError.userMessage = "Email address is already registered. Please use a different email or try logging in.";
    enhancedError.field = "email";
    return enhancedError;
  }

  if (error.message?.includes('ORA-20003')) {
    enhancedError.code = "INVALID_EMAIL_FORMAT";
    enhancedError.status = 400;
    enhancedError.userMessage = "Please enter a valid email address.";
    enhancedError.field = "email";
    return enhancedError;
  }

  const errorNum = error.errorNum || extractOracleErrorNumber(error.message);
  
  switch (errorNum) {
    case 1:
      if (error.message?.includes('UK_USERS_USERNAME')) {
        enhancedError.code = "USERNAME_ALREADY_EXISTS";
        enhancedError.userMessage = "Username is already taken. Please choose a different username.";
        enhancedError.field = "username";
      } else if (error.message?.includes('UK_USERS_EMAIL') || error.message?.includes('USERS_EMAIL_UK')) {
        enhancedError.code = "EMAIL_ALREADY_EXISTS";
        enhancedError.userMessage = "Email address is already registered. Please use a different email or try logging in.";
        enhancedError.field = "email";
      } else {
        enhancedError.code = "UNIQUE_CONSTRAINT_VIOLATION";
        enhancedError.userMessage = "A record with this information already exists. Please check your input.";
      }
      enhancedError.status = 409;
      break;
    case 942:
      enhancedError.code = "TABLE_OR_VIEW_MISSING";
      enhancedError.status = 500;
      enhancedError.userMessage = "Database table or view does not exist";
      break;
    case 904:
      enhancedError.code = "INVALID_COLUMN";
      enhancedError.status = 500;
      enhancedError.userMessage = "Invalid column name in query";
      break;
    case 1400:
      enhancedError.code = "NULL_CONSTRAINT_VIOLATION";
      enhancedError.status = 400;
      enhancedError.userMessage = "Required field cannot be null";
      break;
    case 2290:
      enhancedError.code = "CHECK_CONSTRAINT_VIOLATION";
      enhancedError.status = 400;
      enhancedError.userMessage = "Data validation failed for one or more fields";
      break;
    case 2291:
      enhancedError.code = "FOREIGN_KEY_VIOLATION";
      enhancedError.status = 400;
      enhancedError.userMessage = "Referenced record does not exist";
      break;
    case 2292:
      enhancedError.code = "CHILD_RECORD_FOUND";
      enhancedError.status = 409;
      enhancedError.userMessage = "Cannot delete record - it is referenced by other records";
      break;
    case 12899:
      enhancedError.code = "VALUE_TOO_LARGE";
      enhancedError.status = 400;
      enhancedError.userMessage = "Value too large for one or more fields";
      break;
    case 1017:
      enhancedError.code = "INVALID_CREDENTIALS";
      enhancedError.status = 401;
      enhancedError.userMessage = "Invalid database credentials";
      break;
    case 12541:
    case 12170:
      enhancedError.code = "CONNECTION_ERROR";
      enhancedError.status = 503;
      enhancedError.userMessage = "Database connection failed";
      break;
    case 12514:
      enhancedError.code = "SERVICE_NOT_FOUND";
      enhancedError.status = 503;
      enhancedError.userMessage = "Database service unavailable";
      break;
    case 1013:
      enhancedError.code = "QUERY_TIMEOUT";
      enhancedError.status = 504;
      enhancedError.userMessage = "Query execution timed out";
      break;
    case 54:
      enhancedError.code = "RESOURCE_BUSY";
      enhancedError.status = 429;
      enhancedError.userMessage = "Resource busy, try again later";
      break;
    default:
      enhancedError.code = "DB_ERROR";
      enhancedError.status = 500;
      enhancedError.userMessage = "Database operation failed";
  }
  return enhancedError;
}

function extractOracleErrorNumber(message) {
  if (!message) return null;
  const match = message.match(/ORA-(\d+)/);
  return match ? parseInt(match[1]) : null;
}

module.exports = {
  initialize,
  getPool,
  getConnection,
  closeConnection,
  closePool,
  executeQuery,
  enhanceOracleError,
  extractOracleErrorNumber
};