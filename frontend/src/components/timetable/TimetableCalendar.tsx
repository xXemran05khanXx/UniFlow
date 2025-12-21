import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar';
import moment from 'moment';
import { Calendar as CalendarIcon, Filter, Download, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { timetablesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { TimetableEntry, Timetable } from '../../types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './TimetableCalendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: string;
  resource: TimetableEntry;
}

interface TimetableCalendarProps {
  viewMode?: 'all' | 'teacher' | 'student';
}

const TimetableCalendar: React.FC<TimetableCalendarProps> = ({ viewMode = 'all' }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<string>('all');
  const [currentView, setCurrentView] = useState<View>('week');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    department: 'all',
    semester: 'all',
    sessionType: 'all'
  });

  const generateEvents = useCallback((timetableData: Timetable[]) => {
    const calendarEvents: CalendarEvent[] = [];
    
    timetableData.forEach(timetable => {
      if (selectedTimetable !== 'all' && timetable._id !== selectedTimetable) {
        return;
      }

      timetable.entries.forEach(entry => {
        // Apply filters - convert Department object to string for comparison
        const entryDepartment = typeof entry.department === 'string' 
          ? entry.department 
          : `${entry.department.code} - ${entry.department.name}`;
        
        if (filters.department !== 'all' && entryDepartment !== filters.department) {
          return;
        }
        if (filters.semester !== 'all' && entry.semester.toString() !== filters.semester) {
          return;
        }
        if (filters.sessionType !== 'all' && entry.sessionType !== filters.sessionType) {
          return;
        }

        // Generate recurring events for the week
        const startDate = moment().startOf('week');
        const endDate = moment().endOf('week').add(4, 'weeks'); // Show 5 weeks

        let currentWeek = startDate.clone();
        while (currentWeek.isBefore(endDate)) {
          const eventDate = currentWeek.clone().day(entry.timeSlot.dayOfWeek);
          
          if (eventDate.isAfter(moment().subtract(1, 'day'))) {
            const [startHour, startMinute] = entry.timeSlot.startTime.split(':');
            const [endHour, endMinute] = entry.timeSlot.endTime.split(':');
            
            const startDateTime = eventDate.clone()
              .hour(parseInt(startHour))
              .minute(parseInt(startMinute))
              .second(0);
            
            const endDateTime = eventDate.clone()
              .hour(parseInt(endHour))
              .minute(parseInt(endMinute))
              .second(0);

            calendarEvents.push({
              id: `${entry._id}-${eventDate.format('YYYY-MM-DD')}`,
              title: entry.subject.name,
              start: startDateTime.toDate(),
              end: endDateTime.toDate(),
              resource: entry
            });
          }
          
          currentWeek.add(1, 'week');
        }
      });
    });

    setEvents(calendarEvents);
  }, [selectedTimetable, filters]);

  const fetchTimetables = useCallback(async () => {
    try {
      setLoading(true);
      let response;

      if (viewMode === 'teacher' && user?.role === 'teacher') {
        response = await timetablesAPI.getByTeacher(user._id);
      } else if (viewMode === 'student' && user?.role === 'student') {
        response = await timetablesAPI.getByStudent(user._id);
      } else {
        response = await timetablesAPI.getAll();
      }

      if (response.success && response.data) {
        setTimetables(response.data);
        generateEvents(response.data);
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
    } finally {
      setLoading(false);
    }
  }, [user, viewMode, generateEvents]);

  useEffect(() => {
    generateEvents(timetables);
  }, [timetables, selectedTimetable, filters, generateEvents]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const entry = event.resource;
    let backgroundColor = '#3174ad';
    
    switch (entry.sessionType) {
      case 'lecture':
        backgroundColor = '#3b82f6'; // Blue
        break;
      case 'practical':
        backgroundColor = '#10b981'; // Green
        break;
      case 'lab':
        backgroundColor = '#8b5cf6'; // Purple
        break;
      default:
        backgroundColor = '#6b7280'; // Gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const CustomEvent: React.FC<{ event: CalendarEvent }> = ({ event }) => {
    const entry = event.resource;
    return (
      <div className="text-xs">
        <div className="font-semibold">{entry.subject.name}</div>
        <div>{entry.room.number}</div>
        <div>{entry.teacher.name}</div>
      </div>
    );
  };

  const handleEventSelect = (event: CalendarEvent) => {
    const entry = event.resource;
    alert(`
      Subject: ${entry.subject.name}
      Teacher: ${entry.teacher.name}
      Room: ${entry.room.number}
      Type: ${entry.sessionType}
      Department: ${typeof entry.department === 'object' ? entry.department?.name || entry.department?.code : entry.department}
      Semester: ${entry.semester}
    `);
  };

  const handleExport = async () => {
    if (selectedTimetable && selectedTimetable !== 'all') {
      try {
        const blob = await timetablesAPI.export(selectedTimetable, 'pdf');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetable-${selectedTimetable}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error exporting timetable:', error);
      }
    }
  };

  // Extract unique departments and semesters, converting Department objects to strings
  const uniqueDepartments = Array.from(new Set(
    timetables.flatMap(t => t.entries.map(e => 
      typeof e.department === 'string' ? e.department : `${e.department.code} - ${e.department.name}`
    ))
  ));
  const uniqueSemesters = Array.from(new Set(timetables.flatMap(t => t.entries.map(e => e.semester))));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 mr-3" />
            Timetable
          </h1>
          <p className="text-gray-600 mt-1">View and manage class schedules</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={fetchTimetables}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={selectedTimetable === 'all'}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={selectedTimetable}
            onChange={(e) => setSelectedTimetable(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Select timetable"
          >
            <option value="all">All Timetables</option>
            {timetables.map(timetable => (
              <option key={timetable._id} value={timetable._id}>
                {timetable.name}
              </option>
            ))}
          </select>

          <select
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {uniqueDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={filters.semester}
            onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Filter by semester"
          >
            <option value="all">All Semesters</option>
            {uniqueSemesters.map(sem => (
              <option key={sem} value={sem.toString()}>Semester {sem}</option>
            ))}
          </select>

          <select
            value={filters.sessionType}
            onChange={(e) => setFilters(prev => ({ ...prev, sessionType: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Filter by session type"
          >
            <option value="all">All Types</option>
            <option value="lecture">Lecture</option>
            <option value="practical">Practical</option>
            <option value="lab">Lab</option>
          </select>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-4">
        <div className="timetable-calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={setCurrentView}
            views={['month', 'week', 'day', 'agenda']}
            onSelectEvent={handleEventSelect}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent
            }}
            popup
            showMultiDayTimes
            step={30}
            timeslots={2}
            defaultDate={new Date()}
            toolbar={true}
          />
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Legend</h3>
        <div className="flex space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Lecture</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Practical</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600">Lab</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TimetableCalendar;
