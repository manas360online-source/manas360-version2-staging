import React from 'react';
import { AlertTriangle, RefreshCw, X, Wifi, Shield, Server } from 'lucide-react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import type { AppError } from '../hooks/useErrorHandler';

interface ErrorDisplayProps {
  error: AppError;
  className?: string;
  compact?: boolean;
}

const getErrorIcon = (type: AppError['type']) => {
  switch (type) {
    case 'network':
      return <Wifi className="h-5 w-5" />;
    case 'auth':
      return <Shield className="h-5 w-5" />;
    case 'server':
      return <Server className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
};

const getErrorColors = (type: AppError['type']) => {
  switch (type) {
    case 'network':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: 'text-orange-600',
        button: 'bg-orange-600 hover:bg-orange-700',
      };
    case 'auth':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700',
      };
    case 'server':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700',
      };
    default:
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700',
      };
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, className, compact = false }) => {
  const { retryError, removeError } = useErrorHandler();
  const colors = getErrorColors(error.type);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 rounded-lg ${colors.bg} border ${colors.border} p-3 ${className}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white ${colors.icon}`}>
          {getErrorIcon(error.type)}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.text}`}>{error.message}</p>
        </div>
        <div className="flex gap-2">
          {error.retryable && error.action && (
            <button
              onClick={() => retryError(error.id)}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-white ${colors.button}`}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
          <button
            onClick={() => removeError(error.id)}
            className={`inline-flex items-center justify-center rounded p-1 text-xs ${colors.text} hover:bg-white/50`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ${colors.icon}`}>
          {getErrorIcon(error.type)}
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${colors.text}`}>
            {error.type === 'network' && 'Connection Error'}
            {error.type === 'auth' && 'Authentication Error'}
            {error.type === 'server' && 'Server Error'}
            {error.type === 'validation' && 'Validation Error'}
            {error.type === 'unknown' && 'Error'}
          </h3>
          <p className={`mt-1 text-sm ${colors.text}`}>{error.message}</p>
        </div>
        <div className="flex gap-2">
          {error.retryable && error.action && (
            <button
              onClick={() => retryError(error.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white ${colors.button}`}
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </button>
          )}
          <button
            onClick={() => removeError(error.id)}
            className={`inline-flex items-center justify-center rounded-lg p-2 ${colors.text} hover:bg-white/50`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ErrorListProps {
  className?: string;
  compact?: boolean;
}

export const ErrorList: React.FC<ErrorListProps> = ({ className, compact = false }) => {
  const { errors } = useErrorHandler();

  if (errors.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {errors.map((error) => (
        <ErrorDisplay key={error.id} error={error} compact={compact} />
      ))}
    </div>
  );
};