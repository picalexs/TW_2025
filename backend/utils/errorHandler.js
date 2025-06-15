const { sendResponse } = require('./helpers');

class ErrorHandler {
    
    static handleOracleError(error, res, operation = 'database operation') {
        console.error(`Oracle Error during ${operation}:`, error);

        if (!error.errorNum) {
            return this.handleGenericError(error, res, operation);
        }

        switch (error.errorNum) {
            // Unique constraint violations
            case 1:
            case 2290:
                return sendResponse(res, 409, {
                    success: false,
                    error: 'Conflict',
                    message: 'A unique constraint was violated. Record already exists.',
                    code: 'UNIQUE_CONSTRAINT_VIOLATION',
                    operation
                });

            // Not null constraint violations
            case 1400:
                return sendResponse(res, 400, {
                    success: false,
                    error: 'Bad Request',
                    message: 'Required field cannot be null.',
                    code: 'NULL_CONSTRAINT_VIOLATION',
                    operation
                });

            // Foreign key constraint violations
            case 2291:
                return sendResponse(res, 400, {
                    success: false,
                    error: 'Bad Request',
                    message: 'Referenced record does not exist.',
                    code: 'FOREIGN_KEY_VIOLATION',
                    operation
                });

            case 2292:
                return sendResponse(res, 409, {
                    success: false,
                    error: 'Conflict',
                    message: 'Cannot delete record - it is referenced by other records.',
                    code: 'CHILD_RECORD_EXISTS',
                    operation
                });

            // Value too large for column
            case 12899:
                return sendResponse(res, 400, {
                    success: false,
                    error: 'Bad Request',
                    message: 'Value too large for column.',
                    code: 'VALUE_TOO_LARGE',
                    operation
                });

            // Invalid username/password
            case 1017:
                return sendResponse(res, 401, {
                    success: false,
                    error: 'Authentication Failed',
                    message: 'Invalid credentials provided.',
                    code: 'INVALID_CREDENTIALS',
                    operation
                });

            // Account locked
            case 28000:
                return sendResponse(res, 423, {
                    success: false,
                    error: 'Account Locked',
                    message: 'Account is locked due to multiple failed attempts.',
                    code: 'ACCOUNT_LOCKED',
                    operation
                });

            // Password expired
            case 28001:
                return sendResponse(res, 401, {
                    success: false,
                    error: 'Password Expired',
                    message: 'Password has expired and must be changed.',
                    code: 'PASSWORD_EXPIRED',
                    operation
                });

            // No data found
            case 1403:
                return sendResponse(res, 404, {
                    success: false,
                    error: 'Not Found',
                    message: 'Requested record not found.',
                    code: 'RECORD_NOT_FOUND',
                    operation
                });

            // Table or view does not exist
            case 942:
                return sendResponse(res, 500, {
                    success: false,
                    error: 'Database Schema Error',
                    message: 'Required database object does not exist.',
                    code: 'SCHEMA_OBJECT_MISSING',
                    operation
                });

            // Invalid identifier
            case 904:
                return sendResponse(res, 500, {
                    success: false,
                    error: 'Database Query Error',
                    message: 'Invalid column or table name in query.',
                    code: 'INVALID_IDENTIFIER',
                    operation
                });

            // Connection errors
            case 12541:
            case 12514:
            case 12519:
                return sendResponse(res, 503, {
                    success: false,
                    error: 'Service Unavailable',
                    message: 'Database connection unavailable.',
                    code: 'DB_CONNECTION_UNAVAILABLE',
                    operation
                });

            // Session/connection limits
            case 12520:
            case 12505:
                return sendResponse(res, 503, {
                    success: false,
                    error: 'Service Unavailable',
                    message: 'Database connection limit reached.',
                    code: 'DB_CONNECTION_LIMIT',
                    operation
                });

            // Timeout errors
            case 1013:
                return sendResponse(res, 504, {
                    success: false,
                    error: 'Gateway Timeout',
                    message: 'Database operation timed out.',
                    code: 'DB_OPERATION_TIMEOUT',
                    operation
                });

            // Default Oracle error
            default:
                return sendResponse(res, 500, {
                    success: false,
                    error: 'Database Error',
                    message: `Oracle Error ${error.errorNum}: ${error.message}`,
                    code: 'ORACLE_ERROR',
                    operation,
                    errorNumber: error.errorNum
                });
        }
    }

