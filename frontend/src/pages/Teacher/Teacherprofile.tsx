/**
 * pages/Teacher/TeacherProfilePage.tsx
 * Shows the logged-in teacher's full profile — fetched from GET /api/teachers/:id
 * after resolving the teacher ID from the schedule hook.
 */

import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  Mail,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule';
import { getTeacherById } from '../../services/teacherService';
import { TeacherProfile, DayOfWeek } from '../../types/teacher.types';
import Card from '../../components/ui/Card';

const DESIGNATION_COLOR: Record<string, string> = {
  'Professor':           'bg-purple-100 text-purple-700',
  'Associate Professor': 'bg-blue-100 text-blue-700',
  'Assistant Professor': 'bg-teal-100 text-teal-700',
  'Lecturer':            'bg-orange-100 text-orange-700',
};

// ── Info row helper ───────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg text-gray-500 shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-semibold truncate">{value || '—'}</p>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const TeacherProfilePage: React.FC = () => {
  const { teacher, loading: scheduleLoading } = useTeacherSchedule();

  const [fullProfile,   setFullProfile]   = useState<TeacherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError,   setProfileError]   = useState<string | null>(null);

  useEffect(() => {
    if (!teacher?.id) return;
    setProfileLoading(true);
    getTeacherById(teacher.id)
      .then(res => setFullProfile(res.data))
      .catch(err => setProfileError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setProfileLoading(false));
  }, [teacher?.id]);

  const loading = scheduleLoading || profileLoading;

  // Derived display values — prefer fullProfile, fall back to compact teacher info
  const name        = fullProfile?.name                   ?? teacher?.name        ?? '—';
  const email       = fullProfile?.user?.email            ?? teacher?.email       ?? '—';
  const employeeId  = fullProfile?.employeeId             ?? teacher?.employeeId  ?? '—';
  const department  = fullProfile?.primaryDepartment?.name ?? teacher?.department ?? '—';
  const designation = fullProfile?.designation            ?? null;
  const quals       = fullProfile?.qualifications         ?? [];
  const staffRoom   = fullProfile?.contactInfo?.staffRoom ?? null;
  const maxHrs      = fullProfile?.workload?.maxHoursPerWeek ?? null;
  const minHrs      = fullProfile?.workload?.minHoursPerWeek ?? null;
  const availability = fullProfile?.availability          ?? [];
  const allowedDepts = fullProfile?.allowedDepartments    ?? [];

  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="h-24 bg-indigo-100" />
          <div className="px-6 pb-6 pt-2 space-y-4">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl" />
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your account & professional details</p>
      </div>

      {/* Error */}
      {profileError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {profileError}
        </div>
      )}

      {/* Profile card */}
      <Card className="overflow-hidden p-0">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg border-4 border-white">
              {initials || <User className="h-8 w-8" />}
            </div>
          </div>

          {/* Name + designation */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{department}</p>
            </div>
            {designation && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${DESIGNATION_COLOR[designation] ?? 'bg-gray-100 text-gray-600'}`}>
                {designation}
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Employee ID" value={employeeId}
              icon={<Award className="h-4 w-4" />} />
            <InfoRow label="Email" value={email}
              icon={<Mail className="h-4 w-4" />} />
            <InfoRow label="Department" value={department}
              icon={<Building2 className="h-4 w-4" />} />
            {designation && (
              <InfoRow label="Designation" value={designation}
                icon={<GraduationCap className="h-4 w-4" />} />
            )}
            {staffRoom && (
              <InfoRow label="Staff Room" value={staffRoom}
                icon={<Building2 className="h-4 w-4" />} />
            )}
            {maxHrs !== null && minHrs !== null && (
              <InfoRow label="Workload" value={`${minHrs}–${maxHrs} hrs/week`}
                icon={<Clock className="h-4 w-4" />} />
            )}
          </div>

          {/* Qualifications */}
          {quals.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Qualifications
              </p>
              <div className="flex flex-wrap gap-2">
                {quals.map(q => (
                  <span key={q}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-medium">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Availability */}
      {availability.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            Availability
          </h3>
          <div className="space-y-2">
            {availability.map((slot, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">{slot.dayOfWeek}</span>
                <span className="text-sm text-gray-500 font-mono">
                  {slot.startTime} – {slot.endTime}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Allowed departments */}
      {allowedDepts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Can also teach in
          </h3>
          <div className="flex flex-wrap gap-2">
            {allowedDepts.map(dept => (
              <span key={dept._id}
                className="text-sm bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-xl font-medium">
                {dept.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeacherProfilePage;