import {
	SignedNostrEvent
} from '#domain/event/nostr-event.js';

import {
	ResourceDescriptor
} from '#domain/resource/resource-descriptor.js';


/** Generic Resource-envelope tags projected into dedicated descriptor fields. */
const RESOURCE_ENVELOPE_TAGS =
	new Set([
		'd',
		'm',
		't',
		'dataType',
		'dataVersion',
		'representation'
	]);


export interface BuildNostrEventResourceDescriptorRequest {
	/** Diagnostic name of the manifest Resource or Collection being described. */
	readonly resourceName:
		string;

	/** Already-signed Resource event that will be resolved through Nostr. */
	readonly event:
		SignedNostrEvent;

	/** Relay set clients should use when resolving the Resource event. */
	readonly relays:
		readonly string[];
}


/**
 * Projects one signed Nostr Resource event into a deferred ResourceDescriptor.
 *
 * This builder understands only the generic Resource envelope. It deliberately
 * does not interpret Resource Type, semantic datatype, or Domain-owned metadata.
 */
export class NostrEventResourceDescriptorBuilder {

	/** Builds a Nostr-backed descriptor for one already-signed Resource event. */
	build(
		request:
			BuildNostrEventResourceDescriptorRequest
	): ResourceDescriptor {

		const resourceId =
			this.getRequiredTagValue(
				request.resourceName,
				request.event,
				'd'
			);


		const resourceType =
			this.getRequiredTagValue(
				request.resourceName,
				request.event,
				't'
			);


		const mediaType =
			this.getRequiredTagValue(
				request.resourceName,
				request.event,
				'm'
			);


		const dataType =
			this.getRequiredTagValue(
				request.resourceName,
				request.event,
				'dataType'
			);


		const dataVersion =
			this.getDataVersion(
				request.resourceName,
				request.event
			);


		const representation =
			this.getRepresentation(
				request.resourceName,
				request.event
			);


		const resourceMetadata =
			this.getResourceMetadata(
				request.event
			);


		return {
			metadata: {
				publisher:
					request.event.pubkey,

				resourceId,

				resourceType,

				dataType,

				dataVersion,

				modifiedAt:
					request.event.created_at,

				representation,

				mediaType
			},

			...(resourceMetadata === undefined
				? {}
				: { resourceMetadata }),

			strategy: {
				type:
					'nostr',

				data: {
					kind:
						request.event.kind,

					relays: [
						...request.relays
					]
				}
			}
		};
	}


	/** Parses the signed Resource event's semantic contract version. */
	private getDataVersion(
		resourceName:
			string,

		event:
			SignedNostrEvent
	): number {

		const value =
			this.getRequiredTagValue(
				resourceName,
				event,
				'dataVersion'
			);


		const dataVersion =
			Number(
				value
			);


		if (
			!Number.isSafeInteger(
				dataVersion
			) ||
			dataVersion < 1
		) {
			throw new Error(
				`Resource "${resourceName}" has an invalid "dataVersion" tag.`
			);
		}


		return dataVersion;
	}


	/** Reads and validates the generic Resource representation tag. */
	private getRepresentation(
		resourceName:
			string,

		event:
			SignedNostrEvent
	): 'content' | 'descriptors' {

		const representation =
			this.getRequiredTagValue(
				resourceName,
				event,
				'representation'
			);


		if (
			representation !== 'content' &&
			representation !== 'descriptors'
		) {
			throw new Error(
				`Resource "${resourceName}" has an invalid "representation" tag.`
			);
		}


		return representation;
	}


	/** Preserves non-envelope scalar Resource tags as opaque metadata. */
	private getResourceMetadata(
		event:
			SignedNostrEvent
	): Readonly<Record<string, string>> |
		undefined {

		const metadata:
			Record<string, string> = {};


		for (const tag of event.tags) {
			const name =
				tag[0];

			const value =
				tag[1];


			if (
				name === undefined ||
				value === undefined ||
				RESOURCE_ENVELOPE_TAGS.has(
					name
				)
			) {
				continue;
			}


			metadata[name] =
				value;
		}


		return Object.keys(
			metadata
		).length === 0
			? undefined
			: metadata;
	}


	/** Reads one required generic Resource-envelope tag from the signed event. */
	private getRequiredTagValue(
		resourceName:
			string,

		event:
			SignedNostrEvent,

		tagName:
			string
	): string {

		const values =
			event.tags
				.filter(
					tag =>
						tag[0] ===
							tagName
				)
				.map(
					tag =>
						tag[1]
				)
				.filter(
					(
						value
					): value is string =>
						value !== undefined &&
						value.length > 0
				);


		if (
			values.length !== 1
		) {
			throw new Error(
				`Resource "${resourceName}" requires exactly one "${tagName}" tag.`
			);
		}


		return values[0]!;
	}
}