    static handleApplicationError(error, res, operation = 'application operation') {
        console.error(`Application Error during ${operation}:`, error);

        if (error.message) {
            if (error.message.includes('ORA-20001')) {
                return sendResponse(res, 409, {
                    success: false,
                    error: 'Conflict',
                    message: 'Username already exists.',
                    code: 'USERNAME_EXISTS',
                    operation
                });
            }

            if (error.message.includes('ORA-20002')) {
                return sendResponse(res, 409, {
                    success: false,
                    error: 'Conflict',
                    message: 'Email address already exists.',
                    code: 'EMAIL_EXISTS',
                    operation
                });
            }

            if (error.message.includes('ORA-20003')) {
                return sendResponse(res, 400, {
                    success: false,
                    error: 'Bad Request',
                    message: 'Invalid email format.',
                    code: 'INVALID_EMAIL',
                    operation
                });
            }

            if (error.message.includes('ORA-20004')) {
                return sendResponse(res, 400, {
                    success: false,
                    error: 'Bad Request',
                    message: 'Password does not meet security requirements.',
                    code: 'WEAK_PASSWORD',
                    operation
                });
            }

            if (error.message.includes('bcrypt')) {
                return sendResponse(res, 500, {
                    success: false,
                    error: 'Password Processing Error',
                    message: 'Error occurred during password processing.',
                    code: 'PASSWORD_HASH_ERROR',
                    operation
                });
            }

            if (error.message.includes('JWT') || error.message.includes('token')) {
                return sendResponse(res, 401, {
                    success: false,
                    error: 'Authentication Error',
                    message: 'Invalid or expired authentication token.',
                    code: 'TOKEN_ERROR',
                    operation
                });
            }
        }

        return this.handleGenericError(error, res, operation);
    }

    static handleConnectionError(error, res, operation = 'connection operation') {
        console.error(`Connection Error during ${operation}:`, error);

        switch (error.code) {
            case 'ECONNREFUSED':
                return sendResponse(res, 503, {
                    success: false,
                    error: 'Service Unavailable',
                    message: 'Database connection refused.',
                    code: 'DB_CONNECTION_REFUSED',
                    operation
                });

            case 'ETIMEDOUT':
                return sendResponse(res, 504, {
                    success: false,
                    error: 'Gateway Timeout',
                    message: 'Operation timed out.',
                    code: 'CONNECTION_TIMEOUT',
                    operation
                });

            case 'ENOTFOUND':
                return sendResponse(res, 503, {
                    success: false,
                    error: 'Service Unavailable',
                    message: 'Database host not found.',
                    code: 'DB_HOST_NOT_FOUND',
                    operation
                });

            case 'ECONNRESET':
                return sendResponse(res, 503, {
                    success: false,
                    error: 'Service Unavailable',
                    message: 'Connection was reset.',
                    code: 'CONNECTION_RESET',
                    operation
                });

            default:
                return this.handleGenericError(error, res, operation);
        }
    }

    static handleGenericError(error, res, operation = 'operation') {
        console.error(`Generic Error during ${operation}:`, error);

        return sendResponse(res, 500, {
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'An unexpected error occurred.',
            code: 'INTERNAL_ERROR',
            operation
        });
    }

    static handleError(error, res, operation = 'operation') {
        if (res.headersSent) {
            console.error('Response already sent, cannot handle error:', error);
            return;
        }

        if (error.errorNum) {
            return this.handleOracleError(error, res, operation);
        } else if (error.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(error.code)) {
            return this.handleConnectionError(error, res, operation);
        } else if (error.message && (error.message.includes('ORA-') || error.message.includes('bcrypt') || error.message.includes('JWT'))) {
            return this.handleApplicationError(error, res, operation);
        } else {
            return this.handleGenericError(error, res, operation);
        }
    }

    static handleValidationError(validationErrors, res, operation = 'validation') {
        return sendResponse(res, 400, {
            success: false,
            error: 'Validation Error',
            message: 'Input validation failed.',
            code: 'VALIDATION_ERROR',
            operation,
            validationErrors
        });
    }

    static handleAuthorizationError(res, message = 'Access denied', operation = 'authorization') {
        return sendResponse(res, 403, {
            success: false,
            error: 'Forbidden',
            message,
            code: 'ACCESS_DENIED',
            operation
        });
    }

    static handleRateLimitError(res, operation = 'rate limiting') {
        return sendResponse(res, 429, {
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            operation
        });
    }
}

module.exports = ErrorHandler;
