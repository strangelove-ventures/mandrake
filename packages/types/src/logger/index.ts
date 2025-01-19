import winston from 'winston';

export interface MandrakeLogger extends winston.Logger {
    child(options: { service: string | string[] }): this;
}

// Create the base logger configuration
export const createLogger = (serviceName: string = 'mandrake'): MandrakeLogger => {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                // Build service chain (e.g. "mandrake:mcp:docker")
                const serviceChain = Array.isArray(service) ? service.join(':') : service;
                return `[${timestamp}] ${level.toUpperCase()} [${serviceChain}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''
                    }`;
            })
        ),
        defaultMeta: { service: [serviceName] },
        transports: [new winston.transports.Console()]
    }) as MandrakeLogger;
};

// Base logger instance
export const logger = createLogger();

// Helper for creating package-level loggers
export const createPackageLogger = (packageName: string) => {
    return logger.child({
        service: [...(logger.defaultMeta.service as string[]), packageName]
    });
};

// Re-export winston types
export { Logger } from 'winston';