/**
 * Room Routes
 * API routes for room management in Mumbai University engineering college
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
const { protect, restrictTo } = require('../middleware/auth');

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
router.use(protect);

// Public routes (for authenticated users)
router.get('/available', findAvailableRooms);
router.get('/stats', getRoomStats);
router.get('/utilization', getRoomUtilization);
router.get('/maintenance/schedule', getMaintenanceSchedule);
router.get('/export', exportRooms);
router.get('/template', getRoomTemplate);

// Admin-only routes for bulk operations
router.patch('/bulk', restrictTo('admin'), bulkUpdateRooms);

// Import route with file upload
router.post('/import', restrictTo('admin'), upload.single('file'), importRooms);

// Standard CRUD routes
router.route('/')
  .get(getAllRooms) // Staff and above can view
  .post(restrictTo('admin'), createRoom); // Only admin can create

router.route('/:id')
  .get(getRoomById) // Staff and above can view details
  .put(restrictTo('admin'), updateRoom) // Only admin can update
  .delete(restrictTo('admin'), deleteRoom); // Only admin can delete

// Status management routes
router.patch('/:id/status', restrictTo('admin'), toggleRoomStatus);
router.patch('/:id/availability', restrictTo('admin'), toggleRoomAvailability);

// Maintenance routes
router.post('/:id/maintenance', restrictTo('admin'), scheduleRoomMaintenance);

module.exports = router;
