import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { CalendarDays, Clock, MapPin, User, Check, X } from "lucide-react";

const meetingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  participantId: z.string().min(1, "Participant is required"),
  room: z.string().min(1, "Room is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

type MeetingFormData = z.infer<typeof meetingFormSchema>;

interface Meeting {
  id: string;
  organizerId: string;
  participantId: string;
  title: string;
  description?: string;
  room: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MeetingSchedulerProps {
  currentUserId: string;
}

export default function MeetingScheduler({ currentUserId }: MeetingSchedulerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      participantId: "",
      room: "",
      startTime: "",
      endTime: "",
    },
  });

  // Fetch meetings
  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: [`/api/meetings?userId=${currentUserId}`],
  });

  // Fetch all users for participant selection
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["/api/rooms"],
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (data: MeetingFormData) => {
      return apiRequest("POST", "/api/meetings", {
        ...data,
        organizerId: currentUserId,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/notifications`] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  // Update meeting status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: string }) => {
      return apiRequest("PUT", `/api/meetings/${meetingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/notifications`] });
    },
  });

  const onSubmit = (data: MeetingFormData) => {
    createMeetingMutation.mutate(data);
  };

  const handleStatusUpdate = (meetingId: string, status: string) => {
    updateStatusMutation.mutate({ meetingId, status });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Meeting Scheduler</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <CalendarDays className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter meeting title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Meeting description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="participantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participant</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select participant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.filter(user => user.id !== currentUserId).map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.name}>
                              {room.name} ({room.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMeetingMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No meetings scheduled</p>
              <p className="text-sm text-gray-400">Schedule your first meeting to get started</p>
            </CardContent>
          </Card>
        ) : (
          meetings.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{meeting.title}</h3>
                    {meeting.description && (
                      <p className="text-gray-600">{meeting.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDateTime(meeting.startTime)} - {formatDateTime(meeting.endTime)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {meeting.room}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      meeting.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      meeting.status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {meeting.status}
                    </span>
                    {meeting.status === 'pending' && meeting.participantId === currentUserId && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(meeting.id, 'accepted')}
                          disabled={updateStatusMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(meeting.id, 'declined')}
                          disabled={updateStatusMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}