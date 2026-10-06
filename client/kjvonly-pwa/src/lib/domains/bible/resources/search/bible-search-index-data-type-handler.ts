import type {
	BibleSearchIndexChunks
} from '../../models/bible-search-index.model';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	BIBLE_SEARCH_INDEX_DATA_TYPE,
	BIBLE_SEARCH_INDEX_DATA_VERSION
} from './bible-search-index-resource';

const REQUIRED_FLEXSEARCH_CHUNKS =
	[
		'reg',
		'cfg',
		'map',
		'ctx'
	] as const;

/**
 * Validates the semantic FlexSearch export carried by published Bible Search
 * Index Resources.
 *
 * Resource-path meaning is intentionally excluded here. The path identifies
 * which Bible version the index belongs to; the Domain-object factory owns that
 * identity while this handler validates only the versioned payload contract.
 */
export class BibleSearchIndexDataTypeHandler
	implements ResourceDataTypeHandler<BibleSearchIndexChunks> {

	readonly dataType =
		BIBLE_SEARCH_INDEX_DATA_TYPE;

	readonly dataVersion =
		BIBLE_SEARCH_INDEX_DATA_VERSION;

	validate(
		value: unknown
	): BibleSearchIndexChunks {
		return validateBibleSearchIndexChunks(
			value
		);
	}
}


/**
 * Validates the Bible-owned semantic search-index payload independently from
 * Resource and Domain-object identity.
 *
 */
export function validateBibleSearchIndexChunks(
	value: unknown
): BibleSearchIndexChunks {
	if (
		!isRecord(
			value
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
			chunk
		] of Object.entries(
			value
		)
	) {
		if (
			typeof chunk !==
			'string'
		) {
			throw new Error(
				`Bible Search Index chunk ${key} must be a string.`
			);
		}

		validateJsonChunk(
			key,
			chunk
		);

		chunks[key] =
			chunk;
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

	return chunks as
		BibleSearchIndexChunks;
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
