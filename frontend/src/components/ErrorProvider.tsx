import { createContext, useContext, useState, ReactNode } from 'react';

export interface AppError {
  id: string;
  type: 'network' | 'server' | 'validation' | 'auth' | 'unknown';
  message: string;
  context?: string;
  retryable?: boolean;
  retryAction?: () => void | Promise<void>;
  timestamp: Date;
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  retryError: (id: string) => Promise<void>;
  getErrorsByType: (type: AppError['type']) => AppError[];
  getErrorsByContext: (context: string) => AppError[];
  hasErrors: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useErrorHandler(): ErrorContextType {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = (errorData: Omit<AppError, 'id' | 'timestamp'>) => {
    const error: AppError = {
      ...errorData,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setErrors(prev => [...prev, error]);

    // Auto-remove non-retryable errors after 5 seconds
    if (!error.retryable) {
      setTimeout(() => {
        removeError(error.id);
      }, 5000);
    }
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const retryError = async (id: string) => {
    const error = errors.find(e => e.id === id);
    if (!error || !error.retryable || !error.retryAction) {
      return;
    }

    try {
      await error.retryAction();
      removeError(id);
    } catch (retryError) {
      // Keep the error if retry fails
      console.error('Error retry failed:', retryError);
    }
  };

  const getErrorsByType = (type: AppError['type']) => {
    return errors.filter(error => error.type === type);
  };

  const getErrorsByContext = (context: string) => {
    return errors.filter(error => error.context === context);
  };

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearErrors,
    retryError,
    getErrorsByType,
    getErrorsByContext,
    hasErrors: errors.length > 0,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}