import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, University, Users, UserCheck, ArrowRight } from "lucide-react";
import { useState } from "react";
import LoginForm from "./LoginForm";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const handleRoleSelect = (role: 'student' | 'teacher' | 'admin') => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-8">
        <DialogTitle className="sr-only">
          {!selectedRole ? "Login - Select Role" : `Login - ${selectedRole} Credentials`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {!selectedRole ? "Choose your role to access the appropriate login form" : `Enter your ${selectedRole} credentials to sign in`}
        </DialogDescription>
        {!selectedRole ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="text-white text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Uniflow</h2>
              <p className="text-gray-600">Select your role to continue</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => handleRoleSelect('student')}
                variant="outline"
                className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 text-blue-700 p-4 h-auto transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <University className="text-blue-500 text-xl mr-4" />
                  <div className="text-left">
                    <div className="font-semibold">Student</div>
                    <div className="text-sm text-blue-600">View timetables & notifications</div>
                  </div>
                </div>
                <ArrowRight className="text-blue-500" />
              </Button>

              <Button
                onClick={() => handleRoleSelect('teacher')}
                variant="outline"
                className="w-full bg-violet-50 hover:bg-violet-100 border-2 border-violet-200 hover:border-violet-300 text-violet-700 p-4 h-auto transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Users className="text-violet-500 text-xl mr-4" />
                  <div className="text-left">
                    <div className="font-semibold">Teacher</div>
                    <div className="text-sm text-violet-600">Manage schedule & meetings</div>
                  </div>
                </div>
                <ArrowRight className="text-violet-500" />
              </Button>

              <Button
                onClick={() => handleRoleSelect('admin')}
                variant="outline"
                className="w-full bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-700 p-4 h-auto transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <UserCheck className="text-emerald-500 text-xl mr-4" />
                  <div className="text-left">
                    <div className="font-semibold">Administrator</div>
                    <div className="text-sm text-emerald-600">Manage campus operations</div>
                  </div>
                </div>
                <ArrowRight className="text-emerald-500" />
              </Button>
            </div>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full mt-6 text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </Button>
          </>
        ) : (
          <LoginForm 
            role={selectedRole} 
            onBack={handleBack} 
            onClose={onClose} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
