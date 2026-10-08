import {
	Buffer
} from 'node:buffer';

import {
	FILESYSTEM_ROOT_METADATA_KEY,
	type FilesystemEntriesContent
} from '#domain/filesystem/filesystem-resource-contract.js';

import {
	EventDefinition
} from '#domain/manifest/manifest.js';

import {
	SignedNostrEvent
} from '#domain/event/nostr-event.js';

import {
	EventSigner
} from '#ports/nostr/event-signer.js';

import {
	Clock
} from '#ports/time/clock.js';

import {
	EncodingRegistry
} from '../encoding/encoding-registry.js';


/** Inputs required to serialize and sign one Filesystem Resource event. */
export interface BuildFilesystemEventRequest {
	/** Nostr Resource kind used by the manifest. */
	readonly kind:
		number;

	/** Filesystem Resource event definition excluding the derived `f` tag. */
	readonly event:
		EventDefinition;

	/** Filesystem root/mount published as Resource metadata `f`. */
	readonly root:
		string;

	/** Deterministic path-keyed Filesystem semantic content. */
	readonly content:
		FilesystemEntriesContent;

	/** Previous revision timestamp used to preserve addressable-event monotonicity. */
	readonly previousCreatedAt?:
		number;
}


/**
 * Builds one ordinary signed Filesystem Resource event.
 *
 * Filesystem is not a separate transport. The builder serializes the accepted
 * Filesystem semantic contract as normal Resource content and derives only the
 * Filesystem-owned `f` metadata tag from the manifest root.
 */
export class FilesystemEventBuilder {

	constructor(
		private readonly encodingRegistry:
			EncodingRegistry,

		private readonly signer:
			EventSigner,

		private readonly clock:
			Clock
	) {}


	/**
	 * Serializes, encodes, tags, and signs one Filesystem Resource revision.
	 *
	 * @param request Validated manifest envelope and deterministic semantic content.
	 */
	async build(
		request:
			BuildFilesystemEventRequest
	): Promise<SignedNostrEvent> {
		this.assertNoDeclaredRootTag(
			request.event
		);


		const now =
			this.clock
				.nowEpochSeconds();


		const createdAt =
			request.previousCreatedAt ===
				undefined
				? now
				: Math.max(
					now,
					request.previousCreatedAt +
						1
				);


		const contentBytes =
			Buffer.from(
				JSON.stringify(
					request.content
				),
				'utf8'
			);


		const encodedBytes =
			this.encodingRegistry
				.encode(
					contentBytes,
					request.event.encoding
				);


		return this.signer.sign({
			kind:
				request.kind,

			created_at:
				createdAt,

			tags: [
				...request.event.tags.map(
					tag => [
						...tag
					]
				),
				[
					FILESYSTEM_ROOT_METADATA_KEY,
					request.root
				]
			],

			content:
				Buffer
					.from(
						encodedBytes
					)
					.toString(
						'utf8'
					)
		});
	}


	/** Defensively prevents two competing sources of truth for Filesystem root. */
	private assertNoDeclaredRootTag(
		event:
			EventDefinition
	): void {
		if (
			event.tags.some(
				tag =>
					tag[0] ===
						FILESYSTEM_ROOT_METADATA_KEY
			)
		) {
			throw new Error(
				'Filesystem event definition must not declare an "f" tag; the Filesystem root supplies it.'
			);
		}
	}
}
