/**
 * Logger Utility
 * 
 * Provides structured logging with environment-based log levels.
 * In production, only WARN and ERROR levels are shown.
 * In development, all log levels are available.
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const getLogLevel = (): LogLevel => {
  if (typeof process === 'undefined') {
    // Browser environment
    return import.meta.env.PROD ? LogLevel.WARN : LogLevel.DEBUG;
  }
  // Node.js environment
  return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
};

const CURRENT_LEVEL = getLogLevel();

interface LogContext {
  module?: string;
  component?: string;
  userId?: string;
  youthId?: string;
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}]${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (CURRENT_LEVEL <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (CURRENT_LEVEL <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (CURRENT_LEVEL <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = error ? `${message}: ${errorMessage}` : message;
    console.error(this.formatMessage('ERROR', fullMessage, context));
    
    // In development, also log the full error stack
    if (error instanceof Error && CURRENT_LEVEL <= LogLevel.DEBUG) {
      console.error(error.stack);
    }
  }
}

export const logger = new Logger();
export { LogLevel, LogContext };
