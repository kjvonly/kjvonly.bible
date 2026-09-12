import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

import {
	NotesResourceAcquisition
} from './notes-resource-acquisition';

const SOURCE:
	PublishedResourceReference = {
		publisher:
			'publisher',

		resourceId:
			`${NOTES_RESOURCE_TYPE}/default`
	};

function createNote(
	id: string
): Note {
	return {
		id,
		bibleLocationRef:
			undefined,
		bibleReferenceText:
			undefined,
		title:
			'Title',
		text:
			'Text',
		html:
			'<p>Text</p>',
		dateCreated:
			1,
		dateUpdated:
			2,
		tags:
			[]
	};
}

function createResource(
	resourceId: string,
	publisher: string =
		SOURCE.publisher
): ResourceRepresentation {
	return {
		publisher,
		resourceId,
		resourceType:
			NOTES_RESOURCE_TYPE,
		eventId:
			'a'.repeat(64),
		modifiedAt:
			100,
		representation:
			'content',
		mediaType:
			'application/json+gzip+hex',
		payload:
			''
	};
}

describe(
	'NotesResourceAcquisition',
	() => {
		it(
			'discovers the Resource Type, installs only the selected source, and returns accepted Notes',
			async () => {
				const note =
					createNote(
						'publisher/default/note-1'
					);

				const listByType =
					vi.fn(
						async () => [
							createResource(
								`${NOTES_RESOURCE_TYPE}/default/note-1`
							),
							createResource(
								`${NOTES_RESOURCE_TYPE}/study/note-2`
							),
							createResource(
								`${NOTES_RESOURCE_TYPE}/default/note-3`,
								'other-publisher'
							)
						]
					);

				const install =
					vi.fn(
						async (
							reference:
								PublishedResourceReference
						) => ({
							requested:
								reference,
							found:
								true,
							resources: [
								{
									reference,
									resourceType:
										NOTES_RESOURCE_TYPE,
									status:
										'handled' as const
								}
							]
						})
					);

				const get =
					vi.fn(
						async (
							id: string
						) =>
							id === note.id
								? note
								: undefined
					);

				const acquisition =
					new NotesResourceAcquisition(
						{
							listByType
						},
						{
							install
						},
						{
							get,
							getAll:
								async () => []
						}
					);

				const result =
					await acquisition.acquire(
						SOURCE
					);

				expect(
					listByType
				).toHaveBeenCalledWith(
					SOURCE.publisher,
					NOTES_RESOURCE_TYPE
				);

				expect(
					install
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					install
				).toHaveBeenCalledWith({
					publisher:
						SOURCE.publisher,
					resourceId:
						`${NOTES_RESOURCE_TYPE}/default/note-1`
				});

				expect(
					result
				).toEqual([
					note
				]);
			}
		);

		it(
			'loads accepted Notes for a selected bundle Resource',
			async () => {
				const matching =
					createNote(
						'publisher/default/note-1'
					);

				const other =
					createNote(
						'publisher/study/note-2'
					);

				const acquisition =
					new NotesResourceAcquisition(
						{
							listByType:
								async () => [
									createResource(
										SOURCE.resourceId
									)
								]
						},
						{
							install:
								async (
									reference
								) => ({
									requested:
										reference,
									found:
										true,
									resources: [
										{
											reference,
											resourceType:
												NOTES_RESOURCE_TYPE,
											status:
												'current'
										}
									]
								})
						},
						{
							get:
								async () => undefined,
							getAll:
								async () => [
									matching,
									other
								]
						}
					);

				expect(
					await acquisition.acquire(
						SOURCE
					)
				).toEqual([
					matching
				]);
			}
		);

		it(
			'propagates Resource installation failures',
			async () => {
				const error =
					new Error(
						'install failed'
					);

				const acquisition =
					new NotesResourceAcquisition(
						{
							listByType:
								async () => [
									createResource(
										`${NOTES_RESOURCE_TYPE}/default/note-1`
									)
								]
						},
						{
							install:
								async (
									reference
								) => ({
									requested:
										reference,
									found:
										true,
									resources: [
										{
											status:
												'failed' as const,
											error
										}
									]
								})
						},
						{
							get:
								async () => undefined,
							getAll:
								async () => []
						}
					);

				await expect(
					acquisition.acquire(
						SOURCE
					)
				).rejects.toBe(
					error
				);
			}
		);
	}
);
