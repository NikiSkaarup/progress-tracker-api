import { PerformanceObserver } from 'node:perf_hooks';
import { bearer } from '@elysiajs/bearer';
import { cors } from '@elysiajs/cors';
import { env } from 'bun';
import { eq, like, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import colors from './colors';
import { drizzleDB } from './db';
import { bookmark, bookmarkTag, tag } from './db/schema';

/** @typedef {import('./db/schema').SelectBookmarkWithTags} SelectBookmarkWithTags */
/** @typedef {import('./db/schema').SelectBookmarkWithOptionalTags} SelectBookmarkWithOptionalTags */

const getBookmarkTags = drizzleDB
	.select({
		id: tag.id,
		name: tag.name,
		variant: tag.variant,
		createdAt: tag.createdAt,
		updatedAt: tag.updatedAt,
	})
	.from(tag)
	.innerJoin(bookmarkTag, eq(tag.id, bookmarkTag.tagId))
	.where(eq(bookmarkTag.bookmarkId, sql.placeholder('$id')))
	.prepare();

/**
 * Get all bookmarks with tags
 * @param {{items: Array<SelectBookmarkWithTags>} | undefined} stateBookmarks
 * @returns {Array<SelectBookmarkWithTags>}
 */
function getBookmarks(stateBookmarks = undefined) {
	try {
		performance.mark('getBookmarks');

		/** @type {Array<SelectBookmarkWithOptionalTags>}  */
		const bookmarks = drizzleDB.select().from(bookmark).all();

		const bookmarksWithTags = bookmarks.map((bookmark) => {
			bookmark.tags = getBookmarkTags.all({ $id: bookmark.id });
			return /** @type {SelectBookmarkWithTags}  */ (bookmark);
		});

		if (stateBookmarks !== undefined) {
			stateBookmarks.items = bookmarksWithTags;
		}

		return bookmarksWithTags;
	} catch (error) {
		console.error(error);
	} finally {
		performance.measure('getBookmarks', 'getBookmarks');
	}
	return [];
}

let isUpdatingBookmarks = false;
/**
 * Get all bookmarks with tags
 * @param {{items: Array<SelectBookmarkWithTags>} | undefined} stateBookmarks
 */
function updateBookmarks(stateBookmarks) {
	if (!stateBookmarks) {
		return;
	}
	if (isUpdatingBookmarks) {
		return;
	}
	isUpdatingBookmarks = true;
	try {
		setImmediate(getBookmarks, stateBookmarks);
	} catch (e) {
		console.error(e);
	} finally {
		isUpdatingBookmarks = false;
	}
}

const bookmarks = new Elysia({ prefix: '/bookmarks' })
	.state('bookmarks', { items: getBookmarks() })
	.get(
		'/',
		({ query, store }) => {
			if (query.q === undefined || query.q === '') {
				return store.bookmarks.items;
			}

			const search = query.q;

			return drizzleDB
				.select()
				.from(bookmark)
				.where(like(bookmark.name, `%${search}%`))
				.all();
		},
		{
			query: t.Object({
				q: t.Optional(t.String()),
			}),
		},
	)
	.post(
		'/',
		async ({ body, store }) => {
			await drizzleDB.insert(bookmark).values(body).execute();
			updateBookmarks(store.bookmarks);
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
		async ({ params, body, store }) => {
			await drizzleDB.update(bookmark).set(body).where(eq(bookmark.id, params.id)).execute();
			updateBookmarks(store.bookmarks);
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
		async ({ params, store }) => {
			await drizzleDB
				.update(bookmark)
				.set({ finished: params.finished })
				.where(eq(bookmark.id, params.id))
				.prepare()
				.execute();
			updateBookmarks(store.bookmarks);
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
		async ({ params, store }) => {
			await drizzleDB.delete(bookmark).where(eq(bookmark.id, params.id)).execute();
			updateBookmarks(store.bookmarks);
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
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

if (env.NODE_ENV !== 'production') {
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

	if (globalThis.performanceObserver) {
		globalThis.performanceObserver.disconnect();
	}
	globalThis.performanceObserver = new PerformanceObserver(observerCallback);
	globalThis.performanceObserver.observe({ entryTypes: ['measure'] });
}
