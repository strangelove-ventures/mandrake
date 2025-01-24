import pkg from 'pg';
const { Client } = pkg;

const DB_CONFIG = {
    user: 'postgres',
    password: 'password',
    database: 'postgres',
    host: 'postgres',
    port: '5432'
};

async function setupDatabaseUser(): Promise<void> {
    const client = new Client({
        host: DB_CONFIG.host,
        port: parseInt(DB_CONFIG.port),
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database
    });

    try {
        await client.connect();
        
        // Create database and user
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_CONFIG.user}') THEN
                    CREATE USER ${DB_CONFIG.user} WITH PASSWORD '${DB_CONFIG.password}' SUPERUSER;
                END IF;
            END
            $$;
        `);

        // Drop all existing tables to ensure clean state
        await client.query(`
            DO $$ 
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `);

        // Grant all necessary permissions
        await client.query(`
            GRANT ALL PRIVILEGES ON DATABASE ${DB_CONFIG.database} TO ${DB_CONFIG.user};
            GRANT ALL PRIVILEGES ON SCHEMA public TO ${DB_CONFIG.user};
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_CONFIG.user};
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_CONFIG.user};
            GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${DB_CONFIG.user};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT ALL ON TABLES TO ${DB_CONFIG.user};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT ALL ON SEQUENCES TO ${DB_CONFIG.user};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT ALL ON FUNCTIONS TO ${DB_CONFIG.user};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                GRANT ALL ON TYPES TO ${DB_CONFIG.user};
        `);

        console.log('Database setup completed successfully');
    } catch (err) {
        console.error('Error setting up database:', err);
        throw err;
    } finally {
        await client.end();
    }
}

// Handle command line arguments
const command = process.argv[2];
switch (command) {
    case 'start':
        setupDatabaseUser();
        break;
    default:
        console.log('Usage: npm run db start');
}
