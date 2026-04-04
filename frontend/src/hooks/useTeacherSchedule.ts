/**
 * useTeacherSchedule.ts
 * Custom hook — fetches and manages the logged-in teacher's weekly schedule.
 * Matches the pattern of useAuth.ts already in this project.
 */

import { useState, useEffect, useCallback } from 'react';
import { getMySchedule } from '../services/teacherService';
import {
  TeacherInfo,
  WeeklySchedule,
  Session,
  WeeklyStats,
  ScheduleQueryOptions,
} from '../types/teacher.types';

interface UseTeacherScheduleState {
  teacher: TeacherInfo | null;
  weeklySchedule: Partial<WeeklySchedule>;
  allSessions: Session[];
  weeklyStats: WeeklyStats | null;
  loading: boolean;
  error: string | null;
  message: string | null;
}

interface UseTeacherScheduleReturn extends UseTeacherScheduleState {
  refetch: () => void;
}

export function useTeacherSchedule(
  options: ScheduleQueryOptions = {}
): UseTeacherScheduleReturn {
  const { status = 'Published', academicYear } = options;

  const [state, setState] = useState<UseTeacherScheduleState>({
    teacher: null,
    weeklySchedule: {},
    allSessions: [],
    weeklyStats: null,
    loading: true,
    error: null,
    message: null,
  });

  const fetchSchedule = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await getMySchedule({ status, academicYear });
      setState({
        teacher:        res.data?.teacher        ?? null,
        weeklySchedule: res.data?.weeklySchedule ?? {},
        allSessions:    res.data?.allSessions    ?? [],
        weeklyStats:    res.data?.weeklyStats    ?? null,
        message:        res.message              ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schedule';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, [status, academicYear]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return { ...state, refetch: fetchSchedule };
}