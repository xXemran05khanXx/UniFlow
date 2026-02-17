import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Room } from '../../services/roomManagementService';

export interface BookingFormData {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

export interface RoomBookingSummary {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'approved' | 'cancelled';
}

interface RoomBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  bookingData: BookingFormData;
  onChange: (field: keyof BookingFormData, value: string) => void;
  onSubmit: () => Promise<void> | void;
  isSubmitting?: boolean;
  existingBookings?: RoomBookingSummary[];
  isLoadingBookings?: boolean;
}

const RoomBookingModal: React.FC<RoomBookingModalProps> = ({
  isOpen,
  onClose,
  room,
  bookingData,
  onChange,
  onSubmit,
  isSubmitting = false,
  existingBookings = [],
  isLoadingBookings = false
}) => {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Book Room</p>
            <h3 className="text-lg font-semibold text-gray-900">{room.name} ({room.roomNumber})</h3>
            <p className="text-sm text-gray-500">{room.building} · Floor {room.floor}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 transition hover:text-gray-700"
            aria-label="Close booking modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Input
            label="Date"
            type="date"
            value={bookingData.date}
            onChange={(e) => onChange('date', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={bookingData.startTime}
              onChange={(e) => onChange('startTime', e.target.value)}
            />
            <Input
              label="End Time"
              type="time"
              value={bookingData.endTime}
              onChange={(e) => onChange('endTime', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Purpose</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={bookingData.purpose}
              onChange={(e) => onChange('purpose', e.target.value)}
              placeholder="Describe the session purpose"
            />
          </div>

          {isLoadingBookings ? (
            <p className="text-sm text-gray-500">Loading existing bookings...</p>
          ) : existingBookings.length > 0 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-2 text-sm font-semibold text-gray-700">Existing bookings</p>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {existingBookings.map((b) => (
                  <div key={b._id} className="rounded-md bg-white px-3 py-2 shadow-sm ring-1 ring-gray-200">
                    <p className="text-sm font-medium text-gray-900">{new Date(b.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-600">{b.startTime} - {b.endTime}</p>
                    <p className="text-xs text-gray-700 line-clamp-2">{b.purpose}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 text-xs font-semibold ${b.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No existing bookings for this room.</p>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} isLoading={isSubmitting}>
            Submit Booking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomBookingModal;
