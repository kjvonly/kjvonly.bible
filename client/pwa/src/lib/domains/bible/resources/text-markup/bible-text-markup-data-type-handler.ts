import {
	z
} from 'zod';

import type {
	BibleTextMarkupMap
} from '../../models/bible-text-markup.model';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	BIBLE_TEXT_MARKUP_DATA_TYPE,
	BIBLE_TEXT_MARKUP_DATA_VERSION
} from './bible-text-markup-resource';

const markingSchema =
	z.object({
		class:
			z.array(
				z.string()
			)
	})
		.strict();

const wordMapSchema =
	z.record(
		z.string(),
		markingSchema
	);

const textMarkupMapSchema =
	z.record(
		z.string(),
		wordMapSchema
	);

const textMarkupBundleSchema =
	z.record(
		z.string(),
		textMarkupMapSchema
	);

export type BibleTextMarkupResourceData =
	| BibleTextMarkupMap
	| Readonly<Record<
		string,
		BibleTextMarkupMap
	>>;

/**
 * Validates the structural payload contract published by Bible Text Markup
 * Resources.
 *
 * The same datatype is used by both one-Chapter Resources and named bundles.
 * Resource-path meaning and canonical Bible reference rules remain in the
 * Domain-object factory so datatype validation stays independent of Resource
 * identity.
 */
export class BibleTextMarkupDataTypeHandler
	implements ResourceDataTypeHandler<BibleTextMarkupResourceData> {

	readonly dataType =
		BIBLE_TEXT_MARKUP_DATA_TYPE;

	readonly dataVersion =
		BIBLE_TEXT_MARKUP_DATA_VERSION;

	validate(
		value: unknown
	): BibleTextMarkupResourceData {
		return z.union([
			textMarkupMapSchema,
			textMarkupBundleSchema
		])
			.parse(
				value
			) as BibleTextMarkupResourceData;
	}
}
