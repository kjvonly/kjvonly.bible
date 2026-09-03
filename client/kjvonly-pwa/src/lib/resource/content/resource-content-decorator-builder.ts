import { BaseResourceContentDecorator } from './base-resource-content-decorator';
import type { ResourceContentDecorator } from './resource-content-decorator';

export interface ResourceContentDecoratorRegistration {
	readonly token: string;

	decorate(
		inner: ResourceContentDecorator
	): ResourceContentDecorator;
}

export class ResourceContentDecoratorBuilder {
	constructor(
		private readonly registrations:
			readonly ResourceContentDecoratorRegistration[]
	) {}

	build(mediaType: string): ResourceContentDecorator {
		const tokens = mediaType
			.toLowerCase()
			.split('+');

		const [baseMediaType, ...encodings] = tokens;

		if (!baseMediaType) {
			throw new Error(
				'Resource media type is required.'
			);
		}

		let decorator: ResourceContentDecorator =
			new BaseResourceContentDecorator();

		/*
		 * The base MIME type is optional.
		 *
		 * application/json
		 *     → Json(Base)
		 *
		 * audio/mpeg
		 *     → Base
		 */
		const baseRegistration =
			this.findRegistration(
				baseMediaType
			);

		if (baseRegistration) {
			decorator =
				baseRegistration.decorate(
					decorator
				);
		}

		/*
		 * Encoding suffixes are not optional.
		 *
		 * If a Resource declares +gzip, we must
		 * understand gzip or decoding would produce
		 * incorrect content.
		 */
		for (const encoding of encodings) {
			const registration =
				this.findRegistration(
					encoding
				);

			if (!registration) {
				throw new Error(
					`Unsupported Resource content encoding: ${encoding}`
				);
			}

			decorator =
				registration.decorate(
					decorator
				);
		}

		return decorator;
	}

	private findRegistration(
		token: string
	): ResourceContentDecoratorRegistration | undefined {
		return this.registrations.find(
			(registration) =>
				registration.token === token
		);
	}
}