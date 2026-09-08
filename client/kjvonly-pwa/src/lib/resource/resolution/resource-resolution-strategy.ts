import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

export interface ResourceResolutionStrategy {
	readonly type:
		string;

	resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		Uint8Array
	>;
}