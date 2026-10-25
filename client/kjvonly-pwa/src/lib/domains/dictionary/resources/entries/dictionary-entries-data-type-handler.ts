import type { ResourceDataTypeHandler } from '$lib/resource';

import { normalizeDictionaryHeadword } from '../../models/dictionary-identity';
import type { DictionaryEditionBundle, HeadwordMatch } from '../../models/dictionary.model';
import type { DictionaryDefinitionFormatValidator } from './dictionary-definition-format-validator';
import { DICTIONARY_DATA_VERSION, DICTIONARY_ENTRIES_DATA_TYPE } from './dictionary-resource-contract';

/** Validate the shared bundle contract and delegate definition semantics to the registered format. */
export class DictionaryEntriesDataTypeHandler
	implements ResourceDataTypeHandler<DictionaryEditionBundle> {
	readonly dataType = DICTIONARY_ENTRIES_DATA_TYPE;
	readonly dataVersion = DICTIONARY_DATA_VERSION;

	constructor(private readonly formats: readonly DictionaryDefinitionFormatValidator[]) {}

	validate(value: unknown): DictionaryEditionBundle {
		if (!isRecord(value) || !Array.isArray(value.headwords) || !isRecord(value.definitions)) {
			throw new Error('Dictionary entries Resource must contain headwords and definitions.');
		}
		const format = this.formats.find(item => item.definitionFormat === value.definitionFormat);
		if (!format) {
			throw new Error(`Unsupported Dictionary definition format: ${String(value.definitionFormat)}`);
		}
		const definitions = value.definitions;
		if (Object.keys(definitions).length === 0 || value.headwords.length === 0) {
			throw new Error('Dictionary edition requires definitions and headwords.');
		}

		for (const [key, definition] of Object.entries(definitions)) {
			if (!key) {
				throw new Error('Dictionary definition key cannot be empty.');
			}
			format.validateDefinition(key, definition);
		}

		const pairs = new Set<string>();
		for (const item of value.headwords) {
			if (!isHeadwordMatch(item) || item.headword !== normalizeDictionaryHeadword(item.headword)) {
				throw new Error('Invalid canonical Dictionary headword association.');
			}
			if (!Object.hasOwn(definitions, item.key)) {
				throw new Error(`Dictionary headword refers to a missing definition key: ${item.key}`);
			}
			const pair = JSON.stringify([item.headword, item.key]);
			if (pairs.has(pair)) {
				throw new Error(`Duplicate Dictionary headword association: ${pair}`);
			}
			pairs.add(pair);
		}
		return value as unknown as DictionaryEditionBundle;
	}
}

function isHeadwordMatch(value: unknown): value is HeadwordMatch {
	return isRecord(value) && typeof value.headword === 'string' && value.headword.length > 0 &&
		typeof value.key === 'string' && value.key.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
