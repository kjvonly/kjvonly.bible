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
	BibleSearchIndexCandidate
} from './bible-search-index-candidate';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from './bible-search-index-interpreter';

import {
	BibleSearchIndexResourceHandler,
	type BibleSearchIndexResourceInstaller
} from './bible-search-index-resource-handler';

import type {
	ValidatedBibleSearchIndexCandidate
} from './validated-bible-search-index-candidate';

describe(
	'BibleSearchIndexResourceHandler',
	() => {
		it(
			'interprets validates and installs the Resource in order',
			async () => {
				const calls:
					string[] =
					[];

				const candidate =
					createCandidate();

				const validated =
					createValidatedCandidate();

				const interpreter:
					ResourceInterpreter<BibleSearchIndexCandidate> = {
						resourceType:
							BIBLE_SEARCH_RESOURCE_TYPE,

						interpret:
							() => {
								calls.push(
									'interpret'
								);

								return [
									candidate
								];
							}
					};

				const validator:
					ResourceValidator<
						BibleSearchIndexCandidate,
						ValidatedBibleSearchIndexCandidate
					> = {
						validate:
							(value) => {
								calls.push(
									'validate'
								);

								expect(
									value
								).toBe(
									candidate
								);

								return validated;
							}
					};

				const installer:
					BibleSearchIndexResourceInstaller = {
						install:
							async (
								_resource,
								candidates
							) => {
								calls.push(
									'install'
								);

								expect(
									candidates
								).toEqual([
									validated
								]);
							}
					};

				const handler =
					new BibleSearchIndexResourceHandler(
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
					'validate',
					'install'
				]);
			}
		);

		it(
			'validates all candidates before installation begins',
			async () => {
				const candidates = [
					createCandidate('kjvs'),
					createCandidate('kjv')
				];

				let validatedCount =
					0;

				let installCount =
					0;

				const handler =
					new BibleSearchIndexResourceHandler(
						{
							resourceType:
								BIBLE_SEARCH_RESOURCE_TYPE,

							interpret:
								() =>
									candidates
						},
						{
							validate:
								(candidate) => {
									validatedCount++;

									if (
										candidate.version ===
										'kjv'
									) {
										throw new Error(
											'invalid candidate'
										);
									}

									return createValidatedCandidate(
										candidate.version
									);
								}
						},
						{
							install:
								async () => {
									installCount++;
								}
						}
					);

				await expect(
					handler.handle(
						createResource()
					)
				).rejects.toThrow(
					'invalid candidate'
				);

				expect(
					validatedCount
				).toBe(
					2
				);

				expect(
					installCount
				).toBe(
					0
				);
			}
		);

		it(
			'exposes the Bible Search Index Resource Type',
			() => {
				const handler =
					new BibleSearchIndexResourceHandler(
						{
							resourceType:
								BIBLE_SEARCH_RESOURCE_TYPE,

							interpret:
								() => []
						},
						{
							validate:
								() =>
									createValidatedCandidate()
						},
						{
							install:
								async () => {}
						}
					);

				expect(
					handler.resourceType
				).toBe(
					BIBLE_SEARCH_RESOURCE_TYPE
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
			'kjvonly/bible/search/kjvs',

		resourceType:
			BIBLE_SEARCH_RESOURCE_TYPE,

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			createChunks()
	};
}

function createCandidate(
	version =
		'kjvs'
): BibleSearchIndexCandidate {
	return {
		version,
		value:
			createChunks()
	};
}

function createValidatedCandidate(
	version =
		'kjvs'
): ValidatedBibleSearchIndexCandidate {
	return {
		version,
		chunks:
			createChunks()
	};
}

function createChunks() {
	return {
		reg:
			'{}',

		cfg:
			'{"doc":0,"opt":1}',

		map:
			'[]',

		ctx:
			'[]'
	};
}
