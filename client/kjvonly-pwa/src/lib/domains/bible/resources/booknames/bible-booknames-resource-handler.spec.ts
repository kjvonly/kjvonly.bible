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
	BibleBooknamesCandidate
} from './bible-booknames-candidate';

import type {
	ValidatedBibleBooknamesCandidate
} from './validated-bible-booknames-candidate';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from './bible-booknames-interpreter';

import {
	BibleBooknamesResourceHandler
} from './bible-booknames-resource-handler';

describe(
	'BibleBooknamesResourceHandler',
	() => {
		it(
			'interprets validates and installs a Bible Booknames Resource',
			async () => {
				const interpreter =
					new FakeBibleBooknamesInterpreter([
						createCandidate()
					]);

				const validator =
					new FakeBibleBooknamesValidator();

				const installer =
					new FakeBibleBooknamesInstaller();

				const handler =
					new BibleBooknamesResourceHandler(
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
				const calls:
					string[] =
					[];

				const interpreter =
					new FakeBibleBooknamesInterpreter(
						[
							createCandidate({
								key:
									'one'
							}),
							createCandidate({
								key:
									'two'
							})
						],
						calls
					);

				const validator =
					new FakeBibleBooknamesValidator(
						calls
					);

				const installer =
					new FakeBibleBooknamesInstaller(
						calls
					);

				const handler =
					new BibleBooknamesResourceHandler(
						interpreter,
						validator,
						installer
					);

				await handler.handle(
					createResource()
				);

				expect(
					calls
				).toEqual([
					'interpret',
					'validate:one',
					'validate:two',
					'install'
				]);
			}
		);

		it(
			'does not install when interpretation fails',
			async () => {
				const interpreter =
					new ThrowingBibleBooknamesInterpreter();

				const validator =
					new FakeBibleBooknamesValidator();

				const installer =
					new FakeBibleBooknamesInstaller();

				const handler =
					new BibleBooknamesResourceHandler(
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
					new FakeBibleBooknamesInterpreter([
						createCandidate({
							key:
								'one'
						}),
						createCandidate({
							key:
								'two'
						}),
						createCandidate({
							key:
								'three'
						})
					]);

				const validator =
					new FakeBibleBooknamesValidator(
						undefined,
						'two'
					);

				const installer =
					new FakeBibleBooknamesInstaller();

				const handler =
					new BibleBooknamesResourceHandler(
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
					'one',
					'two'
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
					new FakeBibleBooknamesInterpreter(
						[]
					);

				const validator =
					new FakeBibleBooknamesValidator();

				const installer =
					new FakeBibleBooknamesInstaller();

				const handler =
					new BibleBooknamesResourceHandler(
						interpreter,
						validator,
						installer
					);

				await handler.handle(
					createResource()
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

		it(
			'exposes its Resource Type',
			() => {
				const handler =
					new BibleBooknamesResourceHandler(
						new FakeBibleBooknamesInterpreter(
							[]
						),
						new FakeBibleBooknamesValidator(),
						new FakeBibleBooknamesInstaller()
					);

				expect(
					handler.resourceType
				).toBe(
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);
			}
		);
	}
);

function createResource():
	DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/booknames/default',

		resourceType:
			BIBLE_BOOKNAMES_RESOURCE_TYPE,

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			{}
	};
}

function createCandidate(
	overrides:
		Partial<BibleBooknamesCandidate> =
		{}
): BibleBooknamesCandidate {
	return {
		key:
			'default',

		value:
			createBooknamesContent(),

		...overrides
	};
}

function createValidatedCandidate(
	overrides:
		Partial<ValidatedBibleBooknamesCandidate> =
		{}
): ValidatedBibleBooknamesCandidate {
	return {
		key:
			'default',

		content:
			createBooknamesContent(),

		...overrides
	};
}

function createBooknamesContent() {
	return {
		booknamesById: {
			'1':
				'Genesis'
		},

		booknamesByName: {
			Genesis:
				1
		},

		shortNames: {
			'1':
				'Gen'
		},

		maxChapterById: {
			'1':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31
			}
		}
	};
}

class FakeBibleBooknamesInterpreter
	implements ResourceInterpreter<
		BibleBooknamesCandidate
	> {

	readonly resourceType =
		BIBLE_BOOKNAMES_RESOURCE_TYPE;

	resource:
		DecodedResourceContent |
		undefined;

	constructor(
		private readonly candidates:
			readonly BibleBooknamesCandidate[],

		private readonly calls?:
			string[]
	) { }

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<
		BibleBooknamesCandidate
	> {
		this.resource =
			resource;

		this.calls?.push(
			'interpret'
		);

		return this.candidates;
	}
}

class ThrowingBibleBooknamesInterpreter
	implements ResourceInterpreter<
		BibleBooknamesCandidate
	> {

	readonly resourceType =
		BIBLE_BOOKNAMES_RESOURCE_TYPE;

	interpret():
		Iterable<
			BibleBooknamesCandidate
		> {
		throw new Error(
			'interpretation failed'
		);
	}
}

class FakeBibleBooknamesValidator
	implements ResourceValidator<
		BibleBooknamesCandidate,
		ValidatedBibleBooknamesCandidate
	> {

	readonly candidates:
		BibleBooknamesCandidate[] =
		[];

	constructor(
		private readonly calls?:
			string[],

		private readonly failingKey?:
			string
	) { }

	validate(
		candidate:
			BibleBooknamesCandidate
	): ValidatedBibleBooknamesCandidate {
		this.candidates.push(
			candidate
		);

		this.calls?.push(
			`validate:${candidate.key}`
		);

		if (
			candidate.key ===
			this.failingKey
		) {
			throw new Error(
				'validation failed'
			);
		}

		return createValidatedCandidate({
			key:
				candidate.key,

			content:
				candidate.value as
					ValidatedBibleBooknamesCandidate[
						'content'
					]
		});
	}
}

class FakeBibleBooknamesInstaller {
	installCount =
		0;

	resource:
		DecodedResourceContent |
		undefined;

	candidates:
		readonly ValidatedBibleBooknamesCandidate[] =
		[];

	constructor(
		private readonly calls?:
			string[]
	) { }

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleBooknamesCandidate[]
	): Promise<void> {
		this.installCount++;

		this.resource =
			resource;

		this.candidates =
			candidates;

		this.calls?.push(
			'install'
		);
	}
}
