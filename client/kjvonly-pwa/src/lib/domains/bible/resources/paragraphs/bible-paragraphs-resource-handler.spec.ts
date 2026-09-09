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
	BibleParagraphsCandidate
} from './bible-paragraphs-candidate';

import type {
	ValidatedBibleParagraphsCandidate
} from './validated-bible-paragraphs-candidate';

import {
	BIBLE_PARAGRAPHS_RESOURCE_TYPE
} from './bible-paragraphs-interpreter';

import {
	BibleParagraphsResourceHandler,
	type BibleParagraphsResourceInstaller
} from './bible-paragraphs-resource-handler';

describe(
	'BibleParagraphsResourceHandler',
	() => {
		it(
			'interprets validates and installs Paragraph candidates',
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
					new BibleParagraphsResourceHandler(
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
					new BibleParagraphsResourceHandler(
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
					new BibleParagraphsResourceHandler(
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
					new BibleParagraphsResourceHandler(
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
					new BibleParagraphsResourceHandler(
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
					new BibleParagraphsResourceHandler(
						new FakeInterpreter(
							[]
						),
						new FakeValidator(),
						new FakeInstaller()
					);

				expect(
					handler.resourceType
				).toBe(
					BIBLE_PARAGRAPHS_RESOURCE_TYPE
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
			'kjvonly/overlays/paragraphs/default',

		resourceType:
			BIBLE_PARAGRAPHS_RESOURCE_TYPE,

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
		Partial<BibleParagraphsCandidate> =
		{}
): BibleParagraphsCandidate {
	return {
		source:
			'default',

		chapterRef:
			'1_1',

		value: {
			'1_1_1_0': {}
		},

		...overrides
	};
}

class FakeInterpreter
	implements ResourceInterpreter<
		BibleParagraphsCandidate
	> {

	readonly resourceType =
		BIBLE_PARAGRAPHS_RESOURCE_TYPE;

	constructor(
		private readonly output:
			readonly BibleParagraphsCandidate[],

		private readonly calls?:
			string[]
	) {}

	interpret():
		Iterable<BibleParagraphsCandidate> {
		this.calls?.push(
			'interpret'
		);

		return this.output;
	}
}

class ThrowingInterpreter
	implements ResourceInterpreter<
		BibleParagraphsCandidate
	> {

	readonly resourceType =
		BIBLE_PARAGRAPHS_RESOURCE_TYPE;

	interpret():
		Iterable<BibleParagraphsCandidate> {
		throw new Error(
			'interpretation failed'
		);
	}
}

class FakeValidator
	implements ResourceValidator<
		BibleParagraphsCandidate,
		ValidatedBibleParagraphsCandidate
	> {

	readonly candidates:
		BibleParagraphsCandidate[] =
		[];

	constructor(
		private readonly calls?:
			string[],

		private readonly failingChapterRef?:
			string
	) {}

	validate(
		candidate:
			BibleParagraphsCandidate
	): ValidatedBibleParagraphsCandidate {
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

			paragraphs:
				{}
		};
	}
}

class FakeInstaller
	implements BibleParagraphsResourceInstaller {

	installCount =
		0;

	resource:
		DecodedResourceContent |
		undefined;

	candidates:
		readonly ValidatedBibleParagraphsCandidate[] =
		[];

	constructor(
		private readonly calls?:
			string[]
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedBibleParagraphsCandidate[]
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
