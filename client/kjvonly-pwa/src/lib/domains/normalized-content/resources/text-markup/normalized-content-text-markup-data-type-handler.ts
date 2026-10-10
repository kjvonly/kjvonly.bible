import {
	z
} from 'zod';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import type {
	NormalizedContentTextMarkupMap
} from '../../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION
} from './normalized-content-text-markup-resource';

const markingSchema =
	z.object({
		class:
			z.array(
				z.string()
			)
	})
		.strict();

const contentMapSchema =
	z.record(
		z.string(),
		markingSchema
	);

const textMarkupMapSchema =
	z.record(
		z.string(),
		contentMapSchema
	);

/**
 * Validates the structural payload contract published by Normalized Content
 * Text Markup Resources.
 *
 * Resource identity owns the target document snapshot. The payload therefore
 * contains only the markings map. This handler validates canonical map keys and
 * shape without loading the target document; whether an address resolves to a
 * current canonical word remains an owning-feature concern.
 */
export class NormalizedContentTextMarkupDataTypeHandler
	implements ResourceDataTypeHandler<NormalizedContentTextMarkupMap> {

	readonly dataType =
		NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE;

	readonly dataVersion =
		NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION;

	validate(
		value: unknown
	): NormalizedContentTextMarkupMap {
		const markings =
			textMarkupMapSchema.parse(
				value
			) as NormalizedContentTextMarkupMap;

		validateAddresses(
			markings
		);

		return markings;
	}
}

function validateAddresses(
	markings: NormalizedContentTextMarkupMap
): void {
	for (
		const [
			blockId,
			content
		] of Object.entries(
			markings
		)
	) {
		if (blockId.length === 0) {
			throw new Error(
				'Invalid Normalized Content Text Markup block ID.'
			);
		}

		for (
			const contentIndex of
				Object.keys(
					content
				)
		) {
			parseCanonicalNonNegativeInteger(
				contentIndex
			);
		}
	}
}

function parseCanonicalNonNegativeInteger(
	value: string
): number {
	const parsed =
		Number.parseInt(
			value,
			10
		);

	if (
		!Number.isSafeInteger(parsed) ||
		parsed < 0 ||
		String(parsed) !== value
	) {
		throw new Error(
			`Invalid Normalized Content Text Markup content index: ${value}`
		);
	}

	return parsed;
}
