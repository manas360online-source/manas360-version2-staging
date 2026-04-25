import { useCallback, useEffect } from 'react';

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

interface ErrorEvent {
  error: Error;
  context: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private errors: ErrorEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private batchSize = 10;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'userId' | 'sessionId'>) {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.events.push(analyticsEvent);

    // Immediate flush for critical events
    if (event.category === 'error' || event.category === 'performance') {
      this.flush();
    } else if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  trackError(error: Error, context: string, additionalData?: Record<string, any>) {
    const errorEvent: ErrorEvent = {
      error,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData,
    };

    this.errors.push(errorEvent);
    this.flush(); // Always flush errors immediately
  }

  private async flush() {
    if (this.events.length === 0 && this.errors.length === 0) return;

    const eventsToSend = [...this.events];
    const errorsToSend = [...this.errors];

    this.events = [];
    this.errors = [];

    try {
      // Send to analytics endpoint
      await this.sendToAnalytics({
        events: eventsToSend,
        errors: errorsToSend,
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Re-queue events on failure
      this.events.unshift(...eventsToSend);
      this.errors.unshift(...errorsToSend);
    }
  }

  private async sendToAnalytics(data: { events: AnalyticsEvent[]; errors: ErrorEvent[] }) {
    // In a real implementation, this would send to your analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics data:', data);
      return;
    }

    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Analytics upload failed');
    }
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // Final flush
  }
}

// Global analytics instance
const analyticsService = new AnalyticsService();

export function useAnalytics() {
  const trackEvent = useCallback((
    event: string,
    category: string,
    action: string,
    options: {
      label?: string;
      value?: number;
      properties?: Record<string, any>;
    } = {}
  ) => {
    analyticsService.trackEvent({
      event,
      category,
      action,
      ...options,
    });
  }, []);

  const trackPageView = useCallback((pageName: string, properties?: Record<string, any>) => {
    trackEvent('page_view', 'navigation', 'view', {
      label: pageName,
      properties,
    });
  }, [trackEvent]);

  const trackUserAction = useCallback((
    action: string,
    category: string = 'user_interaction',
    properties?: Record<string, any>
  ) => {
    trackEvent('user_action', category, action, { properties });
  }, [trackEvent]);

  const trackAssessmentProgress = useCallback((
    assessmentId: string,
    step: string,
    action: 'start' | 'complete' | 'save' | 'cancel',
    properties?: Record<string, any>
  ) => {
    trackEvent('assessment_progress', 'assessment', action, {
      label: `${assessmentId}:${step}`,
      properties: {
        assessmentId,
        step,
        ...properties,
      },
    });
  }, [trackEvent]);

  const trackError = useCallback((
    error: Error,
    context: string,
    additionalData?: Record<string, any>
  ) => {
    analyticsService.trackError(error, context, additionalData);
  }, []);

  const trackPerformance = useCallback((
    metric: string,
    value: number,
    properties?: Record<string, any>
  ) => {
    trackEvent('performance_metric', 'performance', metric, {
      value,
      properties,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackAssessmentProgress,
    trackError,
    trackPerformance,
  };
}

// Hook for tracking component interactions
export function useComponentAnalytics(componentName: string) {
  const { trackUserAction, trackError } = useAnalytics();

  const trackInteraction = useCallback((
    action: string,
    properties?: Record<string, any>
  ) => {
    trackUserAction(action, 'component_interaction', {
      component: componentName,
      ...properties,
    });
  }, [trackUserAction, componentName]);

  const trackComponentError = useCallback((
    error: Error,
    additionalData?: Record<string, any>
  ) => {
    trackError(error, `component:${componentName}`, additionalData);
  }, [trackError, componentName]);

  return {
    trackInteraction,
    trackComponentError,
  };
}

// Hook for tracking form interactions
export function useFormAnalytics(formName: string) {
  const { trackUserAction, trackError } = useAnalytics();

  const trackFormStart = useCallback((properties?: Record<string, any>) => {
    trackUserAction('form_start', 'form_interaction', {
      form: formName,
      ...properties,
    });
  }, [trackUserAction, formName]);

  const trackFormSubmit = useCallback((
    success: boolean,
    properties?: Record<string, any>
  ) => {
    trackUserAction('form_submit', 'form_interaction', {
      form: formName,
      success,
      ...properties,
    });
  }, [trackUserAction, formName]);

  const trackFormError = useCallback((
    error: Error,
    field?: string,
    additionalData?: Record<string, any>
  ) => {
    trackError(error, `form:${formName}${field ? `:${field}` : ''}`, {
      form: formName,
      field,
      ...additionalData,
    });
  }, [trackError, formName]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormError,
  };
}

// Performance tracking hook
export function usePerformanceTracking(componentName: string) {
  const { trackPerformance } = useAnalytics();

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      trackPerformance('component_render_time', duration, {
        component: componentName,
      });
    };
  }, [componentName, trackPerformance]);

  const trackAsyncOperation = useCallback(
    <T,>(
      operationName: string,
      operation: () => Promise<T>
    ): Promise<T> => {
      const startTime = performance.now();

      return operation().then((result) => {
        const duration = performance.now() - startTime;

        trackPerformance('async_operation_time', duration, {
          component: componentName,
          operation: operationName,
          success: true,
        });

        return result;
      }).catch((error) => {
        const duration = performance.now() - startTime;

        trackPerformance('async_operation_time', duration, {
          component: componentName,
          operation: operationName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      });
    },
    [componentName, trackPerformance]
  );

  return {
    trackAsyncOperation,
  };
}

// Initialize analytics with user data
export function initializeAnalytics(userId?: string) {
  if (userId) {
    analyticsService.setUserId(userId);
  }
}

// Cleanup analytics on app unmount
export function cleanupAnalytics() {
  analyticsService.destroy();
}