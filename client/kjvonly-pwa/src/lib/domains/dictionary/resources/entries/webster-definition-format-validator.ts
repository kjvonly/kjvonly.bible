import { normalizeDictionaryHeadword } from '../../models/dictionary-identity';
import type { DictionaryDefinition } from '../../models/dictionary.model';
import type { DictionaryDefinitionFormatValidator } from './dictionary-definition-format-validator';

/** Validate the existing ordered HTML definition records without parsing or normalizing HTML. */
export class WebsterDefinitionFormatValidator implements DictionaryDefinitionFormatValidator {
	readonly definitionFormat = 'webster-html';

	validateDefinition(key: string, value: unknown): void {
		if (!isWebsterDefinitions(value, key)) {
			throw new Error(`Invalid Dictionary definition for key ${key}.`);
		}
	}
}

function isWebsterDefinitions(value: unknown, key: string): value is readonly DictionaryDefinition[] {
	return Array.isArray(value) && value.length > 0 && value.every(item =>
		isRecord(item) && Object.keys(item).length === 2 &&
		typeof item.word === 'string' && normalizeDictionaryHeadword(item.word) === key &&
		typeof item.content === 'string' && item.content.trim().length > 0
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
