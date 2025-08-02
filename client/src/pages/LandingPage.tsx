import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import LoginModal from "@/components/LoginModal";
import { 
  Calendar, 
  Handshake, 
  Bell, 
  MapPin, 
  University, 
  Users, 
  UserCheck, 
  Check,
  ArrowRight,
  GraduationCap
} from "lucide-react";

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-violet-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Streamlining Campus
              <span className="bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
                {" "}Productivity
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform your educational institution with intelligent timetable management, 
              seamless meeting scheduling, and real-time notifications. Designed for students, 
              teachers, and administrators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
                <ArrowRight className="ml-2" />
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-primary hover:text-primary transition-all duration-200"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features for Every Role</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools designed to enhance productivity across your entire campus
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none shadow-sm hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="text-white text-xl" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Smart Timetables</h4>
                <p className="text-gray-600">Dynamic scheduling with department-wise management and real-time updates</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-none shadow-sm hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-violet-500 rounded-lg flex items-center justify-center mb-4">
                  <Handshake className="text-white text-xl" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Meeting Management</h4>
                <p className="text-gray-600">Book meetings with faculty, view availability, and manage room allocations</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-none shadow-sm hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4">
                  <Bell className="text-white text-xl" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Real-time Notifications</h4>
                <p className="text-gray-600">Instant alerts for class changes, meetings, and important updates</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-none shadow-sm hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="text-white text-xl" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">Room Allocation</h4>
                <p className="text-gray-600">Smart room booking with availability tracking and conflict prevention</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Designed for Every Campus Role</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <University className="text-white text-2xl" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900">Students</h4>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Personalized timetable view
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Class and room notifications
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Real-time schedule updates
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Mobile-friendly interface
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="text-white text-2xl" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900">Teachers</h4>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Personalized schedule management
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Meeting invitations & booking
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Lecture swapping tools
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Availability status toggle
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="text-white text-2xl" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900">Administrators</h4>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Department timetable creation
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Meeting scheduling dashboard
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Staff management tools
                  </li>
                  <li className="flex items-center">
                    <Check className="text-emerald-500 mr-3" size={16} />
                    Analytics & reporting
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white text-sm" />
            </div>
            <h1 className="text-xl font-bold">Uniflow</h1>
          </div>
          <p className="text-gray-400">Streamlining Campus Productivity</p>
        </div>
      </footer>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
