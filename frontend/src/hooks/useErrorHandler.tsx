import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppError = {
  id: string;
  type: 'network' | 'validation' | 'auth' | 'server' | 'unknown';
  message: string;
  context?: string;
  retryable: boolean;
  action?: () => void;
  timestamp: number;
};

type ErrorContextType = {
  errors: AppError[];
  hasErrors: boolean;
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  retryError: (id: string) => void;
  getErrorsByContext: (context: string) => AppError[];
  getErrorsByType: (type: AppError['type']) => AppError[];
};

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
};

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = (error: Omit<AppError, 'id' | 'timestamp'>) => {
    const newError: AppError = {
      ...error,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setErrors(prev => [...prev, newError]);

    // Auto-remove non-retryable errors after 5 seconds
    if (!error.retryable) {
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== newError.id));
      }, 5000);
    }
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const retryError = (id: string) => {
    const error = errors.find(e => e.id === id);
    if (error?.action) {
      error.action();
      removeError(id);
    }
  };

  const getErrorsByContext = (context: string) => {
    return errors.filter(e => e.context === context);
  };

  const getErrorsByType = (type: AppError['type']) => {
    return errors.filter(e => e.type === type);
  };

  return (
    <ErrorContext.Provider value={{ errors, hasErrors: errors.length > 0, addError, removeError, clearErrors, retryError, getErrorsByContext, getErrorsByType }}>
      {children}
    </ErrorContext.Provider>
  );
};