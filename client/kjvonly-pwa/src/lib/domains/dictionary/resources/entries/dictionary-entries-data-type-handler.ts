import type { ResourceDataTypeHandler } from '$lib/resource';

import { normalizeDictionaryHeadword } from '../../models/dictionary-identity';
import type { DictionaryEntriesBundle } from '../../models/dictionary.model';
import {
	DICTIONARY_DATA_VERSION,
	DICTIONARY_ENTRIES_DATA_TYPE
} from './dictionary-resource-contract';

/**
 * Validate a *keyed* complete edition bundle; CLI source records must first be
 * grouped into nonempty ordered definition arrays. Validation does not parse HTML
 * or produce a second deep copy of the entire dictionary in memory.
 */
export class DictionaryEntriesDataTypeHandler
	implements ResourceDataTypeHandler<DictionaryEntriesBundle> {
	readonly dataType = DICTIONARY_ENTRIES_DATA_TYPE;
	readonly dataVersion = DICTIONARY_DATA_VERSION;

	validate(value: unknown): DictionaryEntriesBundle {
		if (!isRecord(value)) {
			throw new Error('Dictionary entries Resource must be a keyed object.');
		}

		const keys = Object.keys(value);
		if (keys.length === 0) {
			throw new Error('Dictionary entries Resource cannot be empty.');
		}

		for (const key of keys) {
			if (!key || key !== normalizeDictionaryHeadword(key)) {
				throw new Error(`Invalid canonical Dictionary headword: ${key}`);
			}

			const definitions = value[key];
			if (!Array.isArray(definitions) || definitions.length === 0) {
				throw new Error(`Dictionary headword ${key} requires definitions.`);
			}

			for (const definition of definitions) {
				if (
					!isRecord(definition) ||
					Object.keys(definition).length !== 2 ||
					!Object.hasOwn(definition, 'word') ||
					!Object.hasOwn(definition, 'content') ||
					typeof definition.word !== 'string' ||
					normalizeDictionaryHeadword(definition.word) !== key ||
					typeof definition.content !== 'string' ||
					!definition.content.trim()
				) {
					throw new Error(`Invalid Dictionary definition for headword ${key}.`);
				}
			}
		}

		return value as DictionaryEntriesBundle;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
