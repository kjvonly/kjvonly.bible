import type {
	ConcreteSource
} from '../domain/concrete-source.js';

import type {
	ResourceDescriptor,
	ResourceDescriptorStrategy
} from '../domain/resource-descriptor.js';

import type {
	StagedArtifactEntry
} from '../ports/artifact-staging-repository.js';


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


		const category =
			this.getTagValue(
				request.source,
				't'
			);


		return {
			metadata: {
				publisher:
					request.publisher,

				resourceId,

				category,

				modifiedAt:
					request.modifiedAt,

				mediaType:
					objectUpload
						.mediaType
			},

			strategy:
				request.strategy
		};
	}


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