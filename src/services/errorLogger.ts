interface ErrorContext {
  level: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId: string | null;
  sessionId: string;
  componentStack?: string;
  errorBoundaryLevel: string;
  additionalContext?: Record<string, any>;
}

interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorLogger {
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;
  private maxQueueSize = 100;

  constructor() {
    this.setupOnlineListener();
    this.setupUnhandledErrorListeners();
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupUnhandledErrorListeners() {
    // Global error handler for unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      const error = new Error(event.message);
      error.stack = `${event.filename}:${event.lineno}:${event.colno}`;

      this.logError(error, {
        level: 'global',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        errorBoundaryLevel: 'global',
        additionalContext: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Global handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);

      this.logError(error, {
        level: 'promise',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        errorBoundaryLevel: 'global',
        additionalContext: {
          promiseRejectionReason: event.reason,
        },
      });
    });
  }

  public logError(error: Error, context: ErrorContext): string {
    const errorId = this.generateErrorId();

    const errorReport: ErrorReport = {
      id: errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      severity: this.determineSeverity(error, context),
    };

    // Store locally first
    this.storeErrorLocally(errorReport);

    // Add to queue for remote reporting
    this.queueError(errorReport);

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue();
    }

    return errorId;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: App-level errors, security issues
    if (context.errorBoundaryLevel === 'app' || error.message.includes('security')) {
      return 'critical';
    }

    // High: Route-level errors, data corruption
    if (context.errorBoundaryLevel === 'route' || error.message.includes('corruption')) {
      return 'high';
    }

    // Medium: Feature-level errors, network issues
    if (context.errorBoundaryLevel === 'feature' || error.message.includes('network')) {
      return 'medium';
    }

    // Low: Component-level errors, validation issues
    return 'low';
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const existingErrors = this.getStoredErrors();
      existingErrors.push(errorReport);

      // Keep only the most recent 50 errors
      const recentErrors = existingErrors.slice(-50);

      localStorage.setItem('errorReports', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }

  private getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('errorReports');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  private queueError(errorReport: ErrorReport) {
    this.errorQueue.push(errorReport);

    // Prevent queue from growing too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // In a real app, this would send to your error reporting service
      // For now, we'll just log to console in development
      if (import.meta.env.DEV) {
        console.group('Error Reports');
        errorsToSend.forEach(report => {
          console.error(`[${report.severity.toUpperCase()}] ${report.error.name}:`, report);
        });
        console.groupEnd();
      }

      // Example: Send to external service
      await this.sendToErrorService(errorsToSend);
    } catch (e) {
      // If sending fails, add errors back to queue
      this.errorQueue.unshift(...errorsToSend);
      console.warn('Failed to send error reports:', e);
    }
  }

  private async sendToErrorService(_errors: ErrorReport[]): Promise<void> {
    // This would integrate with services like:
    // - Sentry: Sentry.captureException()
    // - LogRocket: LogRocket.captureException()
    // - Bugsnag: Bugsnag.notify()
    // - Custom API endpoint

    // For now, simulate API call
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  private getUserId(): string | null {
    return localStorage.getItem('userId') || null;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  public getErrorHistory(): ErrorReport[] {
    return this.getStoredErrors();
  }

  public clearErrorHistory(): void {
    localStorage.removeItem('errorReports');
  }
}

export const errorLogger = new ErrorLogger();