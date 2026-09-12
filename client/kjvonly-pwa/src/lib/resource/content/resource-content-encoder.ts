import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import type {
	ResourceContentDecoratorBuilder
} from './resource-content-decorator-builder';

export class ResourceContentEncoder {
	constructor(
		private readonly decoratorBuilder:
			ResourceContentDecoratorBuilder
	) {}

	async encode(
		resource:
			ResourcePublication
	): Promise<string> {
		const decorator =
			this.decoratorBuilder.build(
				resource.mediaType
			);

		const content =
			await decorator.encode(
				resource.value
			);

		if (
			typeof content !==
			'string'
		) {
			throw new Error(
				`Encoded Resource content must be a string: ${resource.mediaType}`
			);
		}

		return content;
	}
}
