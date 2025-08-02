import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, X } from "lucide-react";

interface CreateTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTimetableModal({ isOpen, onClose, onSuccess }: CreateTimetableModalProps) {
  const [formData, setFormData] = useState({
    subject: '',
    room: '',
    startTime: '',
    endTime: '',
    dayOfWeek: '',
    department: '',
    year: '',
    division: '',
    userId: '' // This will be set to teacher ID
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const departments = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const divisions = ['A', 'B', 'C'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/timetables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: formData.userId || 'admin-created' // Placeholder for admin-created entries
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          subject: '',
          room: '',
          startTime: '',
          endTime: '',
          dayOfWeek: '',
          department: '',
          year: '',
          division: '',
          userId: ''
        });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create timetable entry');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-6">
        <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
          Create Timetable Entry
        </DialogTitle>
        <DialogDescription className="sr-only">
          Create a new timetable entry for the department schedule
        </DialogDescription>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center">
              <Calendar className="text-blue-500 mr-2" size={20} />
              <CardTitle className="text-lg">Class Details</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Calculus I"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    value={formData.room}
                    onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                    placeholder="e.g. Math-105"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={formData.year} onValueChange={(value) => setFormData(prev => ({ ...prev, year: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="division">Division</Label>
                  <Select value={formData.division} onValueChange={(value) => setFormData(prev => ({ ...prev, division: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map(div => (
                        <SelectItem key={div} value={div}>Division {div}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Entry'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}