import {
	z
} from 'zod';

import type {
	StrongsContent
} from '$lib/domains/strongs/models/strongs.model';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	StrongsCandidate
} from './strongs-candidate';

import type {
	ValidatedStrongsCandidate
} from './validated-strongs-candidate';

const STRONGS_KEY_PATTERN =
	/^[GH]\d+$/;

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

export class StrongsValidator
	implements ResourceValidator<
		StrongsCandidate,
		ValidatedStrongsCandidate
	> {

	validate(
		candidate:
			StrongsCandidate
	): ValidatedStrongsCandidate {

		if (
			!STRONGS_KEY_PATTERN.test(
				candidate.key
			)
		) {
			throw new Error(
				`Invalid Strong's key: ${candidate.key}`
			);
		}

		const content:
			StrongsContent =
				strongsContentSchema.parse(
					candidate.value
				);

		if (
			content.number !==
			candidate.key
		) {
			throw new Error(
				`Strong's key ${candidate.key} does not match content number ${content.number}.`
			);
		}

		return {
			version:
				candidate.version,

			key:
				candidate.key,

			content
		};
	}
}