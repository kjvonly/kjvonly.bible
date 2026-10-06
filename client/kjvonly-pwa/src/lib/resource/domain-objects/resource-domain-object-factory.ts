import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

/** Resource context available after semantic payload validation. */
export type ResourceDomainObjectFactoryContext =
	Omit<
		DecodedResourceContent,
		'value'
	>;

/** One accepted Domain object produced from a Resource. */
export interface ResourceDomainObjectCandidate {
	readonly objectType:
		string;

	readonly objectId:
		string;

	/** Semantic contract of the accepted Domain object value. */
	readonly dataType:
		string;

	readonly dataVersion:
		number;

	readonly value:
		unknown;
}

/**
 * Converts one validated semantic Resource value into accepted Domain objects.
 *
 * A factory owns accepted Domain-object identity and persisted semantic metadata
 * for exactly one Resource Type. One Resource may produce zero, one, or many
 * Domain objects. Raw unvalidated Resource payload is intentionally not exposed
 * at this boundary.
 */
export interface ResourceDomainObjectFactory {
	readonly resourceType:
		string;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value:
			unknown
	): readonly ResourceDomainObjectCandidate[];
}
