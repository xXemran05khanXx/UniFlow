import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

interface AccountLockWarningProps {
  failedAttempts: number;
  lockUntil: Date | null;
  maxAttempts?: number;
}

const AccountLockWarning: React.FC<AccountLockWarningProps> = ({ 
  failedAttempts, 
  lockUntil,
  maxAttempts = 5 
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!lockUntil) {
      setIsLocked(false);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const lockTime = new Date(lockUntil).getTime();
      const diff = lockTime - now;

      if (diff <= 0) {
        setIsLocked(false);
        setTimeRemaining('');
        return;
      }

      setIsLocked(true);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lockUntil]);

  // Account is locked
  if (isLocked) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-red-800">
              Account Locked
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Your account has been temporarily locked due to too many failed login attempts.</p>
              <div className="mt-3 flex items-center bg-red-100 px-3 py-2 rounded-md">
                <Clock className="h-5 w-5 text-red-600 mr-2" />
                <span className="font-mono text-base font-semibold text-red-900">
                  {timeRemaining}
                </span>
                <span className="ml-2 text-red-700">remaining</span>
              </div>
              <p className="mt-2 text-xs">
                Please wait until the timer expires before trying again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show warning if there are failed attempts but not locked yet
  if (failedAttempts > 0) {
    const attemptsLeft = maxAttempts - failedAttempts;
    const isWarningLevel = attemptsLeft <= 2;

    return (
      <div className={`border-l-4 p-4 rounded-md shadow-sm ${
        isWarningLevel 
          ? 'bg-red-50 border-red-500' 
          : 'bg-yellow-50 border-yellow-500'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className={`h-5 w-5 ${
              isWarningLevel ? 'text-red-500' : 'text-yellow-500'
            }`} />
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-semibold ${
              isWarningLevel ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {isWarningLevel ? 'Warning: Account Lock Imminent' : 'Invalid Login Attempt'}
            </h3>
            <div className={`mt-1 text-sm ${
              isWarningLevel ? 'text-red-700' : 'text-yellow-700'
            }`}>
              <p>
                <span className="font-semibold">{attemptsLeft}</span> attempt{attemptsLeft !== 1 ? 's' : ''} remaining before your account is locked.
              </p>
              {isWarningLevel && (
                <p className="mt-1 text-xs">
                  Your account will be locked for 15 minutes after {maxAttempts} failed attempts.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AccountLockWarning;
