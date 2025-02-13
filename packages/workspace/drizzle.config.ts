import type { Config } from 'drizzle-kit';
 
export default {
  schema: './src/session/db/schema/*',
  out: './src/session/db/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: 'db.sqlite'
  },
  verbose: true,
  strict: true,
} satisfies Config;