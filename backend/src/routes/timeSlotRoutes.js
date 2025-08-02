/**
 * Time Slot Routes
 * Express router for time slot management endpoints
 */

const express = require('express');
const router = express.Router();
const timeSlotController = require('../controllers/timeSlotController');
const auth = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Basic CRUD operations
router.get('/', timeSlotController.getAllTimeSlots);
router.get('/stats', timeSlotController.getTimeSlotStats);
router.get('/schedules', timeSlotController.getDaySchedules);
router.get('/template', timeSlotController.getTimeSlotTemplate);
router.get('/by-day-type/:dayType', timeSlotController.getTimeSlotsByDayType);
router.get('/check-availability', timeSlotController.checkAvailability);
router.get('/optimal', timeSlotController.getOptimalTimeSlots);
router.get('/next-order/:dayType', timeSlotController.getNextOrder);
router.get('/export', timeSlotController.exportTimeSlots);
router.get('/:id', timeSlotController.getTimeSlotById);

// Post operations
router.post('/', timeSlotController.createTimeSlot);
router.post('/validate', timeSlotController.validateTimeSlot);
router.post('/generate-default', timeSlotController.generateDefaultTimeSlots);
router.post('/import', timeSlotController.uploadMiddleware, timeSlotController.importTimeSlots);
router.post('/copy', timeSlotController.copyTimeSlots);

// Update operations
router.put('/:id', timeSlotController.updateTimeSlot);
router.patch('/:id/status', timeSlotController.toggleTimeSlotStatus);
router.patch('/bulk', timeSlotController.bulkUpdateTimeSlots);
router.patch('/reorder', timeSlotController.reorderTimeSlots);

// Delete operation
router.delete('/:id', timeSlotController.deleteTimeSlot);

module.exports = router;
