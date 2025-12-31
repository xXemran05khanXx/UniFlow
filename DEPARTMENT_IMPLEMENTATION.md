# Department Management System - Implementation Guide

## Overview

This document describes the implementation of the central Department Management system in UniFlow, which introduces a unified approach to managing departments (IT, CS, FE) across the entire application.

## Changes Summary

### 1. New Department Model

**File:** `backend/src/models/Department.js`

A new central Department model has been created with the following structure:

```javascript
{
  code: String (enum: ["IT", "CS", "FE"]),
  name: String,
  description: String (optional),
  isActive: Boolean (default: true)
}
```

**Default Departments:**
- **IT** → Information Technology
- **CS** → Computer Science  
- **FE** → First Year Engineering (combined for semester 1-2 students)

### 2. Model Updates

All models now use ObjectId references to the Department model instead of string-based department fields:

#### User Model (`backend/src/models/User.js`)
- Added: `department` (ObjectId ref to Department)
- Required for students and teachers, optional for admins

#### Teacher Model (`backend/src/models/Teacher.js`)
- Added: `primaryDepartment` (ObjectId ref to Department, required)
- Added: `allowedDepartments` (Array of ObjectIds for cross-teaching)
- Legacy field `department` (string) retained for backward compatibility
- New methods:
  - `canTeachInDepartment(departmentId)` - Check if teacher can teach in a department
  - `getAllowedDepartmentIds()` - Get all departments teacher can teach

#### Course/Subject Models
- Updated: `department` from String to ObjectId ref
- Added: `departmentLegacy` (string) for backward compatibility

#### Room Model
- Updated: `department` from String to ObjectId ref
- Added: `departmentLegacy` (string) for backward compatibility

### 3. API Endpoints

**New Routes:** `/api/departments`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/departments` | Public | Get all departments (with optional isActive filter) |
| GET | `/api/departments/:id` | Public | Get department by ID |
| GET | `/api/departments/code/:code` | Public | Get department by code (IT/CS/FE) |
| GET | `/api/departments/:id/stats` | Public | Get department statistics |
| POST | `/api/departments` | Admin | Create new department |
| PUT | `/api/departments/:id` | Admin | Update department |
| DELETE | `/api/departments/:id` | Admin | Deactivate department |
| PATCH | `/api/departments/:id/activate` | Admin | Activate department |

### 4. Timetable Generation Updates

**File:** `backend/src/services/timetable/TimetableGenerator.js`

The timetable generation logic now supports department-based filtering:

```javascript
// New parameters
{
  departmentId: ObjectId,      // Filter by department ID
  departmentCode: 'IT'|'CS'|'FE',  // Filter by department code
  semester: 1-8                // Filter by semester
}
```

**Key Changes:**
- `fetchCourses(departmentId)` - Fetches courses for specific department
- `fetchTeachers(departmentId)` - Fetches teachers who can teach in that department
- `fetchRooms(departmentId)` - Fetches rooms belonging to that department
- `canTeachCourse(teacher, course)` - Updated to check primaryDepartment and allowedDepartments

**Cross-Teaching Support:**
- Teachers with FE as primary department can teach IT and CS courses
- Teachers can have multiple allowedDepartments for cross-teaching
- Conflict detection prevents teachers from being scheduled outside their allowed departments

### 5. Migration Script

**File:** `backend/scripts/migrate-departments.js`

This script performs the following operations:

1. **Seeds default departments** (IT, CS, FE) if they don't exist
2. **Migrates existing data:**
   - Users: Links to department ObjectId
   - Teachers: Sets primaryDepartment and allowedDepartments
   - Courses: Converts department string to ObjectId reference
   - Subjects: Converts department string to ObjectId reference
   - Rooms: Converts department string to ObjectId reference

**How to run:**
```bash
node backend/scripts/migrate-departments.js
```

**Important:** Run this script ONCE after deploying the changes to migrate existing data.

### 6. Frontend Updates

#### New Types (`frontend/src/types/index.ts`)

```typescript
interface Department {
  _id: string;
  code: 'IT' | 'CS' | 'FE';
  name: 'Information Technology' | 'Computer Science' | 'First Year Engineering';
  description?: string;
  isActive: boolean;
  studentCount?: number;
  teacherCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  primaryDepartment: string | Department;
  allowedDepartments?: (string | Department)[];
  // ... other fields
}
```

#### New Service (`frontend/src/services/departmentService.ts`)

Provides API client methods for department operations:
- `getAllDepartments()`
- `getActiveDepartments()`
- `getDepartmentById(id)`
- `getDepartmentByCode(code)`
- `createDepartment(data)`
- `updateDepartment(id, data)`
- `getDepartmentStats(id)`
- Helper methods for department name/code conversion

#### New Component (`frontend/src/components/common/DepartmentSelect.tsx`)

Reusable dropdown component for selecting departments:

```tsx
<DepartmentSelect
  value={selectedDepartmentId}
  onChange={(id, dept) => setDepartment(id)}
  label="Department"
  required={true}
  activeOnly={true}
