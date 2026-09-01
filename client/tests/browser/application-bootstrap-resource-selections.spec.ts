import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Application
} from '$lib/application/runtime/application';

import {
	KJVONLY_PUBKEY
} from '$lib/infrastructure/nostr/nostr';

import {
	ResourceWorkerClient
} from '$lib/resource/worker/resource-worker-client';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

const RESOURCE_SELECTIONS_STORAGE_KEY =
	'resourceSelections';

const BIBLE_CHAPTER_RESOURCE_TYPE =
	'kjvonly/bible/chapters';

const STRONGS_RESOURCE_TYPE =
	'kjvonly/strongs/definitions';

const BIBLE_CHAPTER_RESOURCE_ID =
	`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjvs`;

const STRONGS_RESOURCE_ID =
	`${STRONGS_RESOURCE_TYPE}/kjvs`;

const BOOTSTRAP_RESOURCE_ID =
	'kjvonly/resources/collections/default';

describe(
	'Application bootstrap Resource selections',
	() => {

		let application:
			Application |
			undefined;

		beforeEach(
			() => {

				localStorage.removeItem(
					RESOURCE_SELECTIONS_STORAGE_KEY
				);
			}
		);

		afterEach(
			async () => {

				if (
					application !==
					undefined
				) {
					await application.stop();
				}

				localStorage.removeItem(
					RESOURCE_SELECTIONS_STORAGE_KEY
				);

				vi.restoreAllMocks();
			}
		);

		it(
			'initializes missing Resource selections from the bootstrap result',
			async () => {

				vi.spyOn(
					ResourceWorkerClient.prototype,
					'install'
				).mockResolvedValue(
					createBootstrapResult()
				);

				application =
					createApplication();

				await application.start();

				await vi.waitFor(
					() => {

						expect(
							readSelections()
						).toEqual({
							[BIBLE_CHAPTER_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									BIBLE_CHAPTER_RESOURCE_ID
							},

							[STRONGS_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									STRONGS_RESOURCE_ID
							}
						});
					}
				);
			}
		);

		it(
			'preserves an existing Resource selection while initializing a missing one',
			async () => {

				const userPublisher =
					'a'.repeat(
						64
					);

				const existingSelections:
					ResourceSelections = {
						[BIBLE_CHAPTER_RESOURCE_TYPE]: {
							publisher:
								userPublisher,

							resourceId:
								`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
						}
					};

				localStorage.setItem(
					RESOURCE_SELECTIONS_STORAGE_KEY,
					JSON.stringify(
						existingSelections
					)
				);

				vi.spyOn(
					ResourceWorkerClient.prototype,
					'install'
				).mockResolvedValue(
					createBootstrapResult()
				);

				application =
					createApplication();

				await application.start();

				await vi.waitFor(
					() => {

						expect(
							readSelections()
						).toEqual({
							[BIBLE_CHAPTER_RESOURCE_TYPE]: {
								publisher:
									userPublisher,

								resourceId:
									`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
							},

							[STRONGS_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									STRONGS_RESOURCE_ID
							}
						});
					}
				);
			}
		);

		it(
			'initializes a selection from an identified failed bootstrap Resource',
			async () => {

				vi.spyOn(
					console,
					'warn'
				).mockImplementation(
					() => {}
				);

				vi.spyOn(
					ResourceWorkerClient.prototype,
					'install'
				).mockResolvedValue(
					createFailedBootstrapResult()
				);

				application =
					createApplication();

				await application.start();

				await vi.waitFor(
					() => {

						expect(
							readSelections()
						).toEqual({
							[BIBLE_CHAPTER_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									BIBLE_CHAPTER_RESOURCE_ID
							},

							[STRONGS_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									STRONGS_RESOURCE_ID
							}
						});
					}
				);
			}
		);

		it(
			'rejects duplicate bootstrap Resource Types without changing existing selections',
			async () => {

				const existingSelections:
					ResourceSelections = {
						[BIBLE_CHAPTER_RESOURCE_TYPE]: {
							publisher:
								'a'.repeat(
									64
								),

							resourceId:
								`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
						}
					};

				localStorage.setItem(
					RESOURCE_SELECTIONS_STORAGE_KEY,
					JSON.stringify(
						existingSelections
					)
				);

				const warn =
					vi.spyOn(
						console,
						'warn'
					).mockImplementation(
						() => {}
					);

				vi.spyOn(
					ResourceWorkerClient.prototype,
					'install'
				).mockResolvedValue(
					createDuplicateBootstrapResult()
				);

				application =
					createApplication();

				await application.start();

				await vi.waitFor(
					() => {

						expect(
							warn
						).toHaveBeenCalledWith(
							'[Application bootstrap Resource selection initialization failed]',
							expect.objectContaining({
								reference: {
									publisher:
										KJVONLY_PUBKEY,

									resourceId:
										BOOTSTRAP_RESOURCE_ID
								},

								error:
									expect.any(
										Error
									)
							})
						);
					}
				);

				expect(
					readSelections()
				).toEqual(
					existingSelections
				);
			}
		);

		it(
			'initializes selections from current bootstrap Resources',
			async () => {

				vi.spyOn(
					ResourceWorkerClient.prototype,
					'install'
				).mockResolvedValue(
					createBootstrapResult(
						'current'
					)
				);

				application =
					createApplication();

				await application.start();

				await vi.waitFor(
					() => {

						expect(
							readSelections()
						).toEqual({
							[BIBLE_CHAPTER_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									BIBLE_CHAPTER_RESOURCE_ID
							},

							[STRONGS_RESOURCE_TYPE]: {
								publisher:
									KJVONLY_PUBKEY,

								resourceId:
									STRONGS_RESOURCE_ID
							}
						});
					}
				);
			}
		);
	}
);

function createApplication():
	Application {

	return new Application({
		resourceRelays:
			[]
	});
}

function createBootstrapResult(
	status:
		'handled' |
		'current' =
			'handled'
): ResourceInstallResult {

	return {
		requested: {
			publisher:
				KJVONLY_PUBKEY,

			resourceId:
				BOOTSTRAP_RESOURCE_ID
		},

		found:
			true,

		resources: [
			{
				reference: {
					publisher:
						KJVONLY_PUBKEY,

					resourceId:
						BIBLE_CHAPTER_RESOURCE_ID
				},

				resourceType:
					BIBLE_CHAPTER_RESOURCE_TYPE,

				status
			},
			{
				reference: {
					publisher:
						KJVONLY_PUBKEY,

					resourceId:
						STRONGS_RESOURCE_ID
				},

				resourceType:
					STRONGS_RESOURCE_TYPE,

				status
			}
		]
	};
}

function createFailedBootstrapResult():
	ResourceInstallResult {

	return {
		requested: {
			publisher:
				KJVONLY_PUBKEY,

			resourceId:
				BOOTSTRAP_RESOURCE_ID
		},

		found:
			true,

		resources: [
			{
				reference: {
					publisher:
						KJVONLY_PUBKEY,

					resourceId:
						BIBLE_CHAPTER_RESOURCE_ID
				},

				resourceType:
					BIBLE_CHAPTER_RESOURCE_TYPE,

				status:
					'handled'
			},
			{
				reference: {
					publisher:
						KJVONLY_PUBKEY,

					resourceId:
						STRONGS_RESOURCE_ID
				},

				resourceType:
					STRONGS_RESOURCE_TYPE,

				status:
					'failed',

				error:
					new Error(
						"Strong's download failed."
					)
			}
		]
	};
}

function createDuplicateBootstrapResult():
	ResourceInstallResult {

	return {
		requested: {
			publisher:
				KJVONLY_PUBKEY,

			resourceId:
				BOOTSTRAP_RESOURCE_ID
		},

		found:
			true,

		resources: [
			{
				reference: {
					publisher:
						KJVONLY_PUBKEY,

					resourceId:
						BIBLE_CHAPTER_RESOURCE_ID
				},

				resourceType:
					BIBLE_CHAPTER_RESOURCE_TYPE,

				status:
					'handled'
			},
			{
				reference: {
					publisher:
						KJVONLY_PUBKEY,

					resourceId:
						`${BIBLE_CHAPTER_RESOURCE_TYPE}/kjv`
				},

				resourceType:
					BIBLE_CHAPTER_RESOURCE_TYPE,

				status:
					'handled'
			}
		]
	};
}

function readSelections():
	ResourceSelections |
	undefined {

	const serialized =
		localStorage.getItem(
			RESOURCE_SELECTIONS_STORAGE_KEY
		);

	if (
		serialized ===
		null
	) {
		return undefined;
	}

	return JSON.parse(
		serialized
	) as ResourceSelections;
}
