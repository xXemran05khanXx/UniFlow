# Teacher Model Consolidation

## Overview
Successfully consolidated the separate `Teacher` model into the `User` model, making teachers a user role rather than a separate entity. This simplifies the data model and eliminates the need to maintain user-teacher relationships.

## Changes Made

### 1. User Model (`backend/src/models/User.js`)
Added teacher-specific fields to the User schema:
- `employeeId` (String, required for teachers)
- `designation` (String, required for teachers, enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Assistant'])
- `qualifications` (Array of Strings, e.g., ['Ph.D.', 'M.Tech', 'B.Tech'])
- `staffRoom` (String)
- `workload` (Object with `maxHoursPerWeek` and `minHoursPerWeek`)
- `availability` (Array of availability objects)
- `allowedDepartments` (Array of Department ObjectId references)
- `performanceRating` (Number, 0-5)

All teacher fields have conditional validation:
- `employeeId` and `designation` are required when `role === 'teacher'`
- `department` is required for both students and teachers
- `semester` is required for students

### 2. User Controller (`backend/src/controllers/userController.js`)
Updated to handle teacher-specific fields:
- **createUser**: Extracts and validates teacher fields, converts department names to ObjectIds
- **updateUser**: Handles teacher field updates
- **deleteUser**: Removed Teacher model deletion logic
- **Manual Population**: Implemented manual department population to prevent cast errors

### 3. Data Management Routes (`backend/src/routes/dataManagement.js`)
- **GET /teachers**: Changed from `Teacher.find()` to `User.find({ role: 'teacher' })`
- **POST /teachers**: Creates User directly with all teacher fields, includes password hashing
- **CSV Upload**: Updated to create User records instead of Teacher records
- Removed Teacher model import

### 4. Timetable Generator (`backend/src/services/timetable/TimetableGenerator.js`)
- Removed Teacher model import
- Updated `fetchTeachers()` to use `User.find({ role: 'teacher' })`
- Changed field references:
  - `teacher.primaryDepartment` → `teacher.department`
  - `teacher.user.name` → `teacher.name`
  - Population now uses 'department' instead of 'primaryDepartment'

### 5. Department Controller (`backend/src/controllers/departmentController.js`)
- Removed Teacher model import
- Updated teacher count query to use `User.countDocuments({ role: 'teacher', ... })`

### 6. Models Index (`backend/src/models/index.js`)
- Removed Teacher model export

## Database Migration Notes

### Existing Teacher Records
If you have existing Teacher collection data, you'll need to migrate it:

```javascript
const User = require('./src/models/User');
const Teacher = require('./src/models/Teacher');
const bcrypt = require('bcryptjs');

async function migrateTeachersToUsers() {
  const teachers = await Teacher.find().populate('user');
  
  for (const teacher of teachers) {
    if (teacher.user) {
      // Update existing user with teacher fields
      await User.findByIdAndUpdate(teacher.user._id, {
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        qualifications: teacher.qualifications || [],
        department: teacher.primaryDepartment,
        allowedDepartments: teacher.allowedDepartments || [],
        workload: teacher.workload,
        availability: teacher.availability,
        performanceRating: teacher.performanceRating
      });
    } else {
      // Create new user if teacher has no associated user
      const hashedPassword = await bcrypt.hash('temp123', 10);
      await User.create({
        name: teacher.name,
        email: `${teacher.employeeId}@example.com`,
        role: 'teacher',
        password: hashedPassword,
        employeeId: teacher.employeeId,
        designation: teacher.designation || 'Lecturer',
        qualifications: teacher.qualifications || [],
        department: teacher.primaryDepartment,
        allowedDepartments: teacher.allowedDepartments || [],
        workload: teacher.workload,
        availability: teacher.availability,
        performanceRating: teacher.performanceRating
      });
    }
  }
  
  console.log(`Migrated ${teachers.length} teachers to User model`);
}
```

### Drop Teacher Collection (Optional)
After successful migration and testing:
```javascript
// In MongoDB shell or script
db.teachers.drop();
```

## API Changes

### Teacher Endpoints
All teacher endpoints now work with the User model:

**Get All Teachers**
```
GET /api/data/teachers
Response: Array of User objects with role='teacher'
```

**Create Teacher**
```
POST /api/data/teachers
Body: {
  name: "John Doe",
  email: "john@example.com",
  employeeId: "EMP001",
  designation: "Lecturer",
  department: "Computer Science", // Converts to ObjectId
  qualifications: ["M.Tech", "B.Tech"],
  allowedDepartments: ["Computer Science", "Information Technology"],
  workload: {
    maxHoursPerWeek: 20,
    minHoursPerWeek: 0
  }
}
```

## Frontend Updates Needed

### Update Teacher Interfaces
```typescript
// Before
interface Teacher {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  employeeId: string;
  primaryDepartment: Department;
  // ...
}

// After
interface Teacher extends User {
  employeeId: string;
  designation: string;
  department: Department;
  allowedDepartments: Department[];
  // ... other teacher fields
}
```

### Update API Calls
- Remove nested `user` references: `teacher.user.name` → `teacher.name`
- Update department field: `teacher.primaryDepartment` → `teacher.department`

## Benefits

1. **Simplified Data Model**: Single source of truth for all users
2. **Easier Authentication**: Teachers use the same auth flow as other users
3. **Reduced Redundancy**: No need to maintain user-teacher relationships
4. **Better Role Management**: Consistent role-based access control
5. **Cleaner Queries**: No complex joins between User and Teacher collections

## Testing Checklist

- [ ] Teacher creation via API
- [ ] Teacher fetching with department population
- [ ] Teacher updates
- [ ] Teacher deletion
- [ ] Timetable generation with new teacher structure
- [ ] Department statistics showing correct teacher counts
- [ ] CSV teacher upload
- [ ] Frontend teacher management pages
- [ ] Authentication and authorization for teachers

## Rollback Plan

If issues arise, the Teacher model file still exists at `backend/src/models/Teacher.js`. To rollback:

1. Restore Teacher model import in affected files
2. Revert queries from `User.find({ role: 'teacher' })` to `Teacher.find()`
3. Restore user-teacher relationship handling
4. Remove teacher fields from User schema

## Notes

- The Teacher model file (`Teacher.js`) has been kept for reference but is no longer used
- All script files in `backend/scripts/` that reference Teacher model are legacy and should be updated or removed
- Consider cleaning up old migration scripts once everything is stable
