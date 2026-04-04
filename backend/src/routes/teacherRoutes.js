const express = require('express');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');
const router = express.Router();
const {
  createTeacher,
  getTeachers,
  getTeacher,
  getMySchedule,          // ← new
  getTeacherScheduleById,
  getMyDailySchedule
} = require('../controllers/TeacherController');
const { auth } = require('../middleware/auth');

router.use(auth); // all teacher routes require login

router.post('/',    createTeacher);
router.get('/',     getTeachers);

const { computeFreeSlots } = require('../services/Freeslot');

router.get('/my-free-slots', async (req, res) => {
  try {
    const teacherDoc = await Teacher.findOne({ user: req.user._id });

    if (!teacherDoc) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const data = await computeFreeSlots([teacherDoc._id.toString()]);

    res.json({
      success: true,
      teacherId: teacherDoc._id,
      freeSlots: data,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/free-slots', async (req, res) => {
  try {
    const { teacherIds } = req.query;

    if (!teacherIds) {
      return res.status(400).json({ success: false, message: 'teacherIds required' });
    }

    const ids = teacherIds
      .split(',')
      .map(id => id.trim())
      .filter(id => mongoose.Types.ObjectId.isValid(id));

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid teacher IDs provided'
      });
    }

    const data = await computeFreeSlots(ids);

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/common-free-slot', async (req, res) => {
  try {
    const { teacherIds } = req.query;

    if (!teacherIds) {
      return res.status(400).json({
        success: false,
        message: 'teacherIds required'
      });
    }

    const ids = teacherIds
      .split(',')
      .map(id => id.trim())
      .filter(id => mongoose.Types.ObjectId.isValid(id));

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid teacher IDs provided'
      });
    }

    const data = await computeFreeSlots(ids);

    const commonSlots = [];

    Object.entries(data).forEach(([day, slots]) => {
      slots.forEach(slot => {
        if (slot.allFree) {
          commonSlots.push({
            day,
            start: slot.start,
            end: slot.end,
          });
        }
      });
    });

    // ✅ SORT
    commonSlots.sort((a, b) => {
      const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

      if (a.day !== b.day) {
        return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      }

      return a.start.localeCompare(b.start);
    });

    res.json({
      success: true,
      commonSlots,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
// ── Personal schedule endpoints ───────────────────────────────────────────────
// Teacher hits this to see their own weekly timetable
// GET /api/teachers/my-schedule
// GET /api/teachers/my-schedule?status=Published   (default)
// GET /api/teachers/my-schedule?status=any         (Draft + Published)
// GET /api/teachers/my-schedule?academicYear=2025
router.get('/my-schedule', getMySchedule);

// Add this ABOVE router.get('/:id', ...) so it doesn't confuse "daily-schedule" with an ID
router.get('/daily-schedule/:date', getMyDailySchedule);
// Admin hits this to view any teacher's schedule
// GET /api/teachers/:id/schedule
router.get('/:id/schedule', getTeacherScheduleById);

router.get('/:id', getTeacher);

module.exports = router;