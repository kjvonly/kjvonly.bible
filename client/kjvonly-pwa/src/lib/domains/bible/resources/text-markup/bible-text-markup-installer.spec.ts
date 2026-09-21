import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleTextMarkup
} from '../../models/bible-text-markup.model';

import {
	createBibleTextMarkupId
} from '../../models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from '../../persistence/bible-text-markup-store';

import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceInstallation
} from '$lib/resource';

import type {
	BibleTextMarkupInstallationStores,
	BibleTextMarkupInstallationTransaction
} from './bible-text-markup-installation-stores';

import {
	BibleTextMarkupInstaller
} from './bible-text-markup-installer';

import type {
	ValidatedBibleTextMarkupCandidate
} from './validated-bible-text-markup-candidate';

describe(
	'BibleTextMarkupInstaller',
	() => {
		it(
			'installs missing Text Markup and its provenance in one transaction',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const installer =
					new BibleTextMarkupInstaller(
						transaction
					);

				const resource =
					createResource();

				await installer.install(
					resource,
					[
						createCandidate()
					]
				);

				const id =
					createBibleTextMarkupId(
						resource.publisher,
						'kjvs',
						'1_3'
					);

				expect(
					transaction.runCount
				).toBe(1);

				expect(
					transaction.textMarkup.get(
						id
					)
				).toEqual({
					id,
					chapterRef:
						'1_3',
					markings: {
						'2': {
							'1': {
								class: [
									'bg-highlighta'
								]
							}
						}
					}
				});

				expect(
					transaction.installations
				).toEqual([
					expect.objectContaining({
						objectType:
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						objectId:
							id,
						publisher:
							resource.publisher,
						resourceId:
							resource.resourceId,
						modifiedAt:
							resource.modifiedAt
					})
				]);
			}
		);

		it(
			'does not replace Text Markup when the accepted Resource revision is current',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource({
						modifiedAt:
							200
					});

				const id =
					createBibleTextMarkupId(
						resource.publisher,
						'kjvs',
						'1_3'
					);

				transaction.textMarkup.set(
					id,
					createLocalTextMarkup(
						id
					)
				);

				transaction.currentInstallations.set(
					createResourceInstallationId(
						BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						id
					),
					{
						id:
							createResourceInstallationId(
								BIBLE_TEXT_MARKUP_OBJECT_TYPE,
								id
							),
						objectType:
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						objectId:
							id,
						publisher:
							resource.publisher,
						resourceId:
							resource.resourceId,
						modifiedAt:
							200
					}
				);

				await new BibleTextMarkupInstaller(
					transaction
				).install(
					resource,
					[
						createCandidate()
					]
				);

				expect(
					transaction.textMarkup.get(
						id
					)?.markings
				).toEqual({
					'2': {
						'1': {
							class: [
								'text-blue'
							]
						}
					}
				});

				expect(
					transaction.installations
				).toEqual([]);
			}
		);

		it(
			'replaces Text Markup when the incoming Resource revision is newer',
			async () => {
				const transaction =
					new FakeInstallationTransaction();

				const resource =
					createResource({
						modifiedAt:
							201
					});

				const id =
					createBibleTextMarkupId(
						resource.publisher,
						'kjvs',
						'1_3'
					);

				transaction.textMarkup.set(
					id,
					createLocalTextMarkup(
						id
					)
				);

				transaction.currentInstallations.set(
					createResourceInstallationId(
						BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						id
					),
					{
						id:
							createResourceInstallationId(
								BIBLE_TEXT_MARKUP_OBJECT_TYPE,
								id
							),
						objectType:
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						objectId:
							id,
						publisher:
							resource.publisher,
						resourceId:
							resource.resourceId,
						modifiedAt:
							200
					}
				);

				await new BibleTextMarkupInstaller(
					transaction
				).install(
					resource,
					[
						createCandidate()
					]
				);

				expect(
					transaction.textMarkup.get(
						id
					)?.markings
				).toEqual(
					createCandidate().markings
				);

				expect(
					transaction.installations
				).toEqual([
					expect.objectContaining({
						objectId:
							id,
						modifiedAt:
							201
					})
				]);
			}
		);

		it(
			'rejects candidates from multiple Text Markup names',
			async () => {
				const installer =
					new BibleTextMarkupInstaller(
						new FakeInstallationTransaction()
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate(),
							createCandidate({
								name:
									'study'
							})
						]
					)
				).rejects.toThrow(
					'Bible Text Markup Resource contains multiple names.'
				);
			}
		);
	}
);

class FakeInstallationTransaction
	implements BibleTextMarkupInstallationTransaction {

	runCount = 0;

	readonly textMarkup =
		new Map<
			string,
			BibleTextMarkup
		>();

	readonly installations:
		ResourceInstallation[] =
		[];

	readonly currentInstallations =
		new Map<
			string,
			ResourceInstallation
		>();

	async run<TResult>(
		operation:
			(
				stores:
					BibleTextMarkupInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount += 1;

		return await operation({
			textMarkup: {
				get:
					async (
						id
					) =>
						this.textMarkup.get(
							id
						),

				put:
					async (
						textMarkup
					) => {
						this.textMarkup.set(
							textMarkup.id,
							textMarkup
						);
					}
			},

			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) =>
						this.currentInstallations.get(
							createResourceInstallationId(
								objectType,
								objectId
							)
						),

				put:
					async (
						installation
					) => {
						this.currentInstallations.set(
							installation.id,
							installation
						);

						this.installations.push(
							installation
						);
					}
			}
		});
	}
}

function createLocalTextMarkup(
	id: string
): BibleTextMarkup {
	return {
		id,
		chapterRef:
			'1_3',
		markings: {
			'2': {
				'1': {
					class: [
						'text-blue'
					]
				}
			}
		}
	};
}

function createCandidate(
	overrides:
		Partial<ValidatedBibleTextMarkupCandidate> =
		{}
): ValidatedBibleTextMarkupCandidate {
	return {
		name:
			'kjvs',

		chapterRef:
			'1_3',

		markings: {
			'2': {
				'1': {
					class: [
						'bg-highlighta'
					]
				}
			}
		},

		...overrides
	};
}

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceType:
			'kjvonly/overlays/text-markup',

		resourceId:
			'kjvonly/overlays/text-markup/kjvs/1_3',

		modifiedAt:
			100,

		mediaType:
			'application/json',

		value: {},

		...overrides
	};
}
