import {
	createHash
} from 'node:crypto';

import type {
	EventDefinition
} from '../manifest/manifest.js';

import type {
	ResourceDescriptor
} from '../resource/resource-descriptor.js';


/** Semantic inputs that determine whether a generated Collection event can be reused. */
export interface CollectionInputRevisionInput {
	/** Nostr event kind used for the generated Collection Resource. */
	readonly kind:
		number;

	/** Public key expected to sign the generated Collection Resource. */
	readonly publisher:
		string;

	/** Manifest event definition controlling Collection tags and encoding. */
	readonly event:
		EventDefinition;

	/** Deterministically ordered descriptors serialized into Collection content. */
	readonly descriptors:
		readonly ResourceDescriptor[];
}


/**
 * Calculates the semantic input revision for one generated Collection Resource.
 *
 * The complete ordered descriptor list is included deliberately. A changed
 * Resource descriptor or nested Collection event therefore invalidates the
 * Collection while unchanged inputs preserve the exact previously signed event.
 *
 * @param input Canonical semantic inputs used to build the Collection Resource.
 * @returns Stable truncated SHA-256 revision for staging reuse decisions.
 */
export function calculateCollectionInputRevision(
	input:
		CollectionInputRevisionInput
): string {
	const canonical =
		JSON.stringify({
			kind:
				input.kind,

			publisher:
				input.publisher,

			event: {
				encoding: [
					...input.event.encoding
				],

				tags:
					input.event.tags.map(
						tag => [
							...tag
						]
					)
			},

			descriptors:
				input.descriptors
		});


	return createHash(
		'sha256'
	)
		.update(
			canonical
		)
		.digest(
			'hex'
		)
		.slice(
			0,
			32
		);
}
