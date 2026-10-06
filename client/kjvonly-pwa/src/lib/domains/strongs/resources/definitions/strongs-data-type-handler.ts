import {
	z
} from 'zod';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import type {
	StrongsContent
} from '../../models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '../../persistence/strongs-store';

import {
	STRONGS_DATA_TYPE,
	STRONGS_DATA_VERSION
} from './strongs-resource-contract';

interface DefinitionNodeValue {
	text:
		string;

	children:
		DefinitionNodeValue[] |
		null;
}

const definitionNodeSchema:
	z.ZodType<DefinitionNodeValue> =
	z.lazy(
		() =>
			z.object({
				text:
					z.string(),

				children:
					z.array(
						definitionNodeSchema
					).nullable()
			})
	);

const usageBySchema =
	z.object({
		text:
			z.string(),

		href:
			z.array(
				z.string()
			),

		class:
			z.array(
				z.string()
			)
	});

const strongsContentSchema =
	z.object({
		number:
			z.string(),

		originalWord:
			z.string(),

		partsOfSpeech:
			z.string(),

		phoneticSpelling:
			z.string(),

		transliteratedWord:
			z.string(),

		usageByBook:
			z.array(
				usageBySchema
			),

		usageByWord:
			z.array(
				usageBySchema
			),

		brownDef:
			definitionNodeSchema
				.nullable(),

		strongsDef:
			z.string(),

		thayersDef:
			definitionNodeSchema
				.nullable()
	});

const strongsBundleSchema =
	z.record(
		z.string(),
		strongsContentSchema
	);

export type StrongsResourceData =
	| StrongsContent
	| Readonly<
		Record<
			string,
			StrongsContent
		>
	>;

/**
 * Validates the existing Strong's semantic Resource payload.
 *
 * Resource-path identity is deliberately not interpreted here. A Strong's
 * Resource may contain either one definition or a version bundle; the Domain
 * Object factory owns mapping that accepted value to application identity.
 */
export class StrongsDataTypeHandler
	implements ResourceDataTypeHandler<StrongsResourceData> {

	readonly dataType =
		STRONGS_DATA_TYPE;

	readonly dataVersion =
		STRONGS_DATA_VERSION;

	validate(
		value: unknown
	): StrongsResourceData {
		const single =
			strongsContentSchema.safeParse(
				value
			);

		if (
			single.success
		) {
			return single.data;
		}

		return strongsBundleSchema.parse(
			value
		);
	}
}

/**
 * Validates the persisted Strong's definition semantic contract used when an
 * archived Domain object is reconstructed as an individual Resource.
 */
export class StrongsDefinitionDataTypeHandler
	implements ResourceDataTypeHandler<StrongsContent> {

	readonly dataType =
		STRONGS_DEFINITION_OBJECT_TYPE;

	readonly dataVersion =
		STRONGS_DATA_VERSION;

	validate(
		value: unknown
	): StrongsContent {
		return strongsContentSchema.parse(
			value
		);
	}
}

export function isStrongsContent(
	value: unknown
): value is StrongsContent {
	return (
		typeof value ===
			'object' &&
		value !== null &&
		'number' in value &&
		typeof (
			value as { number?: unknown }
		).number ===
			'string'
	);
}
