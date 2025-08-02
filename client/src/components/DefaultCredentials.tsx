import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

interface DefaultCredentialsProps {
  role: 'student' | 'teacher' | 'admin';
}

export default function DefaultCredentials({ role }: DefaultCredentialsProps) {
  const credentials = {
    student: {
      username: 'student123',
      email: 'john.doe@university.edu',
      password: 'password123'
    },
    teacher: {
      username: 'teacher456', 
      email: 'sarah.johnson@university.edu',
      password: 'password123'
    },
    admin: {
      username: 'admin789',
      email: 'michael.chen@university.edu', 
      password: 'password123'
    }
  };

  const creds = credentials[role];

  return (
    <Card className="bg-blue-50 border-blue-200 border mt-4">
      <CardContent className="p-4">
        <div className="flex items-start">
          <Info className="text-blue-500 mr-3 mt-0.5" size={16} />
          <div>
            <p className="font-semibold text-blue-800 text-sm mb-2">Demo Credentials</p>
            <div className="text-blue-700 text-xs space-y-1">
              <p><strong>Username:</strong> {creds.username}</p>
              <p><strong>Email:</strong> {creds.email}</p>
              <p><strong>Password:</strong> {creds.password}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}