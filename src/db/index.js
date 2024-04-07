import { Database } from 'bun:sqlite';
import { env } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { createWrappedTimer } from '../wrapped-timer';

function initDb() {
	global.db.query('PRAGMA journal_mode = WAL').run();
	global.db.query('PRAGMA synchronous = NORMAL').run();

	// global.DB.query('PRAGMA journal_mode = delete');
	// global.DB.query('PRAGMA journal_mode = WAL2');

	global.db.query('PRAGMA auto_vacuum = INCREMENTAL').run();
	global.db.query('PRAGMA wal_autocheckpoint = 1000').run();
}

function vacuumDb() {
	global.db.query('PRAGMA incremental_vacuum').run();
}

function optimizeDb() {
	global.db.query('PRAGMA optimize').run();
}

if (global.db === undefined || global.drizzleDB === undefined) {
	global.db = new Database(`${env.SQLITE_DB_PATH}/${env.SQLITE_DB_NAME}`, { create: true });
	initDb();
	global.drizzleDB = drizzle(global.db);
	migrate(global.drizzleDB, { migrationsFolder: './drizzle' });
}

const vacuumInterval = 1000 * 30; // 30 seconds
const vacuumRunnable = createWrappedTimer('databaseVacuum', vacuumDb, vacuumInterval);
setTimeout(vacuumRunnable.callback, 0);
const optimizeInterval = 1000 * 60 * 30; // 30 minutes
const optimizeRunnable = createWrappedTimer('databaseOptimize', optimizeDb, optimizeInterval);
setTimeout(optimizeRunnable.callback, 0);

export const db = global.db;
export const drizzleDB = global.drizzleDB;
