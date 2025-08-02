import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

interface HeaderProps {
  onLoginClick: () => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white text-lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Uniflow</h1>
          </div>
          <Button 
            onClick={onLoginClick} 
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Login
          </Button>
        </div>
      </div>
    </header>
  );
}
