import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourceInstallation
} from '$lib/resource';

import {
	KJVOnlyArchiveExporter
} from './kjvonly-archive-exporter';

const NOTE_OBJECT_TYPE =
	'notes/note';

const CHAPTER_OBJECT_TYPE =
	'bible/chapter';

describe(
	'KJVOnlyArchiveExporter',
	() => {
		it(
			'exports only Resource-backed Domain Objects whose objectType is selected',
			async () => {
				const note =
					createDomainObject(
						NOTE_OBJECT_TYPE,
						'publisher/default/note-1'
					);

				const chapter =
					createDomainObject(
						CHAPTER_OBJECT_TYPE,
						'publisher/kjvs/1_1'
					);

				const noteInstallation =
					createInstallation(
						note
					);

				const chapterInstallation =
					createInstallation(
						chapter
					);

				const get =
					vi.fn()
						.mockResolvedValue(
							note
						);

				const exporter =
					createExporter({
						getAll:
							vi.fn()
								.mockResolvedValue([
									noteInstallation,
									chapterInstallation
								]),

						get
					});

				await expect(
					exporter.export({
						types: [
							{
								objectType:
									NOTE_OBJECT_TYPE
							}
						]
					})
				).resolves.toEqual({
					version:
						1,

					domain_objects: {
						[note.id]:
							note
					},

					resource_installations: {
						[note.id]:
							noteInstallation
					}
				});

				expect(
					get
				).toHaveBeenCalledOnce();

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					note.id
				);
			}
		);

		it(
			'filters selected object types by objectId patterns before loading Domain Objects',
			async () => {
				const sermonNote =
					createDomainObject(
						NOTE_OBJECT_TYPE,
						'publisher/default/my-sermon-note-001'
					);

				const personalNote =
					createDomainObject(
						NOTE_OBJECT_TYPE,
						'publisher/default/personal-note-001'
					);

				const sermonInstallation =
					createInstallation(
						sermonNote
					);

				const personalInstallation =
					createInstallation(
						personalNote
					);

				const get =
					vi.fn()
						.mockResolvedValue(
							sermonNote
						);

				const exporter =
					createExporter({
						getAll:
							vi.fn()
								.mockResolvedValue([
									sermonInstallation,
									personalInstallation
								]),
						get
					});

				const archive =
					await exporter.export({
						types: [
							{
								objectType:
									NOTE_OBJECT_TYPE,
								patterns: [
									'*sermon*'
								]
							}
						]
					});

				expect(
					Object.keys(
						archive.domain_objects
					)
				).toEqual([
					sermonNote.id
				]);

				expect(
					get
				).toHaveBeenCalledOnce();

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					sermonNote.id
				);
			}
		);

		it(
			'uses Resource Installations as the export workset',
			async () => {
				const get =
					vi.fn();

				const getAll =
					vi.fn()
						.mockResolvedValue([]);

				const exporter =
					createExporter({
						get,
						getAll
					});

				await expect(
					exporter.export({
						types: [
							{
								objectType:
									NOTE_OBJECT_TYPE
							}
						]
					})
				).resolves.toEqual({
					version:
						1,
					domain_objects:
						{},
					resource_installations:
						{}
				});

				expect(
					getAll
				).toHaveBeenCalledWith(
					RESOURCE_INSTALLATIONS
				);

				expect(
					get
				).not.toHaveBeenCalled();
			}
		);

		it(
			'preserves a local Resource Installation without resourceId',
			async () => {
				const note =
					createDomainObject(
						NOTE_OBJECT_TYPE,
						'publisher/default/note-1'
					);

				const installation =
					createInstallation(
						note,
						{
							resourceId:
								undefined
						}
					);

				const exporter =
					createExporter({
						getAll:
							vi.fn()
								.mockResolvedValue([
									installation
								]),

						get:
							vi.fn()
								.mockResolvedValue(
									note
								)
					});

				const archive =
					await exporter.export({
						types: [
							{
								objectType:
									NOTE_OBJECT_TYPE
							}
						]
					});

				expect(
					archive
						.resource_installations[
							note.id
						]
				).toEqual(
					installation
				);

				expect(
					archive
						.resource_installations[
							note.id
						]
				).not.toHaveProperty(
					'resourceId'
				);
			}
		);

		it(
			'fails export when a selected Resource Installation has no matching Domain Object',
			async () => {
				const note =
					createDomainObject(
						NOTE_OBJECT_TYPE,
						'publisher/default/note-1'
					);

				const installation =
					createInstallation(
						note
					);

				const exporter =
					createExporter({
						getAll:
							vi.fn()
								.mockResolvedValue([
									installation
								]),

						get:
							vi.fn()
								.mockResolvedValue(
									undefined
								)
					});

				await expect(
					exporter.export({
						types: [
							{
								objectType:
									NOTE_OBJECT_TYPE
							}
						]
					})
				).rejects.toThrow(
					`Cannot export Resource-backed Domain Object ${note.id}: matching Domain Object is missing.`
				);
			}
		);
	}
);

function createExporter(
	db: Partial<ApplicationDB>
): KJVOnlyArchiveExporter {
	return new KJVOnlyArchiveExporter(
		async () =>
			db as ApplicationDB
	);
}

function createDomainObject(
	objectType: string,
	objectId: string
): StoredDomainObject {
	return {
		id:
			`${objectType}:${objectId}`,

		objectType,
		objectId,

		value: {
			name:
				objectId
		}
	};
}

function createInstallation(
	domainObject:
		StoredDomainObject,
	overrides:
		Partial<ResourceInstallation> =
		{}
): ResourceInstallation {
	const installation:
		ResourceInstallation = {
			id:
				domainObject.id,

			objectType:
				domainObject.objectType,

			objectId:
				domainObject.objectId,

			publisher:
				'publisher',

			resourceId:
				'kjvonly/example/default',

			modifiedAt:
				100,

			...overrides
		};

	if (
		overrides.resourceId ===
		undefined &&
		Object.prototype.hasOwnProperty.call(
			overrides,
			'resourceId'
		)
	) {
		delete (
			installation as {
				resourceId?: string;
			}
		).resourceId;
	}

	return installation;
}
