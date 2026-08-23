import type {
	SerializedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceContentCodec
} from './resource-content-codec';

export class JsonResourceContentCodec
	implements ResourceContentCodec {

	async encode(
		value: unknown
	): Promise<string> {
		const result =
			JSON.stringify(
				value
			);

		if (
			result === undefined
		) {
			throw new Error(
				'Resource content cannot be serialized as JSON.'
			);
		}

		return result;
	}

	async decode(
		content:
			SerializedResourceContent
	): Promise<unknown> {
		const serialized =
			typeof content ===
			'string'
				? content
				: new TextDecoder()
					.decode(
						content
					);

		return JSON.parse(
			serialized
		) as unknown;
	}
}