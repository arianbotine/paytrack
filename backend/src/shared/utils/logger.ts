import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (context) {
      log += ` [${String(context)}]`;
    }
    log += `: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: isProduction ? logFormat : consoleFormat,
    }),
    // File transport for errors (production only)
    ...(isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// Helper functions
export const logInfo = (message: string, context?: string, meta?: any) => {
  logger.info(message, { context, ...meta });
};

export const logError = (message: string, error?: Error, context?: string) => {
  logger.error(message, {
    context,
    error: error?.message,
    stack: error?.stack,
  });
};

export const logWarn = (message: string, context?: string, meta?: any) => {
  logger.warn(message, { context, ...meta });
};

export const logDebug = (message: string, context?: string, meta?: any) => {
  logger.debug(message, { context, ...meta });
};
