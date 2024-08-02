import { PerformanceObserver } from 'node:perf_hooks';
import { bearer } from '@elysiajs/bearer';
import { cors } from '@elysiajs/cors';
import serverTiming from '@elysiajs/server-timing';
import { env } from 'bun';
import { desc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { nanoid } from 'nanoid';
import colors from './colors';
import { db, drizzleDB } from './db';
import { bookmark } from './db/schema';

/** @typedef {import('./db/schema').SelectBookmark} SelectBookmark */

/** @type {import('bun:sqlite').Statement<void, Array<{
 * id: number;
 * name: string;
 * href: string;
 * finished: boolean;
 * createdAt: number;
 * updatedAt: number;
 * }>>}
 */
const getBookmarks = db.query('SELECT * FROM bookmark ORDER BY id DESC');

// const getBookmarks = drizzleDB.select().from(bookmark).orderBy(desc(bookmark.id)).prepare();

const bookmarks = new Elysia({ prefix: '/bookmarks' })
	// .get('/', () => getBookmarks.all())
	.get('/', () => getBookmarks.all())
	.post(
		'/',
		async ({ body }) => {
			await drizzleDB.insert(bookmark).values(body).execute();
		},
		{
			body: t.Object({
				name: t.String(),
				href: t.String(),
			}),
		},
	)
	.put(
		'/',
		async ({ body }) => {
			const tx = drizzleDB.transaction(async (trx) => {
				const bm = trx.select().from(bookmark).where(eq(bookmark.name, body.name)).get();
				if (bm === undefined) {
					await trx.insert(bookmark).values(body).execute();
					return true;
				}
				await trx.update(bookmark).set(body).where(eq(bookmark.name, body.name)).execute();
				return false;
			});

			return { created: await tx };
		},
		{
			body: t.Object({
				name: t.String(),
				href: t.String(),
			}),
		},
	)
	.put(
		'/:id',
		async ({ params, body }) => {
			await drizzleDB.update(bookmark).set(body).where(eq(bookmark.id, params.id)).execute();
		},
		{
			params: t.Object({
				id: t.Numeric(),
			}),
			body: t.Object({
				name: t.String(),
				href: t.String(),
			}),
		},
	)
	.put(
		'/:id/check/:finished',
		async ({ params }) => {
			await drizzleDB
				.update(bookmark)
				.set({ finished: params.finished })
				.where(eq(bookmark.id, params.id))
				.execute();
		},
		{
			params: t.Object({
				id: t.Numeric(),
				finished: t.BooleanString(),
			}),
		},
	)
	.delete(
		'/:id',
		async ({ params }) => {
			await drizzleDB.delete(bookmark).where(eq(bookmark.id, params.id)).execute();
		},
		{
			params: t.Object({
				id: t.Numeric(),
			}),
		},
	);

const app = new Elysia()
	.derive(() => ({
		requestId: nanoid(),
	}))
	.onBeforeHandle((ctx) => {
		performance.mark(ctx.requestId);
	})
	.onAfterHandle((ctx) => {
		performance.measure(ctx.requestId, ctx.requestId);
	})
	.use(
		serverTiming({
			enabled: true,
			allow: true,
			report: false,
		}),
	)
	.use(cors())
	.get('/', () => 'Hello, PT API!')
	.use(bearer())
	.guard(
		{
			beforeHandle({ set, bearer }) {
				if (bearer === undefined || bearer !== env.BEARER_TOKEN) {
					set.status = 400;
					set.headers['WWW-Authenticate'] = `Bearer realm='sign', error="invalid_request"`;
					return 'Unauthorized';
				}
			},
		},
		(app) => app.use(bookmarks),
	)
	.listen(env.PORT || 3000);

console.log(`Progress tracker api is running at ${app.server?.hostname}:${app.server?.port}`);

// if (env.NODE_ENV !== 'production') {
// when running in development mode, log performance measures

/** @type {import('node:perf_hooks').PerformanceObserverCallback} */
function observerCallback(entries) {
	const entriesArr = [...entries.getEntries()];
	for (let i = entriesArr.length; i--; ) {
		const entry = entriesArr[i];
		if (entry.entryType === 'measure') {
			console.info(
				`${colors.fgGreen}${entry.name}${colors.reset} ${colors.fgYellow}${entry.duration
					.toFixed(3)
					.padStart(7, '0')}${colors.reset}ms`,
			);
		}
	}
}

// @ts-ignore
if (globalThis.performanceObserver !== undefined) {
	globalThis.performanceObserver.disconnect();
}
globalThis.performanceObserver = new PerformanceObserver(observerCallback);
globalThis.performanceObserver.observe({ entryTypes: ['measure'] });
// }
