import { Database } from 'bun:sqlite';
import { env } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

const sqlite = new Database(`${env.SQLITE_DB_PATH}/${env.SQLITE_DB_NAME}`, { create: true });

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: './drizzle' });
