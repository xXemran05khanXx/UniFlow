/**
 * Standard API response format
 */
class ApiResponse {
  constructor(success, message, data = null, statuscoursecode = 200) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.statuscoursecode = statuscoursecode;
    this.timestamp = new Date().toISOString();
  }

  static success(message, data = null, statuscoursecode = 200) {
    return new ApiResponse(true, message, data, statuscoursecode);
  }

  static error(message, statuscoursecode = 500) {
    return new ApiResponse(false, message, null, statuscoursecode);
  }
}

module.exports = ApiResponse;
