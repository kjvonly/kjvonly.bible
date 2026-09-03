import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceInterpreter<
	TCandidate
> {
	readonly resourceType:
		string;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<TCandidate>;
}