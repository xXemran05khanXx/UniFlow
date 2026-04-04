/**
 * pages/Teacher/TeacherSettingsPage.tsx
 * Account settings page for teachers.
 * Displays read-only profile info (editable fields can be added later).
 */

import {
  Award,
  Bell,
  BookOpen,
  Building2,
  Clock,
  Info,
  Mail,
  Moon,
  Shield,
  Sun,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// ── Section wrapper ───────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <Card className="p-5">
    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
      <span className="text-blue-500">{icon}</span>
      {title}
    </h2>
    {children}
  </Card>
);

// ── Read-only field ───────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-800">
      {value || '—'}
    </div>
  </div>
);

// ── Toggle setting ────────────────────────────────────────────────────────────

const ToggleSetting: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200
        ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
      aria-label={label}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow
        transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const TeacherSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { teacher, weeklyStats, loading } = useTeacherSchedule();

  // Local preference state (persisted to localStorage for now)
  const [prefs, setPrefs] = useState({
    emailNotifications: localStorage.getItem('pref_emailNotif')    !== 'false',
    scheduleReminders:  localStorage.getItem('pref_scheduleRemind') !== 'false',
    darkMode:           localStorage.getItem('pref_darkMode')       === 'true',
    compactView:        localStorage.getItem('pref_compactView')    === 'true',
  });

  const updatePref = (key: keyof typeof prefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`pref_${key === 'emailNotifications' ? 'emailNotif'
      : key === 'scheduleReminders' ? 'scheduleRemind'
      : key === 'darkMode' ? 'darkMode'
      : 'compactView'}`, String(value));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Account info */}
      <Section title="Account Information" icon={<User className="h-5 w-5" />}>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-md" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name"    value={teacher?.name  || user?.name  || ''} />
            <Field label="Email"        value={teacher?.email || user?.email || ''} />
            <Field label="Employee ID"  value={teacher?.employeeId || ''} />
            <Field label="Department"   value={teacher?.department || ''} />
          </div>
        )}
        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            To update your profile information, please contact your administrator.
          </p>
        </div>
      </Section>

      {/* This week summary */}
      {weeklyStats && (
        <Section title="This Week's Summary" icon={<Clock className="h-5 w-5" />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Sessions', value: weeklyStats.totalSessions },
              { label: 'Theory',         value: weeklyStats.theoryClasses },
              { label: 'Lab',            value: weeklyStats.labClasses },
              { label: 'Hours',          value: `${weeklyStats.totalHours}h` },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Notifications */}
      <Section title="Notifications" icon={<Bell className="h-5 w-5" />}>
        <ToggleSetting
          label="Email Notifications"
          description="Receive timetable updates and announcements by email"
          value={prefs.emailNotifications}
          onChange={v => updatePref('emailNotifications', v)}
        />
        <ToggleSetting
          label="Schedule Reminders"
          description="Get reminders before your classes start"
          value={prefs.scheduleReminders}
          onChange={v => updatePref('scheduleReminders', v)}
        />
      </Section>

      {/* Display */}
      <Section title="Display" icon={<Sun className="h-5 w-5" />}>
        <ToggleSetting
          label="Compact View"
          description="Show more sessions on screen with reduced spacing"
          value={prefs.compactView}
          onChange={v => updatePref('compactView', v)}
        />
      </Section>

      {/* Security — read only info */}
      <Section title="Security" icon={<Shield className="h-5 w-5" />}>
        <div className="space-y-3">
          <Field label="Role"     value={user?.role || 'teacher'} />
          <Field label="Account Status" value="Active" />
        </div>
        <div className="mt-4">
          <Button variant="outline" className="w-full sm:w-auto">
            Change Password
          </Button>
        </div>
      </Section>

    </div>
  );
};

export default TeacherSettingsPage;