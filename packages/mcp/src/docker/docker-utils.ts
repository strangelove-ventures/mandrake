import Docker from 'dockerode';
import { ServerConfig } from '@mandrake/types';

export const IGNORE_CODES = {
    NOT_FOUND: 404,
    CONFLICT: 409,
} as const;

export function isDockerError(err: any, codes: number[]): boolean {
    return err?.statusCode && codes.includes(err.statusCode);
}

export function handleDockerError(err: any, ignoreCodes: number[] = [IGNORE_CODES.NOT_FOUND, IGNORE_CODES.CONFLICT]): void {
    if (!isDockerError(err, ignoreCodes)) {
        throw err;
    }
}

export function prepareContainerConfig(config: ServerConfig): Docker.ContainerCreateOptions {
    return {
        Image: config.image,
        Entrypoint: config.entrypoint,
        Cmd: config.command,
        Env: config.env ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`) : [],
        Labels: {
            'mandrake.mcp.managed': 'true',
            'mandrake.mcp.name': config.name,
            ...config.labels
        },
        // Standard settings
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        OpenStdin: true,
        StdinOnce: false,
        Tty: false,
        HostConfig: {
            Privileged: config.privileged,
            AutoRemove: false,
            Binds: config.volumes?.map(v => `${v.source}:${v.target}:${v.mode || 'rw'}`),
            ...config.hostConfig,
        },
        Healthcheck: {
            Test: ["CMD", "ps", "aux"],
            Interval: 1000000000, // 1s in nanoseconds
            Timeout: 1000000000,
            Retries: 3
        }
    };
}

export enum DockerErrorCode {
    NotFound = 404,
    Conflict = 409,
    ServerError = 500
}

export function isContainerNotFoundError(err: any): boolean {
    return err?.statusCode === DockerErrorCode.NotFound;
}

export function isContainerConflictError(err: any): boolean {
    return err?.statusCode === DockerErrorCode.Conflict;
}

export function isContainerInRemovalError(err: any): boolean {
    return err?.statusCode === DockerErrorCode.ServerError &&
        err.message?.includes('Removal In Progress');
}

// Retry helper for common Docker operations
export async function retryDockerOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (err) {
            lastError = err;

            // If it's not a retriable error, throw immediately
            if (!isContainerNotFoundError(err) &&
                !isContainerConflictError(err) &&
                !isContainerInRemovalError(err)) {
                throw err;
            }

            // Last attempt, throw the error
            if (attempt === maxAttempts - 1) {
                throw lastError;
            }
        }
    }

    throw lastError;
}