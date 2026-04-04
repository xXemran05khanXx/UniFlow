/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statuscoursecode, data = null) {
    super(message);
    this.statuscoursecode = statuscoursecode;
    this.isOperational = true;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
