const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');
const {
  markAbsent,
  getMyAbsences,
  getAdminAbsences,
  getAbsenceById,
  assignSubstitutes,
  publishSubstituteSchedule,
  getDaySubstituteSchedule,
  rejectAbsence,
} = require('../controllers/Absencecontroller');

router.use(auth);

// ── Teacher endpoints ─────────────────────────────────────────────────────────

// Teacher marks themselves absent for a date
// POST /api/absences
// Body: { absenceDate: '2026-03-10', reason?: '...' }
router.post('/', markAbsent);

// Teacher views their own absence history
// GET /api/absences/my-absences
router.get('/my-absences', getMyAbsences);

// ── Admin endpoints ───────────────────────────────────────────────────────────

// Admin views all pending absence requests
// GET /api/absences/admin
// GET /api/absences/admin?status=all
// GET /api/absences/admin?date=2026-03-10
router.get('/admin', getAdminAbsences);

// ── Public / shared endpoints ─────────────────────────────────────────────────

// View published substitute schedule for a specific date (all users)
// GET /api/absences/schedule/2026-03-10
router.get('/schedule/:date', getDaySubstituteSchedule);

// Get a single absence request
// GET /api/absences/:id
router.get('/:id', getAbsenceById);

// Admin assigns substitute teachers to affected classes
// PATCH /api/absences/:id/assign
// Body: { assignments: [{ classId, substituteTeacherId }], note? }
router.patch('/:id/assign', assignSubstitutes);

// Admin publishes the substitute schedule
// PATCH /api/absences/:id/publish
// Body: { note? }
router.patch('/:id/publish', publishSubstituteSchedule);

// Admin rejects the absence request
// PATCH /api/absences/:id/reject
// Body: { note? }
router.patch('/:id/reject', rejectAbsence);

module.exports = router;