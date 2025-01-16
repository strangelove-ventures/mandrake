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
        }
    };
}