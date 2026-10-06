import {
	ResourceDescriptorStrategy,
	ResourceDescriptor
} from '#domain/resource/resource-descriptor.js';

import {
	ConcreteSource
} from '#domain/source/concrete-source.js';

import {
	StagedArtifactEntry
} from '#ports/staging/artifact-staging-repository.js';


/**
 * Generic Resource-envelope tags projected into dedicated descriptor fields.
 *
 * Everything else remains Domain-owned Resource metadata. Keeping these sets
 * separate prevents resourceType (`t`) from being mistaken for semantic dataType.
 */
const RESOURCE_ENVELOPE_TAGS =
	new Set([
		'd',
		'm',
		't',
		'dataType',
		'dataVersion',
		'representation'
	]);


export interface BuildResourceDescriptorRequest {
	readonly source:
		ConcreteSource;

	readonly artifact:
		StagedArtifactEntry;

	readonly publisher:
		string;

	readonly modifiedAt:
		number;

	readonly strategy:
		ResourceDescriptorStrategy;
}


/**
 * Projects one concrete manifest Resource into its provider-neutral descriptor.
 *
 * The manifest remains the source of truth for the Resource envelope; this
 * builder preserves identity/type, semantic datatype, and Domain-owned
 * metadata while replacing transport details with the selected resolution
 * strategy.
 */
export class ResourceDescriptorBuilder {

	build(
		request:
			BuildResourceDescriptorRequest
	): ResourceDescriptor {

		const objectUpload =
			request
				.source
				.objectUpload;


		if (
			objectUpload ===
				undefined
		) {
			throw new Error(
				`Resource "${request.source.resourceName}" has no object-upload definition.`
			);
		}


		const resourceId =
			this.getTagValue(
				request.source,
				'd'
			);


		const resourceType =
			this.getTagValue(
				request.source,
				't'
			);


		const dataType =
			this.getTagValue(
				request.source,
				'dataType'
			);


		const dataVersion =
			this.getDataVersion(
				request.source
			);


		const resourceMetadata =
			this.getResourceMetadata(
				request.source
			);


		return {
			metadata: {
				publisher:
					request.publisher,

				resourceId,

				resourceType,

				dataType,

				dataVersion,

				modifiedAt:
					request.modifiedAt,

				representation:
					'content',

				mediaType:
					objectUpload
						.mediaType
			},

			...(resourceMetadata === undefined
				? {}
				: { resourceMetadata }),

			strategy:
				request.strategy
		};
	}


	/** Parses the manifest's semantic contract version without inventing a default. */
	private getDataVersion(
		source:
			ConcreteSource
	): number {
		const value =
			this.getTagValue(
				source,
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
				`Resource "${source.resourceName}" source "${source.key}" has an invalid "dataVersion" tag.`
			);
		}


		return dataVersion;
	}


	/**
	 * Preserves non-envelope scalar tags as opaque Resource metadata.
	 *
	 * Generic CLI code does not assign meaning to values such as Bible `version`;
	 * the owning Domain interprets those keys after Resource resolution.
	 */
	private getResourceMetadata(
		source:
			ConcreteSource
	): Readonly<Record<string, string>> |
		undefined {
		const metadata:
			Record<string, string> = {};


		for (
			const tag
			of source.event.tags
		) {
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


	/** Reads one required generic Resource-envelope tag after manifest expansion. */
	private getTagValue(
		source:
			ConcreteSource,

		tagName:
			string
	): string {

		const matches =
			source
				.event
				.tags
				.filter(
					tag =>
						tag[0] ===
							tagName
				);


		if (
			matches.length !==
				1
		) {
			throw new Error(
				`Resource "${source.resourceName}" source "${source.key}" requires exactly one "${tagName}" tag for descriptor metadata.`
			);
		}


		const value =
			matches[0]?.[1];


		if (
			value ===
				undefined ||
			value.length ===
				0
		) {
			throw new Error(
				`Resource "${source.resourceName}" source "${source.key}" has an invalid "${tagName}" tag.`
			);
		}


		if (
			value.includes(
				'${key}'
			)
		) {
			throw new Error(
				`Resource "${source.resourceName}" source "${source.key}" contains unresolved \${key}.`
			);
		}


		return value;
	}
}
