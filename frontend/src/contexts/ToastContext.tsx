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

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    console.log('🗑️ Removing toast:', id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const t: Toast = { id, ...toast };
    console.log('➕ Adding toast to state:', t);
    setToasts(prev => {
      const newToasts = [t, ...prev];
      console.log('📋 Current toasts array:', newToasts);
      return newToasts;
    });
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  // Debug: Log when toasts change
  useEffect(() => {
    console.log('🔄 ToastContext re-rendered. Toast count:', toasts.length);
    console.log('🔄 Toasts:', toasts);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <div>
        {children}
        {/* Toast Container - Fixed position at top-right */}
        <div 
          aria-live="polite" 
          className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end justify-start gap-4 p-4"
          style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999 }}
        >
        {toasts.map(t => {
          console.log('🎨 Rendering toast:', t.id, t.type, t.title);
          return (
            <div 
              key={t.id} 
              className="pointer-events-auto max-w-sm w-full transform transition-all duration-300 ease-in-out animate-in slide-in-from-right"
            > 
            <div className={`rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden ${
              t.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
              t.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
              t.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 
              'bg-blue-50 border-l-4 border-blue-500'
            }`}>
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {t.type === 'success' && (
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {t.type === 'error' && (
                      <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {t.type === 'warning' && (
                      <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    {t.title && <p className="text-sm font-semibold text-gray-900">{t.title}</p>}
                    <p className="text-sm text-gray-700 mt-1">{t.message}</p>
                  </div>
                  <button
                    onClick={() => removeToast(t.id)}
                    className="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )})}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
