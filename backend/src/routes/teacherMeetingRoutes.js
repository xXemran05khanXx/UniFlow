const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { createMeetingHandler, getMeetingsHandler } = require('../controllers/teacherMeetingController');

const router = express.Router();

router.post('/', auth, authorize('admin', 'staff'), createMeetingHandler);
router.get('/:teacherId', auth, authorize('admin', 'staff'), getMeetingsHandler);

module.exports = router;
