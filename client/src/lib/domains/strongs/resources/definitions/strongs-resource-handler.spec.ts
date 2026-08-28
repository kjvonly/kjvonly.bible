import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	StrongsCandidate
} from './strongs-candidate';

import type {
	ValidatedStrongsCandidate
} from './validated-strongs-candidate';

import {
	StrongsResourceHandler
} from './strongs-resource-handler';

describe(
	'StrongsResourceHandler',
	() => {
		it(
			'interprets validates and installs a Strong\'s Resource',
			async () => {
				const interpreter =
					new FakeStrongsInterpreter([
						createCandidate()
					]);

				const validator =
					new FakeStrongsValidator();

				const installer =
					new FakeStrongsInstaller();

				const handler =
					new StrongsResourceHandler(
						interpreter,
						validator,
						installer
					);

				const resource =
					createResource();

				await handler.handle(
					resource
				);

				expect(
					interpreter.resource
				).toBe(
					resource
				);

				expect(
					validator.candidates
				).toEqual([
					createCandidate()
				]);

				expect(
					installer.resource
				).toBe(
					resource
				);

				expect(
					installer.candidates
				).toEqual([
					createValidatedCandidate()
				]);
			}
		);

		it(
			'validates every interpreted candidate before installation',
			async () => {
				const interpreter =
					new FakeStrongsInterpreter([
						createCandidate({
							key:
								'G1'
						}),

						createCandidate({
							key:
								'G2'
						}),

						createCandidate({
							key:
								'H1'
						})
					]);

				const validator =
					new FakeStrongsValidator();

				const installer =
					new FakeStrongsInstaller();

				const handler =
					new StrongsResourceHandler(
						interpreter,
						validator,
						installer
					);

				await handler.handle(
					createResource()
				);

				expect(
					validator.candidates.map(
						(candidate) =>
							candidate.key
					)
				).toEqual([
					'G1',
					'G2',
					'H1'
				]);

				expect(
					installer.candidates.map(
						(candidate) =>
							candidate.key
					)
				).toEqual([
					'G1',
					'G2',
					'H1'
				]);
			}
		);

		it(
			'does not install when interpretation fails',
			async () => {
				const interpreter =
					new ThrowingStrongsInterpreter(
						new Error(
							'interpretation failed'
						)
					);

				const validator =
					new FakeStrongsValidator();

				const installer =
					new FakeStrongsInstaller();

				const handler =
					new StrongsResourceHandler(
						interpreter,
						validator,
						installer
					);

				await expect(
					handler.handle(
						createResource()
					)
				).rejects.toThrow(
					'interpretation failed'
				);

				expect(
					validator.candidates
				).toHaveLength(
					0
				);

				expect(
					installer.installCount
				).toBe(
					0
				);
			}
		);

		it(
			'does not install when any candidate fails validation',
			async () => {
				const interpreter =
					new FakeStrongsInterpreter([
						createCandidate({
							key:
								'G1'
						}),

						createCandidate({
							key:
								'G2'
						}),

						createCandidate({
							key:
								'H1'
						})
					]);

				const validator =
					new FakeStrongsValidator(
						'G2'
					);

				const installer =
					new FakeStrongsInstaller();

				const handler =
					new StrongsResourceHandler(
						interpreter,
						validator,
						installer
					);

				await expect(
					handler.handle(
						createResource()
					)
				).rejects.toThrow(
					'validation failed'
				);

				expect(
					validator.candidates.map(
						(candidate) =>
							candidate.key
					)
				).toEqual([
					'G1',
					'G2'
				]);

				expect(
					installer.installCount
				).toBe(
					0
				);
			}
		);

		it(
			'passes an empty candidate collection to the installer',
			async () => {
				const interpreter =
					new FakeStrongsInterpreter(
						[]
					);

				const validator =
					new FakeStrongsValidator();

				const installer =
					new FakeStrongsInstaller();

				const handler =
					new StrongsResourceHandler(
						interpreter,
						validator,
						installer
					);

				const resource =
					createResource();

				await handler.handle(
					resource
				);

				expect(
					validator.candidates
				).toHaveLength(
					0
				);

				expect(
					installer.installCount
				).toBe(
					1
				);

				expect(
					installer.candidates
				).toEqual(
					[]
				);
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
			{}
): DecodedResourceContent {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/strongs/kjvs',

		resourceType:
			'kjvonly/bible/strongs',

		eventId:
			'event-200',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			{},

		...overrides
	};
}

function createCandidate(
	overrides:
		Partial<StrongsCandidate> =
			{}
): StrongsCandidate {

	return {
		version:
			'kjvs',

		key:
			'G1',

		value: {
			number:
				'G1'
		},

		...overrides
	};
}

function createValidatedCandidate(
	overrides:
		Partial<ValidatedStrongsCandidate> =
			{}
): ValidatedStrongsCandidate {

	return {
		version:
			'kjvs',

		key:
			'G1',

		content:
			createStrongsContent(),

		...overrides
	};
}

function createStrongsContent(
	overrides:
		Record<string, unknown> =
			{}
) {
	return {
		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null,

		...overrides
	};
}

class FakeStrongsInterpreter
	implements ResourceInterpreter<
		StrongsCandidate
	> {

	readonly resourceType =
		'kjvonly/bible/strongs';

	resource:
		DecodedResourceContent |
		undefined;

	constructor(
		private readonly candidates:
			readonly StrongsCandidate[]
	) {}

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<StrongsCandidate> {

		this.resource =
			resource;

		return this.candidates;
	}
}

class ThrowingStrongsInterpreter
	implements ResourceInterpreter<
		StrongsCandidate
	> {

	readonly resourceType =
		'kjvonly/bible/strongs';

	constructor(
		private readonly error:
			Error
	) {}

	interpret():
		Iterable<StrongsCandidate> {

		throw this.error;
	}
}

class FakeStrongsValidator
	implements ResourceValidator<
		StrongsCandidate,
		ValidatedStrongsCandidate
	> {

	readonly candidates:
		StrongsCandidate[] =
			[];

	constructor(
		private readonly failKey?:
			string
	) {}

	validate(
		candidate:
			StrongsCandidate
	): ValidatedStrongsCandidate {

		this.candidates.push(
			candidate
		);

		if (
			candidate.key ===
			this.failKey
		) {
			throw new Error(
				'validation failed'
			);
		}

		return createValidatedCandidate({
			version:
				candidate.version,

			key:
				candidate.key,

			content:
				createStrongsContent({
					number:
						candidate.key
				})
		});
	}
}

class FakeStrongsInstaller {

	installCount =
		0;

	resource:
		DecodedResourceContent |
		undefined;

	candidates:
		readonly ValidatedStrongsCandidate[] =
			[];

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedStrongsCandidate[]
	): Promise<void> {

		this.installCount++;

		this.resource =
			resource;

		this.candidates =
			candidates;
	}
}