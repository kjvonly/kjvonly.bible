import type {
	ResourceDescriptorStrategy
} from '../../domain/resource-descriptor.js';
import { DescriptorStrategyDefinition, DescriptorStrategyBuilder } from '../../ports/descriptor/descriptor-strategy-builder.js';
import { StagedArtifactEntry } from '../../ports/staging/artifact-staging-repository.js';



interface BlossomStrategyDefinition
	extends DescriptorStrategyDefinition {

	readonly type:
		'blossom';

	readonly urls:
		readonly string[];
}


interface BlossomStrategyData {
	readonly urls:
		readonly string[];

	readonly sha256:
		string;

	readonly size:
		number;
}


export class BlossomDescriptorStrategyBuilder
	implements DescriptorStrategyBuilder {

	readonly type =
		'blossom';


	build(
		definition:
			DescriptorStrategyDefinition,

		artifact:
			StagedArtifactEntry
	): ResourceDescriptorStrategy {

		const blossomDefinition =
			this.assertDefinition(
				definition
			);


		const data:
			BlossomStrategyData = {
				urls:
					blossomDefinition
						.urls
						.map(
							url =>
								this.createArtifactUrl(
									url,
									artifact
										.metadata
										.sha256
								)
						),

				sha256:
					artifact
						.metadata
						.sha256,

				size:
					artifact.size
			};


		return {
			type:
				this.type,

			data
		};
	}


	private assertDefinition(
		definition:
			DescriptorStrategyDefinition
	): BlossomStrategyDefinition {

		if (
			definition.type !==
				this.type ||
			!(
				'urls'
				in definition
			) ||
			!Array.isArray(
				definition.urls
			) ||
			!definition.urls.every(
				url =>
					typeof url ===
						'string'
			)
		) {
			throw new Error(
				'Invalid Blossom strategy definition.'
			);
		}


		return definition as
			BlossomStrategyDefinition;
	}


	private createArtifactUrl(
		baseUrl:
			string,

		sha256:
			string
	): string {

		return (
			baseUrl.replace(
				/\/+$/,
				''
			) +
			'/' +
			sha256
		);
	}
}