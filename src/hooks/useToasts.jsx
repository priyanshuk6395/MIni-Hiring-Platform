import React, { useState, useEffect, useMemo, createContext, useContext, useRef, useCallback } from 'react';
import { Toast } from '../components/ui/Toast';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const addToast = (message, type = 'info') => {
    const id = idCounter.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts must be used within a ToastProvider');
  }
  return context;
};