/>
```

### 7. Controller Updates

#### Timetable Controller
Updated to accept department filtering parameters:
- `departmentId` - Department ObjectId
- `departmentCode` - Department code (IT/CS/FE)
- `semester` - Semester number

#### Subject/Room Controllers
Already support department filtering via query parameters - no changes needed.

## Backward Compatibility

All changes are backward-compatible:

1. **Legacy Fields:** `departmentLegacy` string fields retained in models
2. **Migration Support:** Existing string-based departments automatically migrated
3. **Flexible Types:** Frontend types support both `string` and `Department` objects
4. **Graceful Handling:** Controllers handle both old and new department formats

## Usage Examples

### Backend: Generate Department-Specific Timetable

```javascript
// Generate timetable for IT department, semester 3
POST /api/timetable/generate
{
  "departmentCode": "IT",
  "semester": 3,
  "algorithm": "greedy",
  "academicYear": 2024
}
```

### Backend: Get Department Statistics

```javascript
GET /api/departments/:id/stats

Response:
{
  "department": {
    "code": "IT",
    "name": "Information Technology",
    "isActive": true
  },
  "counts": {
    "students": 120,
    "teachers": 15,
    "courses": 24,
    "subjects": 24,
    "rooms": 8
  }
}
```

### Frontend: Use DepartmentSelect Component

```tsx
import { DepartmentSelect } from '@/components/common/DepartmentSelect';

function MyForm() {
  const [departmentId, setDepartmentId] = useState('');

  return (
    <DepartmentSelect
      value={departmentId}
      onChange={(id) => setDepartmentId(id)}
      label="Select Department"
      required
    />
  );
}
```

## Testing Checklist

After deployment, verify:

- [ ] Migration script runs successfully
- [ ] All 3 departments (IT, CS, FE) are created
- [ ] Existing users/teachers/courses/rooms are migrated
- [ ] `/api/departments` endpoints work correctly
- [ ] Timetable generation filters by department
- [ ] Teachers can be assigned to multiple departments
- [ ] FE timetable generation includes both IT and CS teachers
- [ ] Room allocation respects department boundaries
- [ ] Frontend dropdowns display departments correctly
- [ ] No existing features are broken

## Rollback Plan

If issues occur:

1. **Database:** Keep `departmentLegacy` fields intact
2. **Code:** Switch controllers back to using legacy string fields
3. **Frontend:** Update types to use string instead of Department objects

## Future Enhancements

Potential improvements:

1. **Department-based permissions** - Restrict users to their departments
2. **Department analytics dashboard** - Visual stats per department
3. **Department-specific settings** - Custom configurations per department
4. **Multi-department students** - Support for students in multiple departments
5. **Department hierarchy** - Sub-departments or specializations

## Support

For issues or questions:
1. Check migration script logs
2. Verify database indexes are created
3. Review API responses for error messages
4. Check frontend console for errors

---

**Last Updated:** December 5, 2025  
**Version:** 1.0.0
