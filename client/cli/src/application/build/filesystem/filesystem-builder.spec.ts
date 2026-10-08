import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Manifest
} from '#domain/manifest/manifest.js';

import {
	calculateFilesystemInputRevision
} from '#domain/filesystem/filesystem-input-revision.js';

import {
	SignedNostrEvent
} from '#domain/event/nostr-event.js';

import {
	FilesystemEventStagingRepository,
	StagedFilesystemEventEntry
} from '#ports/staging/filesystem-event-staging-repository.js';

import {
	Logger
} from '#ports/logging/logger.js';

import {
	FilesystemBuilder
} from './filesystem-builder.js';


const publisher =
	'a'.repeat(64);


function createManifest(
	relays:
		readonly string[] = [
			'wss://relay.example'
		]
): Manifest {
	return {
		version:
			1,
		kind:
			37770,
		staging: {
			path:
				'./.kjvonly'
		},
		nostr: {
			relays: [
				...relays
			]
		},
		strategies:
			{},
		resources:
			{},
		collections:
			{},
		filesystems: {
			library: {
				root:
					'library',
				event: {
					encoding:
						[],
					tags: [
						['d', 'kjvonly/filesystem/library'],
						['m', 'application/json'],
						['t', 'filesystem/entry'],
						['dataType', 'kjvonly.filesystem.entries'],
						['dataVersion', '1'],
						['representation', 'content']
					]
				},
				directories: [
					{
						path:
							'',
						resources:
							{},
						collections:
							{}
					}
				]
			}
		}
	};
}


function createEvent(
	createdAt:
		number,

	idCharacter:
		string = 'b'
): SignedNostrEvent {
	return {
		id:
			idCharacter.repeat(64),
		pubkey:
			publisher,
		created_at:
			createdAt,
		kind:
			37770,
		tags:
			[],
		content:
			'{}',
		sig:
			'c'.repeat(128)
	};
}


function createLogger():
	Logger {
	return {
		verbose:
			vi.fn()
	};
}


function createStagingRepository(
	entries:
		StagedFilesystemEventEntry[],

	events:
		Map<string, SignedNostrEvent>
) {
	const stage =
		vi.fn(
			async request => {
				const entry = {
					path:
						`/staging/${request.filesystemName}.json`,
					filesystemName:
						request.filesystemName,
					inputRevision:
						request.inputRevision,
					createdAt:
						request.event.created_at,
					eventId:
						request.event.id
				};


				return entry;
			}
		);


	const remove =
		vi.fn(
			async () => {}
		);


	const repository:
		FilesystemEventStagingRepository = {
			list:
				async () => [
					...entries
				],

			read:
				async entry => {
					const event =
						events.get(
							entry.path
						);


					if (
						event === undefined
					) {
						throw new Error(
							`Missing event: ${entry.path}`
						);
					}


					return event;
				},

			stage,
			remove
		};


	return {
		repository,
		stage,
		remove
	};
}


describe(
	'FilesystemBuilder',
	() => {
		it(
			'reuses the exact staged event when semantic inputs are unchanged',
			async () => {
				const manifest =
					createManifest();


				const references = [
					{
						path:
							'library/books/foo',
						eventId:
							'd'.repeat(64)
					}
				];


				const inputRevision =
					calculateFilesystemInputRevision({
						kind:
							manifest.kind,
						publisher,
						root:
							'library',
						event:
							manifest.filesystems.library!.event,
						relays:
							manifest.nostr.relays,
						references
					});


				const previous = {
					path:
						'/staging/library.json',
					filesystemName:
						'library',
					inputRevision,
					createdAt:
						100,
					eventId:
						'b'.repeat(64)
				};


				const staging =
					createStagingRepository(
						[
							previous
						],
						new Map([
							[
								previous.path,
								createEvent(100)
							]
						])
					);


				const eventBuild =
					vi.fn();


				const builder =
					new FilesystemBuilder(
						{
							build:
								async () => ({
									content:
										{},
									references
								})
						},
						{
							build:
								eventBuild
						},
						staging.repository,
						createLogger()
					);


				await builder.build({
					manifest,
					stagingRoot:
						'/staging',
					publisher
				});


				expect(
					eventBuild
				).not.toHaveBeenCalled();


				expect(
					staging.stage
				).not.toHaveBeenCalled();
			}
		);


		it(
			'rebuilds when a referenced target event revision changes',
			async () => {
				const manifest =
					createManifest();


				const previous = {
					path:
						'/staging/library.json',
					filesystemName:
						'library',
					inputRevision:
						'e'.repeat(32),
					createdAt:
						100,
					eventId:
						'b'.repeat(64)
				};


				const staging =
					createStagingRepository(
						[
							previous
						],
						new Map([
							[
								previous.path,
								createEvent(100)
							]
						])
					);


				const nextEvent =
					createEvent(
						101,
						'f'
					);


				const eventBuild =
					vi.fn(
						async () => nextEvent
					);


				const builder =
					new FilesystemBuilder(
						{
							build:
								async () => ({
									content:
										{},
									references: [
										{
											path:
												'library/books/foo',
											eventId:
												'd'.repeat(64)
										}
									]
								})
						},
						{
							build:
								eventBuild
						},
						staging.repository,
						createLogger()
					);


				await builder.build({
					manifest,
					stagingRoot:
						'/staging',
					publisher
				});


				expect(
					eventBuild
				).toHaveBeenCalledWith(
					expect.objectContaining({
						previousCreatedAt:
							100
					})
				);


				expect(
					staging.stage
				).toHaveBeenCalledWith(
					expect.objectContaining({
						filesystemName:
							'library',
						previous,
						event:
							nextEvent
					})
				);
			}
		);


		it(
			'removes staged Filesystem definitions no longer present in the manifest',
			async () => {
				const manifest =
					createManifest();


				const obsolete = {
					path:
						'/staging/obsolete.json',
					filesystemName:
						'obsolete',
					inputRevision:
						'e'.repeat(32),
					createdAt:
						90,
					eventId:
						'9'.repeat(64)
				};


				const staging =
					createStagingRepository(
						[
							obsolete
						],
						new Map()
					);


				const builder =
					new FilesystemBuilder(
						{
							build:
								async () => ({
									content:
										{},
									references:
										[]
								})
						},
						{
							build:
								async () => createEvent(100)
						},
						staging.repository,
						createLogger()
					);


				await builder.build({
					manifest,
					stagingRoot:
						'/staging',
					publisher
				});


				expect(
					staging.remove
				).toHaveBeenCalledWith(
					obsolete
				);
			}
		);
	}
);
