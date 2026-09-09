import type {
	BibleSearchIndexChunks
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	BibleSearchIndexCandidate
} from './bible-search-index-candidate';

import type {
	ValidatedBibleSearchIndexCandidate
} from './validated-bible-search-index-candidate';

const REQUIRED_FLEXSEARCH_CHUNKS =
	[
		'reg',
		'cfg',
		'map',
		'ctx'
	] as const;

export class BibleSearchIndexValidator
	implements ResourceValidator<
		BibleSearchIndexCandidate,
		ValidatedBibleSearchIndexCandidate
	> {

	validate(
		candidate:
			BibleSearchIndexCandidate
	): ValidatedBibleSearchIndexCandidate {
		if (
			!isRecord(
				candidate.value
			)
		) {
			throw new Error(
				'Bible Search Index content must be an object.'
			);
		}

		const chunks:
			Record<string, string> =
			{};

		for (
			const [
				key,
				value
			] of Object.entries(
				candidate.value
			)
		) {
			if (
				typeof value !==
				'string'
			) {
				throw new Error(
					`Bible Search Index chunk ${key} must be a string.`
				);
			}

			validateJsonChunk(
				key,
				value
			);

			chunks[key] =
				value;
		}

		for (
			const key of
				REQUIRED_FLEXSEARCH_CHUNKS
		) {
			if (
				chunks[key] ===
				undefined
			) {
				throw new Error(
					`Bible Search Index is missing required FlexSearch chunk: ${key}`
				);
			}
		}

		validateConfiguration(
			chunks.cfg
		);

		return {
			version:
				candidate.version,

			chunks:
				chunks as BibleSearchIndexChunks
		};
	}
}

function validateJsonChunk(
	key: string,
	value: string
): void {
	try {
		JSON.parse(
			value
		);
	} catch {
		throw new Error(
			`Bible Search Index FlexSearch chunk ${key} must contain valid JSON.`
		);
	}
}

function validateConfiguration(
	value: string
): void {
	const config =
		JSON.parse(
			value
		) as unknown;

	if (
		!isRecord(
			config
		) ||
		config.doc !==
			0 ||
		(
			config.opt !==
				0 &&
			config.opt !==
				1
		)
	) {
		throw new Error(
			'Bible Search Index cfg chunk is not a supported FlexSearch Index configuration.'
		);
	}
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !==
			null &&
		!Array.isArray(
			value
		)
	);
}
