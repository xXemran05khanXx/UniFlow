const Course     = require('../models/Course');
const Room       = require('../models/Room');
const Timetable  = require('../models/Timetable');
const Department = require('../models/Department');
const Teacher    = require('../models/Teacher');

// ─────────────────────────────────────────────────────────────────────────────
// TIME HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Returns true if [s1,e1) and [s2,e2) overlap (even by 1 minute)
function overlaps(s1, e1, s2, e2) {
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE TRACKER
// Tracks booked time ranges per entity per day.
// Used for: teachers, rooms, and each division's students.
//
// Key: "<entityId>_<DayName>"
// Value: [{startTime, endTime, label}]
//
// isFree(id, day, start, end) → true if no existing booking overlaps
// book(id, day, start, end, label) → adds the range
// ─────────────────────────────────────────────────────────────────────────────
class ScheduleTracker {
  constructor(name = '') {
    this._name = name;
    this._map  = new Map();  // "<id>_<day>" → [{start,end,label}]
  }

  _key(id, day) { return `${id}_${day}`; }

  isFree(id, day, startTime, endTime) {
    const booked = this._map.get(this._key(id, day)) || [];
    return !booked.some(b => overlaps(startTime, endTime, b.startTime, b.endTime));
  }

  book(id, day, startTime, endTime, label = '') {
    const k = this._key(id, day);
    if (!this._map.has(k)) this._map.set(k, []);
    this._map.get(k).push({ startTime, endTime, label });
  }

  // Merge another tracker's bookings into this one (used to load existing TTs)
  merge(other) {
    other._map.forEach((slots, key) => {
      if (!this._map.has(key)) this._map.set(key, []);
      this._map.get(key).push(...slots);
    });
  }

  has(id, day) { return this._map.has(this._key(id, day)); }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
class TimetableGenerator {
  constructor() {
    // Theory periods: 6 × 55 min, no overlap with each other
    this.theorySlots = [
      { id: 3,  startTime: '10:20', endTime: '11:15', label: '10:20–11:15', type: 'theory' },
      { id: 4,  startTime: '11:15', endTime: '12:10', label: '11:15–12:10', type: 'theory' },
      { id: 5,  startTime: '12:10', endTime: '13:05', label: '12:10–13:05', type: 'theory' },
      { id: 6,  startTime: '13:50', endTime: '14:45', label: '13:50–14:45', type: 'theory' },
      { id: 7,  startTime: '14:45', endTime: '15:40', label: '14:45–15:40', type: 'theory' },
      { id: 8,  startTime: '15:40', endTime: '16:35', label: '15:40–16:35', type: 'theory' },
    ];

    // Lab blocks: 2 h each.
    // Slot 1 (08:10–10:00) and slot 9 (12:50–14:45) do NOT overlap with any theory slot.
    // Slot 2 (10:20–12:10) overlaps with theory slots 3,4,5 → avoid for labs
    // Slot 10 (14:45–16:35) overlaps with theory slots 7,8 → avoid for labs
    // We keep all 4 but the overlap checker will reject conflicting ones automatically.
    this.labSlots = [
      { id: 1,  startTime: '08:10', endTime: '10:00', label: '08:10–10:00', type: 'lab' },
      { id: 9,  startTime: '12:50', endTime: '14:45', label: '12:50–14:45', type: 'lab' },
      { id: 2,  startTime: '10:20', endTime: '12:10', label: '10:20–12:10', type: 'lab' },
      { id: 10, startTime: '14:45', endTime: '16:35', label: '14:45–16:35', type: 'lab' },
    ];
    // Preferred order: non-overlapping slots first

    this.timeSlots   = [...this.theorySlots, ...this.labSlots];
    this.workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.conflicts   = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════════
  async generateTimetable(options = {}) {
    const {
      academicYear    = new Date().getFullYear(),
      departmentId    = null,
      departmentCode  = null,
      semesters       = null,
      semester        = null,
      divisions       = ['A'],
      respectExisting = true,
    } = options;

    try {
      console.log('\n🚀 TimetableGenerator v2 starting...');

      // Resolve department
      let resolvedDeptId = departmentId;
      if (departmentCode && !departmentId) {
        const dept = await Department.getByCode(departmentCode);
        if (!dept) throw new Error(`Department "${departmentCode}" not found`);
        resolvedDeptId = dept._id;
      }

      const targetSems = semesters ? semesters : semester ? [semester] : null;

      // Load data
      let allCourses    = await this.fetchCourses(resolvedDeptId);
      const allTeachers = await this.fetchTeachers(resolvedDeptId);
      const allRooms    = await this.fetchRooms(resolvedDeptId);

      if (!allTeachers.length) throw new Error('No teachers found.');
      if (!allRooms.length)    throw new Error('No rooms found.');

      if (targetSems) {
        allCourses = allCourses.filter(c => targetSems.includes(c.semester));
        if (!allCourses.length) throw new Error(`No courses for semester(s): ${targetSems.join(', ')}`);
      }

      const divList = Array.isArray(divisions) && divisions.length ? divisions : ['A'];

      console.log(`📊 ${allCourses.length} courses | ${allTeachers.length} teachers | ${allRooms.length} rooms`);
      console.log(`📅 Sems: ${targetSems?.join(',') || 'all'} | Divs: ${divList.join(',')}`);

      // Group courses by semester
      const semGroups = new Map();
      allCourses.forEach(c => {
        const k = c.semester ?? 'unknown';
        if (!semGroups.has(k)) semGroups.set(k, []);
        semGroups.get(k).push(c);
      });

      // ── GLOBAL TRACKERS ────────────────────────────────────────────────────
      // Shared across ALL (sem × div) generations.
      // teacherTracker: teacher can't teach two classes at same time anywhere
      // roomTracker: room can't be used twice at same time
      const teacherTracker = new ScheduleTracker('teacher');
      const roomTracker    = new ScheduleTracker('room');

      // Load existing Published timetables to pre-block slots
      if (respectExisting) {
        await this._loadExisting(teacherTracker, roomTracker, resolvedDeptId, targetSems, divList);
      }

      this.conflicts = [];
      const allResults = [];

      for (const [sem, semCourses] of semGroups) {
        for (const division of divList) {
          const divBatches = ['1', '2', '3'].map(n => `${division}${n}`);

          console.log(`\n${'─'.repeat(60)}`);
          console.log(`  🎓 Sem ${sem} | Div ${division} | Batches: ${divBatches.join(',')}`);

          // Per-division student tracker — scoped to this div only
          // Tracks what time the STUDENTS of this division are busy
          const divTracker = new ScheduleTracker(`div-${division}`);

          const sessions = await this._generateDivision({
            courses: semCourses, teachers: allTeachers, rooms: allRooms,
            division, batches: divBatches, semester: sem,
            teacherTracker, roomTracker, divTracker,
          });

          const metrics = this.calculateQualityMetrics(sessions, semCourses);
          console.log(`  ✅ Sem ${sem} Div ${division}: ${sessions.length} sessions | Score: ${metrics.qualityScore}/100`);

          allResults.push({ semester: sem, division, batches: divBatches, timetable: sessions, metrics });
        }
      }

      const totalSessions = allResults.reduce((s, r) => s + r.timetable.length, 0);
      console.log(`\n🏁 DONE: ${totalSessions} sessions across ${allResults.length} timetable(s) | ${this.conflicts.length} conflict(s)\n`);

      return {
        success:   true,
        results:   allResults,
        conflicts: this.conflicts,
        metadata: {
          semesters:      targetSems || [...semGroups.keys()],
          divisions:      divList,
          academicYear,
          generatedAt:    new Date().toISOString(),
          totalSessions,
          timetableCount: allResults.length,
        },
        timetable: allResults[0]?.timetable || [],
        metrics:   allResults[0]?.metrics   || {},
      };

    } catch (err) {
      console.error('❌ Generation failed:', err.message);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE FOR ONE (semester, division)
  // ═══════════════════════════════════════════════════════════════════════════
  async _generateDivision({ courses, teachers, rooms, division, batches, semester, teacherTracker, roomTracker, divTracker }) {
    const theoryCourses = courses.filter(c => !['Lab', 'Practical'].includes(c.courseType));
    const labCourses    = courses.filter(c =>  ['Lab', 'Practical'].includes(c.courseType));
    let sessions = [];

    // STEP 1: Schedule theory lectures
    sessions = this._scheduleTheory(theoryCourses, teachers, rooms, division, semester, teacherTracker, roomTracker, divTracker);

    // STEP 2: Schedule labs with proper batch rotation
    if (labCourses.length > 0) {
      const labSessions = this._scheduleLabsRotation(labCourses, teachers, rooms, division, batches, semester, teacherTracker, roomTracker, divTracker);
      sessions = [...sessions, ...labSessions];
    }

    return sessions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEORY SCHEDULER
  //
  // Fix 1: Track which (day, slot) the DIVISION already has a class — prevents
  //        two subjects for the same students at the same time.
  // Fix 2: Spread sessions across different days AND different time slots.
  // Fix 3: Use time-range overlap detection, not slot-ID matching.
  // ═══════════════════════════════════════════════════════════════════════════
  _scheduleTheory(courses, teachers, rooms, division, semester, teacherTracker, roomTracker, divTracker) {
    console.log(`\n  📚 Theory [Div ${division}]: ${courses.length} courses`);

    const sessions = [];
    // Track sessions-per-day for this division (for load balancing)
    const dayLoad  = Object.fromEntries(this.workingDays.map(d => [d, 0]));
    // Track which (day, slotId) this division already has occupied
    const divDaySlot = new Set(); // "Day_slotId"
    // Track how many sessions each teacher has been assigned (for load balancing)
    const teacherLoad = new Map(); // teacherId → session count

    // Sort: higher credits/hours first (more constrained → schedule first)
    const sorted = [...courses].sort((a, b) => (b.hoursPerWeek || b.credits || 3) - (a.hoursPerWeek || a.credits || 3));

    for (const course of sorted) {
      const sessionsNeeded = course.hoursPerWeek || course.credits || 3;
      let placed = 0;

      for (let si = 0; si < sessionsNeeded; si++) {
        let scheduled = false;

        // Try days in order of least load for this div
        const days = [...this.workingDays].sort((a, b) => dayLoad[a] - dayLoad[b]);

        for (const day of days) {
          if (scheduled) break;

          // Try each theory slot
          for (const slot of this.theorySlots) {
            const divKey = `${day}_${slot.id}`;

            // ── STUDENT CLASH CHECK ───────────────────────────────────────
            // This division's students cannot be in two places at once.
            if (divDaySlot.has(divKey)) continue;

            // Also check via time-range (handles edge cases)
            if (!divTracker.isFree(division, day, slot.startTime, slot.endTime)) continue;

            // ── TEACHER: find least-loaded qualified + free teacher ──────
            // Sort qualified teachers by how many sessions they already have
            // this week → spreads load evenly, avoids one teacher doing everything
            const qualifiedFree = teachers
              .filter(t =>
                this.canTeachCourse(t, course) &&
                teacherTracker.isFree(t._id.toString(), day, slot.startTime, slot.endTime)
              )
              .sort((a, b) => (teacherLoad.get(a._id.toString()) || 0) - (teacherLoad.get(b._id.toString()) || 0));
            const teacher = qualifiedFree[0];
            if (!teacher) continue;

            // ── ROOM: find suitable + free ────────────────────────────────
            const room = rooms.find(r =>
              this.isRoomSuitable(r, course) &&
              roomTracker.isFree(r._id.toString(), day, slot.startTime, slot.endTime)
            );
            if (!room) continue;

            // ── BOOK ALL THREE ────────────────────────────────────────────
            const label = `${course.courseCode} Div${division}`;
            teacherTracker.book(teacher._id.toString(), day, slot.startTime, slot.endTime, label);
            roomTracker.book(room._id.toString(),       day, slot.startTime, slot.endTime, label);
            divTracker.book(division,                   day, slot.startTime, slot.endTime, label);
            divDaySlot.add(divKey);

            sessions.push(this._buildEntry({ course, teacher, room, dayOfWeek: day, slot, division, batch: null, type: 'theory', semester, sessionNumber: placed + 1 }));
            dayLoad[day]++;
            teacherLoad.set(teacher._id.toString(), (teacherLoad.get(teacher._id.toString()) || 0) + 1);
            placed++;
            scheduled = true;
            console.log(`    ✅ ${course.courseCode} → ${day} ${slot.label} | ${teacher.name}`);
            break;
          }
        }

        if (!scheduled) {
          this.conflicts.push({ type: 'theory_unscheduled', course: course.courseCode, division, session: si + 1, message: `[Div ${division}] Could not schedule ${course.courseCode} session ${si + 1}` });
          console.warn(`    ⚠️  Could not schedule ${course.courseCode} session ${si + 1}`);
        }
      }
    }

    return sessions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAB ROTATION SCHEDULER
  //
  // Correct real-world model:
  //   - Each batch (A1, A2, A3) does each lab ONCE per week
  //   - Batches are STAGGERED — on any given day+slot, at most one batch
  //     is in any given lab
  //   - No batch has two labs on the same day
  //   - No overlap between a batch's lab time and its theory time
  //
  // For L labs and B batches, we need L×B individual (batch, lab, day, slot)
  // assignments. We build a rotation table first, then find resources.
  //
  // Example: 2 labs [L1, L2], 3 batches [A1, A2, A3]:
  //   Rotation:
  //     Day1: A1→L1, A2→L2   (A3 free)
  //     Day2: A2→L1, A3→L2   (A1 free)
  //     Day3: A3→L1, A1→L2   (A2 free)
  //   Result: each batch gets each lab, max 2 batches in labs simultaneously.
  // ═══════════════════════════════════════════════════════════════════════════
  _scheduleLabsRotation(labCourses, teachers, rooms, division, batches, semester, teacherTracker, roomTracker, divTracker) {
    console.log(`\n  🔬 Lab Rotation [Div ${division}]: ${labCourses.map(c => c.courseCode).join(', ')} | Batches: ${batches.join(',')}`);

    const labRooms = rooms.filter(r => r.isLab);
    if (!labRooms.length) {
      console.warn(`  ⚠️  No lab rooms found — cannot schedule labs for Div ${division}`);
      this.conflicts.push({ type: 'no_lab_rooms', division, message: 'No laboratory rooms available' });
      return [];
    }

    const sessions   = [];
    const numLabs    = labCourses.length;
    const numBatches = batches.length;

    // ── RESOLVE QUALIFIED TEACHERS PER LAB ────────────────────────────────────
    const labTeacherPool = labCourses.map(c => this._resolveTeachers(c, teachers));

    // ── PER-BATCH STATE ────────────────────────────────────────────────────────
    const batchDaysUsed = new Map(batches.map(b => [b, new Set()])); // batch → days it has a lab

    // ── REAL-WORLD ROTATION MODEL ─────────────────────────────────────────────
    //
    // RULE 1: Each batch does each lab exactly once per week.
    // RULE 2: On any given day, each lab runs for AT MOST ONE batch from this division
    //         (one teacher per batch per lab, but we don't want the same lab running
    //         for multiple batches of the same division on the same day — it makes
    //         scheduling chaotic and teacher-intensive on a single day).
    // RULE 3: No batch has two labs on the same day.
    //
    // IMPLEMENTATION:
    //   labDayUsed[labIndex] → Set of days this lab has already been scheduled
    //   This enforces Rule 2: once Lab X is scheduled on Monday for ANY batch,
    //   it will not be scheduled again on Monday for another batch.
    //   Batches get different days for the same lab → true rotation.
    //
    // Example: 2 labs (L1, L2), 3 batches (A1, A2, A3):
    //   A1 → L1 on Mon,  L2 on Tue
    //   A2 → L1 on Tue,  L2 on Wed
    //   A3 → L1 on Wed,  L2 on Thu
    //   (or any distribution that satisfies all constraints)

    const labDayUsed = labCourses.map(() => new Set()); // labIndex → Set<day>

    // Process order: interleave labs across batches for best day-spreading
    // [A1→L1, A2→L2, A3→L1, A1→L2, A2→L1, A3→L2]
    const assignments = [];
    for (let bi = 0; bi < numBatches; bi++) {
      for (let li = 0; li < numLabs; li++) {
        assignments.push({ batch: batches[bi], labIdx: li, lab: labCourses[li], candidates: labTeacherPool[li] });
      }
    }

    // Interleave: [A1→L1, A2→L2, A3→L1, A1→L2, A2→L1, A3→L2] for better day spread
    const interleaved = [];
    const perBatchAssignments = batches.map(b => assignments.filter(a => a.batch === b));
    const maxLen = Math.max(...perBatchAssignments.map(a => a.length));
    for (let i = 0; i < maxLen; i++) {
      for (let bi = 0; bi < numBatches; bi++) {
        // Alternate which lab index we start with per batch for even distribution
        const labOffset = bi % numLabs;
        const batchAssigns = perBatchAssignments[bi];
        // Reorder this batch's labs starting from offset
        const reordered = [
          ...batchAssigns.slice(labOffset),
          ...batchAssigns.slice(0, labOffset),
        ];
        if (reordered[i]) interleaved.push(reordered[i]);
        else if (batchAssigns[i]) interleaved.push(batchAssigns[i]);
      }
    }

    // Deduplicate (each batch+lab appears exactly once)
    const seen = new Set();
    const finalAssignments = interleaved.filter(a => {
      const k = `${a.batch}_${a.labIdx}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // ── PLACE EACH (BATCH, LAB) ASSIGNMENT ───────────────────────────────────
    for (const { batch, labIdx, lab, candidates } of finalAssignments) {
      let placed = false;

      for (const day of this.workingDays) {
        if (placed) break;

        // RULE 2: This lab already ran on this day for another batch → skip
        if (labDayUsed[labIdx].has(day)) continue;

        // RULE 3: This batch already has a lab on this day → skip
        if (batchDaysUsed.get(batch)?.has(day)) continue;

        for (const slot of this.labSlots) {
          if (placed) break;

          const s = slot.startTime;
          const e = slot.endTime;

          // Division theory clash: if whole division has theory at this time, skip
          if (!divTracker.isFree(division, day, s, e)) continue;

          // This specific batch already has something at this slot
          if (!divTracker.isFree(`${division}_${batch}`, day, s, e)) continue;

          // Teacher free?
          const teacher = candidates.find(t =>
            teacherTracker.isFree(t._id.toString(), day, s, e)
          );
          if (!teacher) continue;

          // Lab room free?
          const room = labRooms.find(r =>
            roomTracker.isFree(r._id.toString(), day, s, e)
          );
          if (!room) continue;

          // ── BOOK ──────────────────────────────────────────────────────────
          const label = `${lab.courseCode} ${batch}`;
          teacherTracker.book(teacher._id.toString(), day, s, e, label);
          roomTracker.book(room._id.toString(),       day, s, e, label);
          divTracker.book(`${division}_${batch}`,     day, s, e, label);

          labDayUsed[labIdx].add(day);
          batchDaysUsed.get(batch).add(day);

          sessions.push(this._buildEntry({
            course: lab, teacher, room, dayOfWeek: day, slot,
            division, batch, type: 'lab', semester,
            sessionNumber: sessions.length + 1,
          }));
          placed = true;
          console.log(`    ✅ Lab: ${lab.courseCode} Batch ${batch} → ${day} ${slot.label} | ${teacher.name} | Room ${room.roomNumber}`);
        }
      }

      if (!placed) {
        this.conflicts.push({
          type: 'lab_unscheduled', course: lab.courseCode, batch, division,
          message: `[Div ${division}] Could not schedule ${lab.courseCode} for batch ${batch}`,
        });
        console.warn(`    ⚠️  Could not schedule ${lab.courseCode} for batch ${batch} (Div ${division})`);
      }
    }

    return sessions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD EXISTING PUBLISHED TIMETABLES → pre-block global teacher+room slots
  // ═══════════════════════════════════════════════════════════════════════════
  async _loadExisting(teacherTracker, roomTracker, deptId, targetSems, divisions) {
    try {
      const query = { status: 'Published' };
      if (deptId) query['studentGroup.department'] = deptId;
      const existing = await Timetable.find(query).lean();
      if (!existing.length) return;

      const regenerating = new Set();
      if (targetSems) {
        targetSems.forEach(s => divisions.forEach(d => regenerating.add(`${s}_${d}`)));
      }

      let count = 0;
      existing.forEach(tt => {
        const key = `${tt.studentGroup?.semester}_${tt.studentGroup?.division}`;
        if (regenerating.has(key)) return;

        (tt.schedule || []).forEach(entry => {
          if (entry.teacher && entry.startTime && entry.endTime) {
            teacherTracker.book(entry.teacher.toString(), entry.dayOfWeek, entry.startTime, entry.endTime, 'existing');
            count++;
          }
          if (entry.room && entry.startTime && entry.endTime) {
            roomTracker.book(entry.room.toString(), entry.dayOfWeek, entry.startTime, entry.endTime, 'existing');
          }
        });
      });

      console.log(`🔒 Pre-loaded ${count} slots from ${existing.length} existing timetable(s)`);
    } catch (err) {
      console.warn('⚠️  Could not load existing timetables:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════
  async fetchCourses(departmentId = null) {
    try {
      const mongoose = require('mongoose');
      const filter   = {};
      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
        filter.department = departmentId;
      }
      const courses = await Course.find(filter)
        .populate('department',         'code name')
        .populate('qualifiedFaculties', '_id')
        .select('_id courseCode name department semester courseType credits hoursPerWeek qualifiedFaculties');

      return courses.map(c => ({
        _id:               c._id,
        courseCode:        c.courseCode,
        courseName:        c.name,
        department:        c.department?._id || c.department,
        semester:          c.semester,
        courseType:        c.courseType,
        credits:           c.credits,
        hoursPerWeek:      c.hoursPerWeek,
        maxStudents:       60,
        qualifiedFaculties: (c.qualifiedFaculties || []).map(f => f._id),
      }));
    } catch (err) {
      console.error('fetchCourses error:', err);
      return [];
    }
  }

  async fetchTeachers(departmentId = null) {
    try {
      const mongoose = require('mongoose');
      let filter = {};
      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
        filter.$or = [{ primaryDepartment: departmentId }, { allowedDepartments: departmentId }];
      }
      let teachers = await Teacher.find(filter)
        .populate('primaryDepartment',  'code name')
        .populate('allowedDepartments', 'code name')
        .populate('user', '_id name email');

      // Fallback: fetch all if none found for department
      if (!teachers.length && departmentId) {
        console.warn('⚠️  No teachers for dept — fetching all');
        teachers = await Teacher.find({})
          .populate('primaryDepartment',  'code name')
          .populate('allowedDepartments', 'code name')
          .populate('user', '_id name email');
      }

      return teachers.map(t => ({
        _id:                t._id,
        userId:             t.user?._id?.toString() ?? null,
        name:               t.user?.name || t.name || 'Unknown',
        primaryDepartment:  t.primaryDepartment?._id,
        allowedDepartments: (t.allowedDepartments || []).map(d => d._id),
        maxHours:           t.workload?.maxHoursPerWeek || 18,
      }));
    } catch (err) {
      console.error('fetchTeachers error:', err);
      return [];
    }
  }

  async fetchRooms(departmentId = null) {
    try {
      const mongoose = require('mongoose');
      const select   = '_id roomNumber floor capacity type department';
      const mapRoom  = r => ({
        _id:        r._id,
        roomNumber: r.roomNumber,
        capacity:   r.capacity,
        type:       r.type,
        isLab:      r.type === 'laboratory',
        department: r.department?._id,
      });

      // Try dept filter first
      if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
        const deptRooms = await Room.find({
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
          department: departmentId,
        }).populate('department', 'code name').select(select);

        if (deptRooms.length) return deptRooms.map(mapRoom);
        console.warn('⚠️  No rooms for dept — fetching all');
      }

      // Fallback 1: all active
      const active = await Room.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] })
        .populate('department', 'code name').select(select);
      if (active.length) return active.map(mapRoom);

      // Fallback 2: absolutely all
      const all = await Room.find({}).populate('department', 'code name').select(select);
      return all.map(mapRoom);
    } catch (err) {
      console.error('fetchRooms error:', err);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  _resolveTeachers(course, teachers) {
    const qualIds = new Set((course.qualifiedFaculties || []).map(id => id?.toString()));
    if (qualIds.size > 0) {
      const matched = teachers.filter(t =>
        qualIds.has(t._id.toString()) || (t.userId && qualIds.has(t.userId))
      );
      if (matched.length) return matched;
    }
    // Fallback: teachers from same department
    return teachers.filter(t =>
      t.primaryDepartment?.toString() === course.department?.toString() ||
      (t.allowedDepartments || []).some(d => d.toString() === course.department?.toString())
    );
  }

  canTeachCourse(teacher, course) {
    // Check qualifiedFaculties (User._id or Teacher._id)
    if (course.qualifiedFaculties?.length > 0) {
      const ids = course.qualifiedFaculties.map(id => id?.toString());
      if (teacher.userId && ids.includes(teacher.userId)) return true;
      if (ids.includes(teacher._id.toString())) return true;
    }
    // Fallback: department match
    if (teacher.primaryDepartment && course.department) {
      if (teacher.primaryDepartment.toString() === course.department.toString()) return true;
      return (teacher.allowedDepartments || []).some(d => d.toString() === course.department?.toString());
    }
    return true; // if no constraints set, any teacher can teach
  }

  isRoomSuitable(room, course) {
    if (course.courseType === 'Lab' || course.courseType === 'Practical') return room.isLab;
    if (course.courseType === 'Theory')   return ['classroom', 'lecture_hall', 'seminar_room'].includes(room.type);
    if (course.courseType === 'Tutorial') return !room.isLab;
    return !room.isLab; // default: non-lab room for theory
  }

  _buildEntry({ course, teacher, room, dayOfWeek, slot, division, batch, type, semester, sessionNumber }) {
    return {
      id:          `${course.courseCode}-${batch || division}-${dayOfWeek}-${slot.id}-${sessionNumber}`,
      course:      course._id,
      subject:     course._id,
      courseCode:  course.courseCode,
      courseName:  course.courseName,
      teacher:     teacher._id,
      teacherId:   teacher._id,
      teacherName: teacher.name,
      room:        room._id,
      roomId:      room._id,
      roomNumber:  room.roomNumber,
      dayOfWeek,
      timeSlot:    { id: slot.id, startTime: slot.startTime, endTime: slot.endTime, label: slot.label },
      startTime:   slot.startTime,
      endTime:     slot.endTime,
      semester,
      division,
      batch:       batch || null,
      department:  course.department,
      courseType:  course.courseType,
      credits:     course.credits,
      maxStudents: course.maxStudents || 60,
      type,
      courseMeta: {
        code:    course.courseCode,
        name:    course.courseName,
        credits: course.credits,
        duration: course.hoursPerWeek,
      },
    };
  }

  calculateQualityMetrics(sessions, courses) {
    const scheduled = new Set(sessions.map(s => s.courseCode)).size;
    const total     = courses.length;
    const rate      = total > 0 ? (scheduled / total) * 100 : 0;
    const divConflicts = this._findDivisionConflicts(sessions);
    const score = Math.max(0, rate - this.conflicts.length * 3 - divConflicts * 10);
    return {
      qualityScore:        Math.round(score),
      schedulingRate:      Math.round(rate),
      totalSessions:       sessions.length,
      totalConflicts:      this.conflicts.length,
      divisionConflicts:   divConflicts,
      coursesScheduled:    scheduled,
      totalCourses:        total,
    };
  }

  _findDivisionConflicts(sessions) {
    // Check if any two sessions for same division have overlapping times
    let clashes = 0;
    const byCourse = {};
    sessions.filter(s => s.type === 'theory').forEach(s => {
      const k = `${s.division}_${s.dayOfWeek}`;
      if (!byCourse[k]) byCourse[k] = [];
      byCourse[k].push(s);
    });
    Object.values(byCourse).forEach(daySlots => {
      for (let i = 0; i < daySlots.length; i++) {
        for (let j = i + 1; j < daySlots.length; j++) {
          if (overlaps(daySlots[i].startTime, daySlots[i].endTime, daySlots[j].startTime, daySlots[j].endTime)) {
            clashes++;
          }
        }
      }
    });
    return clashes;
  }
}

module.exports = TimetableGenerator;