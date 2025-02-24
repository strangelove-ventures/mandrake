// In a test-utils.ts file
import { mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function createTestDir() {
    return await mkdtemp(join(tmpdir(), 'ripper-test-'));
}

export function createTestContext(): any {
    return {
        reportProgress: async () => { },
        log: {
            debug: () => { },
            error: () => { },
            info: () => { },
            warn: () => { }
        }
    };
}
