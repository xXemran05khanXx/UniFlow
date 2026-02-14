import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { getSubjectColorClasses } from '../../utils/timetableColors';
import { TimetableDisplayEntry } from './types';

interface TimetableBlockProps {
  entry: TimetableDisplayEntry;
  onClick: (entry: TimetableDisplayEntry) => void;
  compact?: boolean;
}

const TimetableBlock: React.FC<TimetableBlockProps> = ({ entry, onClick, compact = true }) => {
  const colors = getSubjectColorClasses(entry.courseId || entry.subjectCode || entry.subject);

  return (
    <button
      type="button"
      onClick={() => onClick(entry)}
      className={`w-full text-left rounded-xl border p-3 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${colors.bg} ${colors.border}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`h-2 w-2 rounded-full ${colors.accent}`} />
        <span className={`text-[11px] font-semibold ${colors.subtle}`}>{entry.timeSlot}</span>
      </div>

      <h4 className={`font-semibold leading-tight ${compact ? 'text-xs' : 'text-sm'} ${colors.text}`}>
        {entry.subject}
      </h4>
      <p className={`mt-1 ${compact ? 'text-[11px]' : 'text-xs'} ${colors.subtle}`}>{entry.subjectCode}</p>

      <div className={`mt-2 space-y-1 ${compact ? 'text-[11px]' : 'text-xs'} ${colors.subtle}`}>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span className="truncate">{entry.teacher}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{entry.room}</span>
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{entry.day}</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default TimetableBlock;
