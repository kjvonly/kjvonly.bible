/** A definition format validates its content; Dictionary validates edition identity and headword associations. */
export interface DictionaryDefinitionFormatValidator {
	readonly definitionFormat: string;
	validateDefinition(key: string, value: unknown): void;
}
