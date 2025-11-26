/**
 * Shared Constants for UniFlow Project
 * This file contains all the standardized constants used across the project
 * to ensure consistency in departments, semesters, and other core data.
 */

// ============ DEPARTMENT CONSTANTS ============
export const DEPARTMENTS = {
  CS: 'Computer Science',
  IT: 'Information Technology', 
  FE: 'First Year'
} as const;

export const DEPARTMENT_CODES = {
  'Computer Science': 'CS',
  'Information Technology': 'IT',
  'First Year': 'FE'
} as const;

// Array of all departments for use in dropdowns and validation
export const DEPARTMENT_LIST = Object.values(DEPARTMENTS);

// Department type for TypeScript
export type DepartmentType = typeof DEPARTMENTS[keyof typeof DEPARTMENTS];

// ============ SEMESTER CONSTANTS ============
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const YEARS = [1, 2, 3, 4] as const;

// Semester type for TypeScript
export type SemesterType = typeof SEMESTERS[number];
export type YearType = typeof YEARS[number];

// ============ ROOM TYPES ============
export const ROOM_TYPES = {
  THEORY_CLASSROOM: 'Theory Classroom',
  COMPUTER_LAB: 'Computer Lab',
  IT_LAB: 'IT Lab', 
  SEMINAR_HALL: 'Seminar Hall',
  AUDITORIUM: 'Auditorium'
} as const;

export const ROOM_TYPE_LIST = Object.values(ROOM_TYPES);
export type RoomType = typeof ROOM_TYPES[keyof typeof ROOM_TYPES];

// ============ COURSE TYPES ============
export const COURSE_TYPES = {
  THEORY: 'Theory',
  PRACTICAL: 'Practical',
  TUTORIAL: 'Tutorial'
} as const;

export const COURSE_TYPE_LIST = Object.values(COURSE_TYPES);
export type CourseType = typeof COURSE_TYPES[keyof typeof COURSE_TYPES];

// ============ TEACHER DESIGNATIONS ============
export const TEACHER_DESIGNATIONS = {
  PROFESSOR: 'Professor',
  ASSOCIATE_PROFESSOR: 'Associate Professor', 
  ASSISTANT_PROFESSOR: 'Assistant Professor',
  LECTURER: 'Lecturer'
} as const;

export const TEACHER_DESIGNATION_LIST = Object.values(TEACHER_DESIGNATIONS);
export type TeacherDesignationType = typeof TEACHER_DESIGNATIONS[keyof typeof TEACHER_DESIGNATIONS];

// ============ UTILITY FUNCTIONS ============

/**
 * Get semester by year and part (1st or 2nd semester of the year)
 * @param year - Academic year (1-4)
 * @param part - Semester part (1 or 2)
 * @returns Semester number (1-8)
 */
export function getSemesterByYear(year: YearType, part: 1 | 2): SemesterType {
  return ((year - 1) * 2 + part) as SemesterType;
}

/**
 * Get year from semester number
 * @param semester - Semester number (1-8)
 * @returns Academic year (1-4)
 */
export function getYearFromSemester(semester: SemesterType): YearType {
  return Math.ceil(semester / 2) as YearType;
}

/**
 * Check if a semester is odd (1st semester of year) or even (2nd semester of year)
 * @param semester - Semester number (1-8)
 * @returns true if odd semester, false if even
 */
export function isOddSemester(semester: SemesterType): boolean {
  return semester % 2 === 1;
}

/**
 * Get department code from department name
 * @param departmentName - Full department name
 * @returns Department code (CS, IT, FE)
 */
export function getDepartmentCode(departmentName: DepartmentType): string {
  return DEPARTMENT_CODES[departmentName];
}

/**
 * Validate if a value is a valid department
 * @param value - Value to check
 * @returns true if valid department
 */
export function isValidDepartment(value: string): value is DepartmentType {
  return DEPARTMENT_LIST.includes(value as DepartmentType);
}

/**
 * Validate if a value is a valid semester
 * @param value - Value to check
 * @returns true if valid semester
 */
export function isValidSemester(value: number): value is SemesterType {
  return SEMESTERS.includes(value as SemesterType);
}