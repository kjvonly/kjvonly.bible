import type {
	SerializedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

export class ResourceDescriptorDocumentDecoder {

	constructor(
		private readonly decoratorBuilder:
			Pick<
				ResourceContentDecoratorBuilder,
				'build'
			>
	) {}

	async decode(
		mediaType: string,
		content:
			SerializedResourceContent
	): Promise<
		readonly unknown[]
	> {

		const decorator =
			this.decoratorBuilder.build(
				mediaType
			);

		const value =
			await decorator.decode(
				content
			);

		if (
			!Array.isArray(
				value
			)
		) {
			throw new Error(
				'Invalid Resource descriptor document: expected an array.'
			);
		}

		return value;
	}
}