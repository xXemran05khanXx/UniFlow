/**
 * teacherService.ts
 * All API calls for the Teacher role.
 * Matches the pattern used by departmentService.ts in this project.
 */

import {
  TeacherProfile,
  TeacherScheduleResponse,
  ScheduleQueryOptions,
} from '../types/teacher.types';

const BASE_URL = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// ── Schedule ──────────────────────────────────────────────────────────────────

/**
 * GET /api/teachers/my-schedule
 * Returns the logged-in teacher's weekly timetable + stats.
 */
export async function getMySchedule(
  options: ScheduleQueryOptions = {}
): Promise<TeacherScheduleResponse> {
  const { status = 'Published', academicYear } = options;
  const params = new URLSearchParams({ status });
  if (academicYear) params.set('academicYear', String(academicYear));

  const res = await fetch(`${BASE_URL}/teachers/my-schedule?${params}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<TeacherScheduleResponse>(res);
}

// ── Profile ───────────────────────────────────────────────────────────────────

/**
 * GET /api/teachers/:id
 * Returns full teacher profile (designation, qualifications, availability etc.)
 */
export async function getTeacherById(id: string): Promise<{ success: boolean; data: TeacherProfile }> {
  const res = await fetch(`${BASE_URL}/teachers/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * GET /api/teachers
 * Returns all teachers — useful for admin views.
 */
export async function getAllTeachers(): Promise<{ success: boolean; data: TeacherProfile[] }> {
  const res = await fetch(`${BASE_URL}/teachers`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}