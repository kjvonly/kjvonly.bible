import type {
	SerializedResourceContent
} from '$lib/resource/models/resource.model';

export interface ResourceContentCodec {
	encode(
		value: unknown
	): Promise<SerializedResourceContent>;

	decode(
		content: SerializedResourceContent
	): Promise<unknown>;
}

export interface ResourceContentCodecRegistration {
	readonly mediaType: string;

	create():
		ResourceContentCodec;
}

export interface ResourceContentCodecDecoratorRegistration {
	readonly suffix: string;

	decorate(
		inner: ResourceContentCodec
	): ResourceContentCodec;
}