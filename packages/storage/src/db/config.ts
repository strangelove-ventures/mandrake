// scripts/db/config.ts
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DbConfig {
    constructor(
        public readonly name: string,
        public readonly image: string,
        public readonly user: string,
        public readonly password: string,
        public readonly database: string,
        public readonly port: string,
        public readonly dataDir: string
    ) { }

    get connectionUrl(): string {
        return `postgresql://${this.user}:${this.password}@localhost:${this.port}/${this.database}`;
    }

    // Helper to create test config with overrides
    createTestConfig(overrides: Partial<DbConfig>): DbConfig {
        return new DbConfig(
            overrides.name ?? `${this.name}-test`,
            overrides.image ?? this.image,
            overrides.user ?? this.user,
            overrides.password ?? this.password,
            overrides.database ?? `${this.database}_test`,
            overrides.port ?? '5433',
            overrides.dataDir ?? path.join(path.dirname(this.dataDir), 'testdb')
        );
    }
}

// Default development config
export const devConfig = new DbConfig(
    'mandrake-postgres-dev',
    'postgres:14-alpine',
    'postgres',
    'password',
    'postgres',
    '5432',
    path.join(path.dirname(path.dirname(path.dirname(path.dirname(__dirname)))), 'devdb')
);