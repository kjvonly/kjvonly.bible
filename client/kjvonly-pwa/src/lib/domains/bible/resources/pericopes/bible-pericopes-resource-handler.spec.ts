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
	BiblePericopesCandidate
} from './bible-pericopes-candidate';

import type {
	ValidatedBiblePericopesCandidate
} from './validated-bible-pericopes-candidate';

import {
	BIBLE_PERICOPES_RESOURCE_TYPE
} from './bible-pericopes-interpreter';

import {
	BiblePericopesResourceHandler,
	type BiblePericopesResourceInstaller
} from './bible-pericopes-resource-handler';

describe(
	'BiblePericopesResourceHandler',
	() => {
		it(
			'interprets validates and installs Pericope candidates',
			async () => {
				const interpreter =
					new FakeInterpreter([
						createCandidate({
							chapterRef:
								'1_1'
						}),
						createCandidate({
							chapterRef:
								'1_2'
						})
					]);

				const validator =
					new FakeValidator();

				const installer =
					new FakeInstaller();

				const handler =
					new BiblePericopesResourceHandler(
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
					validator.candidates.map(
						(candidate) =>
							candidate.chapterRef
					)
				).toEqual([
					'1_1',
					'1_2'
				]);

				expect(
					installer.resource
				).toBe(
					resource
				);

				expect(
					installer.candidates.map(
						(candidate) =>
							candidate.chapterRef
					)
				).toEqual([
					'1_1',
					'1_2'
				]);
			}
		);

		it(
			'validates every interpreted candidate before installation',
			async () => {
				const calls:
					string[] =
					[];

				const handler =
					new BiblePericopesResourceHandler(
						new FakeInterpreter(
							[
								createCandidate({
									chapterRef:
										'1_1'
								}),
								createCandidate({
									chapterRef:
										'1_2'
								})
							],
							calls
						),
						new FakeValidator(
							calls
						),
						new FakeInstaller(
							calls
						)
					);

				await handler.handle(
					createResource()
				);

				expect(
					calls
				).toEqual([
					'interpret',
					'validate:1_1',
					'validate:1_2',
					'install'
				]);
			}
		);

		it(
			'does not install when interpretation fails',
			async () => {
				const validator =
					new FakeValidator();

				const installer =
					new FakeInstaller();

				const handler =
					new BiblePericopesResourceHandler(
						new ThrowingInterpreter(),
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
				const installer =
					new FakeInstaller();

				const validator =
					new FakeValidator(
						undefined,
						'1_2'
					);

				const handler =
					new BiblePericopesResourceHandler(
						new FakeInterpreter([
							createCandidate({
								chapterRef:
									'1_1'
							}),
							createCandidate({
								chapterRef:
									'1_2'
							}),
							createCandidate({
								chapterRef:
									'1_3'
							})
						]),
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
							candidate.chapterRef
					)
				).toEqual([
					'1_1',
					'1_2'
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
				const installer =
					new FakeInstaller();

				const handler =
					new BiblePericopesResourceHandler(
						new FakeInterpreter(
							[]
						),
						new FakeValidator(),
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
					new BiblePericopesResourceHandler(
						new FakeInterpreter(
							[]
						),
						new FakeValidator(),
						new FakeInstaller()
					);

				expect(
					handler.resourceType
				).toBe(
					BIBLE_PERICOPES_RESOURCE_TYPE
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
			'kjvonly/overlays/pericopes/default',

		resourceType:
			BIBLE_PERICOPES_RESOURCE_TYPE,

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
		Partial<BiblePericopesCandidate> =
		{}
): BiblePericopesCandidate {
	return {
		source:
			'default',

		chapterRef:
			'1_1',

		value: {
			'1_1_1': []
		},

		...overrides
	};
}

class FakeInterpreter
	implements ResourceInterpreter<
		BiblePericopesCandidate
	> {

	readonly resourceType =
		BIBLE_PERICOPES_RESOURCE_TYPE;

	constructor(
		private readonly output:
			readonly BiblePericopesCandidate[],

		private readonly calls?:
			string[]
	) {}

	interpret():
		Iterable<BiblePericopesCandidate> {
		this.calls?.push(
			'interpret'
		);

		return this.output;
	}
}

class ThrowingInterpreter
	implements ResourceInterpreter<
		BiblePericopesCandidate
	> {

	readonly resourceType =
		BIBLE_PERICOPES_RESOURCE_TYPE;

	interpret():
		Iterable<BiblePericopesCandidate> {
		throw new Error(
			'interpretation failed'
		);
	}
}

class FakeValidator
	implements ResourceValidator<
		BiblePericopesCandidate,
		ValidatedBiblePericopesCandidate
	> {

	readonly candidates:
		BiblePericopesCandidate[] =
		[];

	constructor(
		private readonly calls?:
			string[],

		private readonly failingChapterRef?:
			string
	) {}

	validate(
		candidate:
			BiblePericopesCandidate
	): ValidatedBiblePericopesCandidate {
		this.candidates.push(
			candidate
		);

		this.calls?.push(
			`validate:${candidate.chapterRef}`
		);

		if (
			candidate.chapterRef ===
			this.failingChapterRef
		) {
			throw new Error(
				'validation failed'
			);
		}

		return {
			source:
				candidate.source,

			chapterRef:
				candidate.chapterRef,

			pericopes:
				{}
		};
	}
}

class FakeInstaller
	implements BiblePericopesResourceInstaller {

	installCount =
		0;

	resource:
		DecodedResourceContent |
		undefined;

	candidates:
		readonly ValidatedBiblePericopesCandidate[] =
		[];

	constructor(
		private readonly calls?:
			string[]
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBiblePericopesCandidate[]
	): Promise<void> {
		this.installCount +=
			1;

		this.resource =
			resource;

		this.candidates =
			candidates;

		this.calls?.push(
			'install'
		);
	}
}
