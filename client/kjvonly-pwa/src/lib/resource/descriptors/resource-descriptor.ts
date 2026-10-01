import type {
	ResourceMetadata,
	ResourceRepresentationType
} from '$lib/resource/models/resource.model';

/** Algorithm-independent digest metadata for resolved Resource content. */
export interface ResourceDescriptorHash {
	readonly algorithm: string;

	readonly value: string;
}

export interface ResourceDescriptor {
	readonly metadata:
		ResourceDescriptorMetadata;

	/** Additional protocol-agnostic metadata belonging to the described Resource. */
	readonly resourceMetadata?:
		ResourceMetadata;

	readonly strategy:
		ResourceDescriptorStrategy;
}

/** Metadata that describes the target Resource independently of its provider. */
export interface ResourceDescriptorMetadata {
	readonly publisher: string;

	readonly resourceId: string;

	/** Optional arbitrary human-facing display name for the Resource. */
	readonly name?: string;

	/** Resource category used for ResourceHandler routing. */
	readonly category: string;

	/** Optional semantic application contract represented by the Resource. */
	readonly dataType?: string;

	readonly modifiedAt: number;

	readonly representation:
		ResourceRepresentationType;

	/** Physical media/serialization format of the resolved Resource content. */
	readonly mediaType: string;

	/** Optional resolved content size in bytes. */
	readonly size?: number;

	/** Optional algorithm-independent digest of the resolved content bytes. */
	readonly hash?:
		ResourceDescriptorHash;

	/** Optional extended metadata for application/catalog presentation. */
	readonly attributes?:
		Readonly<Record<string, unknown>>;
}

export interface ResourceDescriptorStrategy {
	readonly type: string;

	readonly data: unknown;
}
