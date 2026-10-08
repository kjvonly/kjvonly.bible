import {
	createHash
} from 'node:crypto';

import type {
	EventDefinition
} from '../manifest/manifest.js';


/** One generated Filesystem mapping dependency included in revision identity. */
export interface FilesystemInputRevisionReference {
	/** Generated full Filesystem path. */
	readonly path:
		string;

	/** Exact signed target Resource revision used by the Filesystem content. */
	readonly eventId:
		string;
}


/** Semantic inputs that determine whether a Filesystem event can be reused. */
export interface FilesystemInputRevisionInput {
	readonly kind:
		number;

	readonly publisher:
		string;

	readonly root:
		string;

	readonly event:
		EventDefinition;

	readonly relays:
		readonly string[];

	readonly references:
		readonly FilesystemInputRevisionReference[];
}


/**
 * Calculates the semantic input revision for one generated Filesystem Resource.
 *
 * Target signed event IDs are included deliberately. A new target Resource
 * revision therefore invalidates the Filesystem overlay even when its logical
 * Resource identity and Filesystem path remain unchanged.
 *
 * @param input Canonical semantic inputs used to build the Filesystem Resource.
 * @returns Stable truncated SHA-256 revision for staging reuse decisions.
 */
export function calculateFilesystemInputRevision(
	input:
		FilesystemInputRevisionInput
): string {
	const canonical =
		JSON.stringify({
			kind:
				input.kind,

			publisher:
				input.publisher,

			root:
				input.root,

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

			relays: [
				...input.relays
			],

			references:
				input.references.map(
					reference => ({
						path:
							reference.path,

						eventId:
							reference.eventId
					})
				)
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
