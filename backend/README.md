# UniFlow Backend

A well-structured Express.js server with proper error handling, logging, and organized folder structure.

## 🚀 Features

- **Express.js** server with proper middleware setup
- **Structured folder organization** (controllers, routes, models, middleware)
- **Error handling middleware** with custom error classes
- **Logging middleware** for requests and errors
- **Security middleware** (Helmet, CORS)
- **Environment configuration** with dotenv
- **Health check endpoints**
- **RESTful API design**

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── config.js          # Configuration settings
│   ├── controllers/
│   │   ├── healthController.js # Health check endpoints
│   │   └── userController.js   # User CRUD operations
│   ├── middleware/
│   │   ├── asyncHandler.js     # Async error handling
│   │   ├── errorHandler.js     # Global error handler
│   │   └── logger.js           # Request logging
│   ├── models/
│   │   └── User.js             # User model (placeholder)
│   ├── routes/
│   │   ├── healthRoutes.js     # Health check routes
│   │   └── userRoutes.js       # User routes
│   ├── utils/
│   │   ├── ApiError.js         # Custom error class
│   │   └── ApiResponse.js      # Standard response format
│   └── app.js                  # Express app configuration
├── logs/                       # Log files
├── .env                        # Environment variables
├── .gitignore                  # Git ignore file
├── package.json                # NPM dependencies
└── server.js                   # Server entry point
```

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy .env file and update values as needed
```

3. Start the development server:
```bash
npm run dev
```

4. Start the production server:
```bash
npm start
```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system information

### Users (Demo CRUD)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🔧 Environment Variables

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/uniflow
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
LOG_FILE=app.log
```

## 📝 Logging

The application includes comprehensive logging:
- **Request logs**: All HTTP requests are logged to `logs/requests.log`
- **Error logs**: All errors are logged to `logs/error.log`
- **Access logs**: Morgan HTTP logs to `logs/access.log`

## 🛡️ Security

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configurable cross-origin resource sharing
- **Input validation**: Basic validation in controllers
- **Error handling**: Prevents sensitive information leakage

## 🚦 Error Handling

The application includes robust error handling:
- Custom `ApiError` class for operational errors
- Global error handler middleware
- Async error handling wrapper
- Proper HTTP status codes
- Development vs production error responses

## 🔄 Next Steps

1. **Database Integration**: Replace in-memory storage with MongoDB
2. **Authentication**: Implement JWT-based authentication
3. **Validation**: Add comprehensive input validation (Joi/Yup)
4. **Testing**: Add unit and integration tests
5. **Documentation**: Add Swagger/OpenAPI documentation
6. **Rate Limiting**: Implement API rate limiting
7. **Caching**: Add Redis caching layer

## 📦 Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **morgan**: HTTP request logger
- **dotenv**: Environment variable loader
- **nodemon**: Development auto-restart (dev dependency)

## 🤝 Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
