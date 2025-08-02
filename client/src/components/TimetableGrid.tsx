import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users } from "lucide-react";

interface TimetableEntry {
  id: string;
  subject: string;
  room: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  department: string;
  year?: string;
  division?: string;
}

interface TimetableGridProps {
  timetables: TimetableEntry[];
  title: string;
  showStudentInfo?: boolean;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = [
  '09:00-10:30',
  '11:00-12:30', 
  '14:00-15:30',
  '16:00-17:30'
];

export default function TimetableGrid({ timetables, title, showStudentInfo = false }: TimetableGridProps) {
  const getTimetableForSlot = (day: string, timeSlot: string) => {
    const [startTime] = timeSlot.split('-');
    return timetables.find(t => 
      t.dayOfWeek === day && t.startTime === startTime
    );
  };

  const getSubjectColor = (subject: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200', 
      'bg-violet-100 text-violet-800 border-violet-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-rose-100 text-rose-800 border-rose-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200'
    ];
    
    const hash = subject.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 min-w-[800px]">
            {/* Header */}
            <div className="font-semibold text-gray-600 p-3 text-center">Time</div>
            {days.map(day => (
              <div key={day} className="font-semibold text-gray-600 p-3 text-center">
                {day}
              </div>
            ))}

            {/* Time slots */}
            {timeSlots.map((timeSlot, timeIndex) => (
              <React.Fragment key={`timeslot-${timeIndex}`}>
                <div className="p-3 bg-gray-50 rounded-lg text-center text-sm font-medium text-gray-700">
                  {timeSlot}
                </div>
                {days.map(day => {
                  const entry = getTimetableForSlot(day, timeSlot);
                  return (
                    <div key={`${day}-${timeSlot}`} className="p-2">
                      {entry ? (
                        <div className={`p-3 rounded-lg border-2 ${getSubjectColor(entry.subject)} transition-all duration-200 hover:shadow-md`}>
                          <div className="font-semibold text-sm mb-1">{entry.subject}</div>
                          <div className="flex items-center text-xs mb-1">
                            <MapPin size={12} className="mr-1" />
                            {entry.room}
                          </div>
                          <div className="flex items-center text-xs mb-1">
                            <Clock size={12} className="mr-1" />
                            {entry.startTime} - {entry.endTime}
                          </div>
                          {showStudentInfo && entry.year && entry.division && (
                            <div className="flex items-center text-xs">
                              <Users size={12} className="mr-1" />
                              {entry.year} Div {entry.division}
                            </div>
                          )}
                          <Badge variant="secondary" className="text-xs mt-1">
                            {entry.department}
                          </Badge>
                        </div>
                      ) : (
                        <div className="p-3 h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"></div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}