const express = require('express');
const {
	createAvailabilityHandler,
	updateAvailabilityHandler,
	getAvailability,
	checkSlot
} = require('../controllers/teacherAvailabilityController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, authorize('admin', 'staff'), createAvailabilityHandler);
router.put('/:id', auth, authorize('admin', 'staff'), updateAvailabilityHandler);
router.get('/:teacherId', auth, authorize('admin', 'staff'), getAvailability);
router.post('/:teacherId/check', auth, authorize('admin', 'staff'), checkSlot);

module.exports = router;
