import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Clock, MapPin, BookOpen } from 'lucide-react';

interface Override {
  _id: string;
  originalTeacher: { _id: string; user?: { name: string } };
  newTeacher: { _id: string; user?: { name: string } };
  course: { name: string; courseCode: string };
  room: { roomNumber: string };
  startTime: string;
  endTime: string;
}

export default function DailyOverridesPanel() {
  // Default to today's date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
});
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOverrides(selectedDate);
  }, [selectedDate]);

  const fetchOverrides = async (date: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`/api/swaps/overrides/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOverrides(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch overrides:", error);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <Calendar className="text-blue-500" size={24} />
          Daily Swap Schedule
        </h3>
        
        {/* Date Picker */}
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-md p-2 text-sm font-medium"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading schedule...</div>
      ) : overrides.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
          No temporary swaps scheduled for this date.
        </div>
      ) : (
        <div className="grid gap-4">
          {overrides.map((override) => (
            <div key={override._id} className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Teacher Change Info */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Original</p>
                  <p className="font-medium text-red-600 line-through">
                    {override.originalTeacher?.user?.name || 'Unknown'}
                  </p>
                </div>
                <ArrowRight className="text-gray-400" size={20} />
                <div className="text-center">
                  <p className="text-xs text-blue-500 font-semibold uppercase">Covering</p>
                  <p className="font-bold text-green-600">
                    {override.newTeacher?.user?.name || 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Class Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                  <Clock size={16} className="text-gray-400"/>
                  {override.startTime} - {override.endTime}
                </div>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                  <BookOpen size={16} className="text-gray-400"/>
                  {override.course?.courseCode || 'N/A'}
                </div>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                  <MapPin size={16} className="text-gray-400"/>
                  Room {override.room?.roomNumber || 'N/A'}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}