import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { RoomUtilizationAnalyticsItem } from '../../../services/roomManagementService';

interface UtilizationTableProps {
  data?: RoomUtilizationAnalyticsItem[];
}

type SortDirection = 'asc' | 'desc';

const UtilizationTable: React.FC<UtilizationTableProps> = ({ data }) => {
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    const source = Array.isArray(data) ? data : [];
    const cloned = [...source];
    cloned.sort((a, b) => {
      const diff = a.utilizationPercentage - b.utilizationPercentage;
      return sortDirection === 'asc' ? diff : -diff;
    });
    return cloned;
  }, [data, sortDirection]);

  const getBarColor = (utilization: number) => {
    if (utilization < 40) return 'bg-green-500';
    if (utilization < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Utilization Table</h4>
        <button
          className="inline-flex items-center text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
        >
          Sort by Utilization
          {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />}
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booked</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Slots</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map(item => (
            <tr key={item.roomId}>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                {item.roomNumber} - {item.roomName}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.bookedSlots}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.totalSlots}</td>
              <td className="px-4 py-3 text-sm text-gray-600 min-w-[240px]">
                <div className="flex items-center gap-3">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-2 ${getBarColor(item.utilizationPercentage)}`}
                      style={{ width: `${Math.min(100, item.utilizationPercentage)}%` }}
                    />
                  </div>
                  <span className="font-semibold w-16 text-right">{item.utilizationPercentage.toFixed(1)}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                {item.underUtilized ? (
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Under-utilized</span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Healthy</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UtilizationTable;
