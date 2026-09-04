import type {
	ResourceDescriptorStrategy
} from '../domain/resource-descriptor.js';

import type {
	StagedArtifactEntry
} from './artifact-staging-repository.js';


export interface DescriptorStrategyDefinition {
	readonly type:
		string;
}


export interface DescriptorStrategyBuilder {
	readonly type:
		string;


	build(
		definition:
			DescriptorStrategyDefinition,

		artifact:
			StagedArtifactEntry
	): ResourceDescriptorStrategy;
}