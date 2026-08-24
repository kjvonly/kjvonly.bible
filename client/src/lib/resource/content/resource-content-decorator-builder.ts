import {
	BaseResourceContentDecorator
} from './base-resource-content-decorator';

import type {
	ResourceContentDecorator
} from './resource-content-decorator';

export interface ResourceContentMediaTypeDecoratorRegistration {
	readonly mediaType:
		string;

	decorate(
		inner:
			ResourceContentDecorator
	): ResourceContentDecorator;
}

export interface ResourceContentEncodingDecoratorRegistration {
	readonly encoding:
		string;

	decorate(
		inner:
			ResourceContentDecorator
	): ResourceContentDecorator;
}

export class ResourceContentDecoratorBuilder {
	constructor(
		private readonly mediaTypeDecorators:
			readonly ResourceContentMediaTypeDecoratorRegistration[],

		private readonly encodingDecorators:
			readonly ResourceContentEncodingDecoratorRegistration[]
	) {}

	build(
		mediaType: string
	): ResourceContentDecorator {
		const [
			baseMediaType,
			...encodings
		] =
			mediaType
				.toLowerCase()
				.split('+');

		let decorator:
			ResourceContentDecorator =
				new BaseResourceContentDecorator();

		const mediaTypeDecorator =
			this.mediaTypeDecorators.find(
				(candidate) =>
					candidate.mediaType ===
						baseMediaType
			);

		if (
			mediaTypeDecorator
		) {
			decorator =
				mediaTypeDecorator
					.decorate(
						decorator
					);
		}

		for (
			const encoding
			of encodings
		) {
			const encodingDecorator =
				this.encodingDecorators.find(
					(candidate) =>
						candidate.encoding ===
							encoding
				);

			if (
				!encodingDecorator
			) {
				throw new Error(
					`Unsupported Resource content encoding: ${encoding}`
				);
			}

			decorator =
				encodingDecorator
					.decorate(
						decorator
					);
		}

		return decorator;
	}
}