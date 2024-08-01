import { PerformanceObserver } from 'node:perf_hooks';
import { bearer } from '@elysiajs/bearer';
import { cors } from '@elysiajs/cors';
import { env } from 'bun';
import { eq, like, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import colors from './colors';
import { drizzleDB } from './db';
import { bookmark } from './db/schema';

/** @typedef {import('./db/schema').SelectBookmarkWithTags} SelectBookmarkWithTags */
/** @typedef {import('./db/schema').SelectBookmarkWithOptionalTags} SelectBookmarkWithOptionalTags */
/** @typedef {import('./db/schema').SelectBookmark} SelectBookmark */

const getBookmarks = drizzleDB.select().from(bookmark).prepare();
const getBookmarksSearchName = drizzleDB
	.select()
	.from(bookmark)
	.where(like(bookmark.name, sql.placeholder('search')))
	.prepare();

const bookmarks = new Elysia({ prefix: '/bookmarks' })
	.get(
		'/',
		({ query }) => {
			if (query.q === undefined || query.q === '') {
				return getBookmarks.all();
			}

			const search = query.q.trim();
			if (search.length === 0) {
				return [];
			}

			return getBookmarksSearchName.all({ search: `%${search}%` });
		},
		{
			query: t.Object({
				q: t.Optional(t.String()),
			}),
		},
	)
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
					return;
				}
				await trx.update(bookmark).set(body).where(eq(bookmark.name, body.name)).execute();
			});

			await tx;
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
				.prepare()
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
	.use(cors())
	.get('/', () => 'Hello, Elysia!')
	.use(bearer())
	.guard(
		{
			beforeHandle({ set, bearer }) {
				if (!bearer || bearer !== env.BEARER_TOKEN) {
					set.status = 400;
					set.headers['WWW-Authenticate'] = `Bearer realm='sign', error="invalid_request"`;
					return 'Unauthorized';
				}
			},
		},
		(app) => app.use(bookmarks),
	)
	.listen(env.PORT || 3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

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
