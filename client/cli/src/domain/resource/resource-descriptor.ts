/**
 * Deferred instructions for resolving one concrete Resource.
 *
 * The descriptor deliberately keeps Resource type (`resourceType`) apart from
 * semantic payload identity (`dataType` + `dataVersion`). This mirrors the
 * manifest mental model documented in `client/cli/README.md`.
 */
export interface ResourceDescriptor {
	readonly metadata:
		ResourceDescriptorMetadata;

	/**
	 * Domain-owned scalar Resource-envelope metadata not consumed by generic
	 * Resource infrastructure (for example Bible `version`).
	 */
	readonly resourceMetadata?:
		Readonly<Record<string, string>>;

	readonly strategy:
		ResourceDescriptorStrategy;
}


/** Provider-independent metadata needed to identify and interpret a Resource. */
export interface ResourceDescriptorMetadata {
	readonly publisher:
		string;

	/** Publisher-controlled Resource identity (`d` at the Nostr boundary). */
	readonly resourceId:
		string;

	/**
	 * Canonical application Resource type (`t` at the Nostr boundary).
	 *
	 * Resource Type identifies what application object/concept the Resource
	 * represents; it is independent from the payload's semantic datatype.
	 */
	readonly resourceType:
		string;

	/** Semantic payload contract, independent from Resource Type. */
	readonly dataType:
		string;

	/** Version of the semantic payload contract identified by `dataType`. */
	readonly dataVersion:
		number;

	readonly modifiedAt:
		number;

	/** Wire/storage representation used to obtain terminal Resource content. */
	readonly representation:
		'content' | 'descriptors';

	readonly mediaType:
		string;
}


/** Strategy-specific instructions for resolving the described Resource bytes. */
export interface ResourceDescriptorStrategy {
	readonly type:
		string;

	readonly data:
		unknown;
}
