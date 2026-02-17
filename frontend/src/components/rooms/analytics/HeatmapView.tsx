import React from 'react';
import { RoomHeatmapResponse } from '../../../services/roomManagementService';

interface HeatmapViewProps {
  data: RoomHeatmapResponse | null;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HeatmapView: React.FC<HeatmapViewProps> = ({ data }) => {
  if (!data) return null;

  const sortedDays = [...data.days].sort(
    (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
  );

  const sortedSlots = [...data.timeSlots].sort((a, b) =>
    a.localeCompare(b) // works for 08:10-09:10 format
  );

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-gray-900">Weekly Heatmap View</h4>

      {data.rooms.map(room => (
        <div key={room.roomId} className="border border-gray-200 rounded-lg p-4">
          <div className="mb-3">
            <p className="font-medium text-gray-900">
              {room.roomNumber} - {room.roomName}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs text-gray-500 uppercase">
                    Day / Time
                  </th>
                  {sortedSlots.map(slot => (
                    <th
                      key={slot}
                      className="p-2 text-center text-xs text-gray-500 uppercase whitespace-nowrap"
                    >
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDays.map(day => (
                  <tr key={`${room.roomId}-${day}`} className="border-t border-gray-100">
                    <td className="p-2 text-sm font-medium text-gray-700">
                      {day}
                    </td>

                    {sortedSlots.map(slot => {
                      const occupied = room.matrix?.[day]?.[slot] === 1;
                      const detail = room.details?.[day]?.[slot];

                      return (
                        <td key={`${room.roomId}-${day}-${slot}`} className="p-1">
                          <div
                            className={`h-8 rounded ${
                              occupied ? 'bg-red-400' : 'bg-green-400'
                            } cursor-default`}
                            title={
                              occupied
                                ? `Occupied • ${detail?.subjectName || 'N/A'} • ${detail?.teacherName || 'N/A'}`
                                : 'Free'
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HeatmapView;