export interface TimetableDisplayEntry {
  id: string;
  courseId?: string;
  subject: string;
  subjectCode: string;
  teacher: string;
  teacherEmail?: string;
  room: string;
  roomName?: string;
  roomNumber?: string;
  roomType?: string;
  timeSlot: string;
  startTime?: string;
  endTime?: string;
  day: string;
  type: 'lecture' | 'lab' | 'tutorial';
  duration: number;
  department: string;
  departmentLabel?: string;
  semester: string;
  semesterNumber?: number;
  division?: string;
}
