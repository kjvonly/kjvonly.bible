import {
	z
} from 'zod';

import type {
	BiblePericopeMap
} from '../../models/bible-pericopes.model';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	BIBLE_PERICOPES_DATA_TYPE,
	BIBLE_PERICOPES_DATA_VERSION
} from './bible-pericopes-resource';

const pericopeWordSchema =
	z.object({
		text:
			z.string().min(1),

		class:
			z.array(
				z.string().min(1)
			).min(1).nullable(),

		href:
			z.array(
				z.string().min(1)
			).min(1).nullable(),

		emphasis:
			z.boolean()
	}).strict();

const pericopeSchema =
	z.object({
		text:
			z.string().min(1),

		ref:
			z.string().min(1),

		words:
			z.array(
				pericopeWordSchema
			).min(1)
	}).strict();

const pericopeMapSchema =
	z.record(
		z.string(),
		z.array(
			pericopeSchema
		).min(1)
	);

const pericopeBundleSchema =
	z.record(
		z.string(),
		pericopeMapSchema
	);

export type BiblePericopesResourceData =
	| BiblePericopeMap
	| Readonly<Record<
		string,
		BiblePericopeMap
	>>;

/**
 * Validates the structural payload contract published by Bible Pericopes
 * Resources.
 *
 * Resource-path meaning and Chapter-specific reference invariants remain the
 * responsibility of the Domain-object factory. This keeps one semantic
 * datatype usable by both canonical individual Resources and source bundles.
 */
export class BiblePericopesDataTypeHandler
	implements ResourceDataTypeHandler<BiblePericopesResourceData> {

	readonly dataType =
		BIBLE_PERICOPES_DATA_TYPE;

	readonly dataVersion =
		BIBLE_PERICOPES_DATA_VERSION;

	validate(
		value: unknown
	): BiblePericopesResourceData {
		return z.union([
			pericopeMapSchema,
			pericopeBundleSchema
		])
			.parse(
				value
			) as BiblePericopesResourceData;
	}
}
