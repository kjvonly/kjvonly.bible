import {
	z
} from 'zod';

import type {
	BibleParagraphMap
} from '../../models/bible-paragraphs.model';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	BIBLE_PARAGRAPHS_DATA_TYPE,
	BIBLE_PARAGRAPHS_DATA_VERSION
} from './bible-paragraphs-resource';

const paragraphMapSchema =
	z.record(
		z.string(),
		z.object({})
			.strict()
	);

const paragraphBundleSchema =
	z.record(
		z.string(),
		z.union([
			z.null(),
			paragraphMapSchema
		])
	);

export type BibleParagraphsResourceData =
	| BibleParagraphMap
	| Readonly<Record<
		string,
		BibleParagraphMap | null
	>>
	| null;

/**
 * Validates the structural payload contract published by Bible Paragraphs
 * Resources.
 *
 * Resource-path meaning is deliberately not interpreted here. A one-Chapter
 * Resource and a bundle share the same datatype; the Domain-object factory uses
 * the Resource path to decide which shape is expected and then applies the
 * Chapter-specific marker invariants.
 */
export class BibleParagraphsDataTypeHandler
	implements ResourceDataTypeHandler<BibleParagraphsResourceData> {

	readonly dataType =
		BIBLE_PARAGRAPHS_DATA_TYPE;

	readonly dataVersion =
		BIBLE_PARAGRAPHS_DATA_VERSION;

	validate(
		value: unknown
	): BibleParagraphsResourceData {
		if (
			value ===
				null
		) {
			return null;
		}

		const result =
			z.union([
				paragraphMapSchema,
				paragraphBundleSchema
			])
				.parse(
					value
				);

		return result as
			BibleParagraphsResourceData;
	}
}
