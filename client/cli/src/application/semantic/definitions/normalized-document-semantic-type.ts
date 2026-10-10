import type {
	SemanticTypeDefinition
} from '../semantic-type-registry.js';

/** The CLI's existing normalized-document validator capability. */
interface NormalizedDocumentValidator {
	validate(value: unknown): unknown;
}

/**
 * Registers the standalone Normalized Document v1 Resource contract.
 * Metadata matches the PWA Normalized Content Resource contract; validators
 * for other Domain-owned contracts will be registered separately.
 */
export function createNormalizedDocumentSemanticType(
	validator: NormalizedDocumentValidator
): SemanticTypeDefinition {
	return {
		dataType: 'kjvonly.normalized-document',
		dataVersion: 1,
		resourceType: 'normalized-content/document',
		objectType: 'normalized-content/document',
		validate(value: unknown): void {
			validator.validate(value);
		}
	};
}
