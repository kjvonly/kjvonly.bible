import type {
	ResourceContentCodec,
	ResourceContentCodecDecoratorRegistration,
	ResourceContentCodecRegistration
} from './resource-content-codec';

export class ResourceContentCodecBuilder {
	constructor(
		private readonly codecs:
			readonly ResourceContentCodecRegistration[],

		private readonly decorators:
			readonly ResourceContentCodecDecoratorRegistration[]
	) {}

	build(
		mediaType: string
	): ResourceContentCodec {
		const segments =
			mediaType
				.toLowerCase()
				.split('+');

		const baseMediaType =
			segments[0];

		const suffixes =
			segments.slice(
				1
			);

		const registration =
			this.codecs.find(
				(candidate) =>
					candidate.mediaType ===
					baseMediaType
			);

		if (!registration) {
			throw new Error(
				`Unsupported Resource media type: ${baseMediaType}`
			);
		}

		let codec =
			registration.create();

		for (
			const suffix
			of suffixes
		) {
			const decorator =
				this.decorators.find(
					(candidate) =>
						candidate.suffix ===
							suffix
				);

			if (!decorator) {
				throw new Error(
					`Unsupported Resource content encoding: ${suffix}`
				);
			}

			codec =
				decorator.decorate(
					codec
				);
		}

		return codec;
	}
}