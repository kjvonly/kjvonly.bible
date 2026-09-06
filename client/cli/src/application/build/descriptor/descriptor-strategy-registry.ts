
import { ResourceDescriptorStrategy } from '../../../domain/resource/resource-descriptor.js';
import { DescriptorStrategyBuilder, DescriptorStrategyDefinition } from '../../../ports/descriptor/descriptor-strategy-builder.js';
import { StagedArtifactEntry } from '../../../ports/staging/artifact-staging-repository.js';

export class DescriptorStrategyRegistry {

	private readonly builders:
		ReadonlyMap<
			string,
			DescriptorStrategyBuilder
		>;


	constructor(
		builders:
			readonly DescriptorStrategyBuilder[]
	) {

		const map =
			new Map<
				string,
				DescriptorStrategyBuilder
			>();


		for (
			const builder
			of builders
		) {
			if (
				map.has(
					builder.type
				)
			) {
				throw new Error(
					`Duplicate descriptor strategy builder: ${builder.type}`
				);
			}


			map.set(
				builder.type,
				builder
			);
		}


		this.builders =
			map;
	}


	build(
		definition:
			DescriptorStrategyDefinition,

		artifact:
			StagedArtifactEntry
	): ResourceDescriptorStrategy {

		const builder =
			this.builders.get(
				definition.type
			);


		if (
			builder ===
				undefined
		) {
			throw new Error(
				`Unsupported descriptor strategy type: ${definition.type}`
			);
		}


		return builder.build(
			definition,
			artifact
		);
	}
}