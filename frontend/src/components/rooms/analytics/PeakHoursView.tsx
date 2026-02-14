import React from 'react';
import { PeakHourItem } from '../../../services/roomManagementService';

interface PeakHoursViewProps {
  data: PeakHourItem[];
}

const PeakHoursView: React.FC<PeakHoursViewProps> = ({ data }) => {
  const max = Math.max(...data.map(d => d.bookingCount), 1);

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h4>

      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={`${item.dayOfWeek}-${item.startTime}-${idx}`} className="p-3 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-800">{item.dayOfWeek} • {item.startTime}</span>
              <span className="text-sm font-semibold text-gray-900">{item.bookingCount} bookings</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-indigo-500"
                style={{ width: `${(item.bookingCount / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeakHoursView;
