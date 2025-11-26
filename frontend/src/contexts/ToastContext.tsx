import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const t: Toast = { id, ...toast };
    setToasts(prev => [t, ...prev]);
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-3 items-end">
        {toasts.map(t => (
          <div key={t.id} className={`max-w-sm w-full pointer-events-auto transform transition-all duration-300 ease-in-out`}> 
            <div className={`rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden ${
              t.type === 'success' ? 'bg-green-50 border border-green-200' :
              t.type === 'error' ? 'bg-red-50 border border-red-200' :
              t.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-3">
                {t.title && <div className="font-semibold text-sm mb-1">{t.title}</div>}
                <div className="text-sm text-gray-700">{t.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
