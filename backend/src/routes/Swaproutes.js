const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');
const Teacher = require("../models/Teacher")
const Timetable = require("../models/Timetable")
const {
  createSwapRequest,
  getIncomingRequests,
  getOutgoingRequests,
  getAdminPendingRequests,
  getSwapById,
  respondToSwap,
  adminAction,
  cancelSwapRequest,
  getDailyOverrides
} = require('../controllers/Swapcontroller');

router.use(auth);

const getTeacherPublishedSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const mongoose = require('mongoose');
 
    // Accept either Teacher._id or User._id
    let teacher;
    if (mongoose.Types.ObjectId.isValid(teacherId)) {
      teacher = await Teacher.findById(teacherId).populate('user', 'name email');
      if (!teacher) {
        // Try by user._id
        teacher = await Teacher.findOne({ user: teacherId }).populate('user', 'name email');
      }
    }
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
 
    // Find all Published timetables containing this teacher
    const timetables = await Timetable.find({
      status: 'Published',
      'schedule.teacher': teacher._id,
    })
      .populate('schedule.Course', 'courseCode name courseType credits')
      .populate('schedule.room',   'roomNumber type')
      .lean();
 
    // Flatten into a list of sessions with their timetableId + scheduleIndex
    const sessions = [];
    timetables.forEach(tt => {
      tt.schedule.forEach((entry, idx) => {
        const entryTeacherId = entry.teacher?._id?.toString() || entry.teacher?.toString();
        if (entryTeacherId !== teacher._id.toString()) return;
 
        sessions.push({
          timetableId:   tt._id,
          scheduleIndex: idx,
          // Session details for the picker UI
          courseCode:    entry.Course?.courseCode || entry.courseCode || '—',
          courseName:    entry.Course?.name       || entry.courseName || '—',
          dayOfWeek:     entry.dayOfWeek,
          startTime:     entry.startTime,
          endTime:       entry.endTime,
          type:          entry.type,          // Theory | Lab
          division:      entry.division || 'A',
          batch:         entry.batch    || null,
          semester:      entry.semester || tt.studentGroup?.semester,
          roomNumber:    entry.room?.roomNumber || entry.roomNumber || '—',
        });
      });
    });
 
    // Sort: Mon→Fri, then by startTime
    const DAY_ORDER = { Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5 };
    sessions.sort((a, b) => {
      const dd = (DAY_ORDER[a.dayOfWeek] || 9) - (DAY_ORDER[b.dayOfWeek] || 9);
      return dd !== 0 ? dd : a.startTime.localeCompare(b.startTime);
    });
 
    res.status(200).json({
      success: true,
      data: {
        teacher: { id: teacher._id, name: teacher.user?.name, email: teacher.user?.email },
        sessions,
      },
    });
  } catch (err) {
    console.error('getTeacherPublishedSchedule error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Teacher endpoints ─────────────────────────────────────────────────────────

// Create a lecture swap request (cross-division supported)
// POST /api/swaps
router.post('/', createSwapRequest);

// Requests sent TO the logged-in teacher
// GET /api/swaps/incoming
// GET /api/swaps/incoming?status=all
router.get('/incoming', getIncomingRequests);

// Requests sent BY the logged-in teacher
// GET /api/swaps/outgoing
// GET /api/swaps/outgoing?status=approved
router.get('/outgoing', getOutgoingRequests);

// ── Admin ─────────────────────────────────────────────────────────────────────

// Admin queue — swaps awaiting admin decision
// GET /api/swaps/admin
// GET /api/swaps/admin?status=all
router.get('/admin', getAdminPendingRequests);
router.get('/overrides/:date', getDailyOverrides);
router.get('/teacher-schedule/:teacherId', getTeacherPublishedSchedule);
// ── Single swap ───────────────────────────────────────────────────────────────

// GET /api/swaps/:id
router.get('/:id', getSwapById);

// Target teacher accepts or rejects
// PATCH /api/swaps/:id/respond
// Body: { action: 'accept'|'reject', note? }
router.patch('/:id/respond', respondToSwap);

// Admin approves or rejects (after both teachers agreed)
// PATCH /api/swaps/:id/admin-action
// Body: { action: 'approve'|'reject', note? }
router.patch('/:id/admin-action', adminAction);

// Requester cancels
// PATCH /api/swaps/:id/cancel
router.patch('/:id/cancel', cancelSwapRequest);


module.exports = router;