import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

declare global {
	var db: Database;
	var drizzleDB: BunSQLiteDatabase;
	var performanceObserver: PerformanceObserver;
	var wrappedTimers: Map<string, import('../wrapped-timer').WrappedTimer>;
}
