import type { DictionaryDefinitionFormatValidator } from '$lib/domains/dictionary';
import { StrongsDefinitionDataTypeHandler } from './strongs-data-type-handler';

/** Adapt Strong's existing semantic validator to Dictionary's opaque-key storage contract. */
export class StrongsDictionaryDefinitionFormatValidator implements DictionaryDefinitionFormatValidator {
	readonly definitionFormat = 'strongs';
	private readonly content = new StrongsDefinitionDataTypeHandler();

	validateDefinition(key: string, value: unknown): void {
		if (!/^[GH]\d+$/.test(key)) {
			throw new Error(`Invalid Strong's key: ${key}`);
		}
		const definition = this.content.validate(value);
		if (definition.number !== key) {
			throw new Error(`Strong's key ${key} does not match content number ${definition.number}.`);
		}
	}
}
