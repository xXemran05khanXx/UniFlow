import React from 'react';
import { X } from 'lucide-react';
import { TimetableDisplayEntry } from './types';

interface ScheduleModalProps {
  isOpen: boolean;
  entry: TimetableDisplayEntry | null;
  onClose: () => void;
}

const Row: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-gray-100 last:border-b-0">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
  </div>
);

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, entry, onClose }) => {
  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <Row label="Course" value={entry.subject} />
          <Row label="Course Code" value={entry.subjectCode} />
          <Row label="Teacher" value={entry.teacher} />
          <Row label="Teacher Email" value={entry.teacherEmail} />
          <Row label="Room Name" value={entry.roomName || entry.room} />
          <Row label="Room Number" value={entry.roomNumber} />
          <Row label="Room Type" value={entry.roomType} />
          <Row label="Day" value={entry.day} />
          <Row label="Time" value={`${entry.startTime || '-'} - ${entry.endTime || '-'}`} />
          <Row label="Semester" value={entry.semester} />
          <Row label="Division" value={entry.division} />
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
