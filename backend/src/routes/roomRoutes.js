/**
 * Room Routes
 * API routes for room management in college
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomStatus,
  toggleRoomAvailability,
  bulkUpdateRooms,
  getRoomStats,
  findAvailableRooms,
  getRoomUtilization,
  scheduleRoomMaintenance,
  getMaintenanceSchedule,
  importRooms,
  exportRooms,
  getRoomTemplate
} = require('../controllers/roomController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Apply authentication to all routes
router.use((req, res, next) => {
  console.log(` Room route hit: ${req.method} ${req.originalUrl}`);
  console.log(` User:`, req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'Not authenticated yet');
  next();
});
router.use(auth);

// Public routes (for authenticated users)
router.get('/available', findAvailableRooms);
router.get('/stats', getRoomStats);
router.get('/utilization', getRoomUtilization);
router.get('/maintenance/schedule', getMaintenanceSchedule);
router.get('/export', exportRooms);
router.get('/template', getRoomTemplate);

// Admin-only routes for bulk operations
router.patch('/bulk', authorize('admin'), bulkUpdateRooms);

// Import route with file upload
router.post('/import', authorize('admin'), upload.single('file'), importRooms);

// Standard CRUD routes
router.route('/')
  .get(getAllRooms) // Staff and above can view
  .post(authorize('admin'), createRoom); // Only admin can create

router.route('/:id')
  .get(getRoomById) // Staff and above can view
  .put(authorize('admin'), updateRoom) 
  .delete(authorize('admin'), deleteRoom); // Only admin can delete

// Status management routes
router.patch('/:id/status', authorize('admin'), toggleRoomStatus);
router.patch('/:id/availability', authorize('admin'), toggleRoomAvailability);

// Maintenance routes
router.post('/:id/maintenance', authorize('admin'), scheduleRoomMaintenance);

module.exports = router;
