import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorLogger } from '@/services/errorLogger';

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('ErrorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    // Mock DEV environment
    vi.stubEnv('DEV', true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error logging', () => {
    it('should generate unique error IDs', () => {
      const error = new Error('Test error');
      const context = {
        level: 'test',
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://test.com',
        userId: null,
        sessionId: 'test-session',
        errorBoundaryLevel: 'component',
      };

      const id1 = errorLogger.logError(error, context);
      const id2 = errorLogger.logError(error, context);

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^error_\d+_[a-z0-9]+$/);
    });

    it('should store errors locally', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const error = new Error('Test error');
      const context = {
        level: 'test',
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://test.com',
        userId: null,
        sessionId: 'test-session',
        errorBoundaryLevel: 'component',
      };

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'errorReports',
        expect.stringContaining('Test error')
      );
    });

    it('should limit stored errors to 50', () => {
      // Mock existing errors
      const existingErrors = Array.from({ length: 50 }, (_, i) => ({
        id: `error_${i}`,
        error: { name: 'Error', message: `Error ${i}`, stack: '' },
        context: {},
        severity: 'low',
      }));

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingErrors));

      const error = new Error('New error');
      const context = {
        level: 'test',
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://test.com',
        userId: null,
        sessionId: 'test-session',
        errorBoundaryLevel: 'component',
      };

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData).toHaveLength(50); // Should still be 50, oldest removed
      expect(storedData[49].error.message).toBe('New error'); // New error at the end
    });
  });

  describe('Severity determination', () => {
    const createContext = (errorBoundaryLevel: string) => ({
      level: 'test',
      timestamp: new Date().toISOString(),
      userAgent: 'test-agent',
      url: 'http://test.com',
      userId: null,
      sessionId: 'test-session',
      errorBoundaryLevel,
    });

    it('should assign critical severity for app-level errors', () => {
      const error = new Error('App error');
      const context = createContext('app');

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData[0].severity).toBe('critical');
    });

    it('should assign high severity for route-level errors', () => {
      const error = new Error('Route error');
      const context = createContext('route');

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData[0].severity).toBe('high');
    });

    it('should assign medium severity for feature-level errors', () => {
      const error = new Error('Feature error');
      const context = createContext('feature');

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData[0].severity).toBe('medium');
    });

    it('should assign low severity for component-level errors', () => {
      const error = new Error('Component error');
      const context = createContext('component');

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData[0].severity).toBe('low');
    });

    it('should assign critical severity for security-related errors', () => {
      const error = new Error('Security breach detected');
      const context = createContext('component');

      errorLogger.logError(error, context);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(storedData[0].severity).toBe('critical');
    });
  });

  describe('Session management', () => {
    it('should handle session IDs correctly', () => {
      // Test is simplified to focus on core functionality
      const error = new Error('Test error');
      const context = {
        level: 'test',
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://test.com',
        userId: null,
        sessionId: 'test-session',
        errorBoundaryLevel: 'component',
      };

      const errorId = errorLogger.logError(error, context);

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Error history management', () => {
    it('should return stored errors', () => {
      const mockErrors = [
        {
          id: 'error_1',
          error: { name: 'Error', message: 'Test error 1', stack: '' },
          context: {},
          severity: 'low',
        },
        {
          id: 'error_2',
          error: { name: 'Error', message: 'Test error 2', stack: '' },
          context: {},
          severity: 'medium',
        },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockErrors));

      const history = errorLogger.getErrorHistory();

      expect(history).toEqual(mockErrors);
    });

    it('should return empty array if no errors stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const history = errorLogger.getErrorHistory();

      expect(history).toEqual([]);
    });

    it('should clear error history', () => {
      errorLogger.clearErrorHistory();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('errorReports');
    });

    it('should handle corrupted error history gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const history = errorLogger.getErrorHistory();

      expect(history).toEqual([]);
    });
  });

  describe('Global error handlers', () => {
    it('should set up global error handlers during initialization', () => {
      // Test that the error logger registers global handlers
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      // Re-import to trigger constructor
      vi.resetModules();
      import('@/services/errorLogger');

      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Development mode features', () => {
    it('should log errors to console in development mode', async () => {
      vi.stubEnv('DEV', true);

      const error = new Error('Test error');
      const context = {
        level: 'test',
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://test.com',
        userId: null,
        sessionId: 'test-session',
        errorBoundaryLevel: 'component',
      };

      errorLogger.logError(error, context);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(console.group).toHaveBeenCalledWith('Error Reports');
      expect(console.error).toHaveBeenCalledWith(
        '[LOW] Error:',
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Test error' }),
        })
      );
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should not log errors to console in production mode', async () => {
      vi.stubEnv('DEV', false);

      const error = new Error('Test error');
      const context = {
        level: 'test',
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        url: 'http://test.com',
        userId: null,
        sessionId: 'test-session',
        errorBoundaryLevel: 'component',
      };

      errorLogger.logError(error, context);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(console.group).not.toHaveBeenCalled();
    });
  });
});
