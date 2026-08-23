import type {
	SerializedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceContentDecoderStrategy {
	canDecode(
		mediaType: string
	): boolean;

	decode(
		content:
			SerializedResourceContent
	): Promise<unknown>;
}