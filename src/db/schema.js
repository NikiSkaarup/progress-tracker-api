import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
	.notNull()
	.$defaultFn(() => new Date());
const updatedAt = integer('updated_at', { mode: 'timestamp_ms' })
	.notNull()
	.$onUpdateFn(() => new Date());

export const bookmark = sqliteTable(
	'bookmark',
	{
		id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		href: text('href').notNull(),
		finished: integer('finished', { mode: 'boolean' }).notNull().default(false),
		createdAt,
		updatedAt,
	},
	(t) => ({
		bookmarkFinishedIndex: index('bookmarkFinishedIndex').on(t.finished).where(sql`finished = 1`),
	}),
);

export const bookmarkTag = sqliteTable(
	'bookmark_tag',
	{
		bookmarkId: integer('bookmark_id', { mode: 'number' }).references(() => bookmark.id),
		tagId: integer('tag_id', { mode: 'number' }).references(() => tag.id),
		createdAt,
	},
	(t) => ({
		bookmarkTagPrimaryKey: primaryKey({
			columns: [t.bookmarkId, t.tagId],
		}),
	}),
);

export const tag = sqliteTable('tag', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	variant: text('variant', { enum: ['default', 'secondary', 'destructive', 'outline'] })
		.notNull()
		.default('default'),
	createdAt,
	updatedAt,
});

/** @typedef {import('drizzle-orm').InferSelectModel<typeof bookmark>} SelectBookmark */
/** @typedef {SelectBookmark & {tags: Array<import('drizzle-orm').InferSelectModel<typeof tag>>}} SelectBookmarkWithTags */
/** @typedef {SelectBookmark & {tags?: Array<import('drizzle-orm').InferSelectModel<typeof tag>>}} SelectBookmarkWithOptionalTags */
