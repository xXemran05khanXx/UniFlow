// routes/meetingRoutes.js
// Mount in app.js: app.use('/api/meetings', require('./routes/meetingRoutes'));

const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');

const {
  getFreeSlots,
  createMeeting,
  getMeetings,
  cancelMeeting,
  rsvpMeeting
} = require('../controllers/Meeting');
router.use(auth);

// Admin routes
router.get('/free-slots',        getFreeSlots);        // ?teacherIds=id1,id2,id3
router.get('/',                  getMeetings);
router.post('/',                 createMeeting);
router.patch('/:id/cancel',      cancelMeeting);

// Teacher routes
router.patch('/:id/respond',     rsvpMeeting)  // { response: 'accepted'|'declined' }

module.exports = router;