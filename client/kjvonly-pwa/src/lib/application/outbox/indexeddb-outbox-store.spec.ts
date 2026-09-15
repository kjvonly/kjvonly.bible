import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	OUTBOX,
	OUTBOX_STATUS_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createPendingPublication
} from './outbox-entry';

import {
	IndexedDBOutboxStore
} from './indexeddb-outbox-store';

describe(
	'IndexedDBOutboxStore',
	() => {
		it(
			'gets an Outbox entry by id',
			async () => {
				const entry =
					createEntry();

				const get =
					vi.fn()
						.mockResolvedValue(
							entry
						);

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						entry.id
					)
				).resolves.toEqual(
					entry
				);

				expect(
					get
				).toHaveBeenCalledWith(
					OUTBOX,
					entry.id
				);
			}
		);

		it(
			'puts the complete Outbox entry',
			async () => {
				const put =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const store =
					createStore({
						put
					});

				const entry =
					createEntry();

				await store.put(
					entry
				);

				expect(
					put
				).toHaveBeenCalledWith(
					OUTBOX,
					entry
				);
			}
		);

		it(
			'deletes a published entry without deleting a newer pending publication',
			async () => {
				const entry =
					createEntry();

				const deleteEntry =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const objectStore = {
					get:
						vi.fn()
							.mockResolvedValue(
								entry
							),

					delete:
						deleteEntry
				};

				const transaction =
					vi.fn()
						.mockReturnValue({
							objectStore:
								vi.fn()
									.mockReturnValue(
										objectStore
									),

							done:
								Promise.resolve()
						});

				const store =
					createStore({
						transaction
					} as unknown as Partial<ApplicationDB>);

				await expect(
					store.deleteIfCurrent(
						entry
					)
				).resolves.toBe(
					true
				);

				expect(
					deleteEntry
				).toHaveBeenCalledWith(
					entry.id
				);

				const newerEntry = {
					...entry,
					publication: {
						...entry.publication,
						value: {
							'1': {
								'1': {
									class: [
										'bg-highlightb'
									]
								}
							}
						}
					}
				};

				objectStore.get =
					vi.fn()
						.mockResolvedValue(
							newerEntry
						);

				deleteEntry.mockClear();

				await expect(
					store.deleteIfCurrent(
						entry
					)
				).resolves.toBe(
					false
				);

				expect(
					deleteEntry
				).not.toHaveBeenCalled();
			}
		);

		it(
			'does not delete a newer Resource deletion when an older publication completes',
			async () => {
				const publication =
					createEntry();

				const deletion =
					createPendingPublication(
						publication.id,
						{
							type:
								'resource',
							operation:
								'delete',
							publisher:
								'publisher',
							resourceType:
								'kjvonly/overlays/text-markup',
							resourceId:
								'kjvonly/overlays/text-markup/kjvs/1_1'
						}
					);

				const deleteEntry =
					vi.fn();

				const objectStore = {
					get:
						vi.fn()
							.mockResolvedValue(
								deletion
							),
					delete:
						deleteEntry
				};

				const store =
					createStore({
						transaction:
							vi.fn()
								.mockReturnValue({
									objectStore:
										vi.fn()
											.mockReturnValue(
												objectStore
											),
									done:
										Promise.resolve()
								})
					} as unknown as Partial<ApplicationDB>);

				await expect(
					store.deleteIfCurrent(
						publication
					)
				).resolves.toBe(
					false
				);

				expect(
					deleteEntry
				).not.toHaveBeenCalled();
			}
		);

		it(
			'does not delete a newer publication with the same Outbox id',
			async () => {
				const entry =
					createPendingPublication(
						'nostr/profile:publisher',
						{
							type:
								'nostr-event',
							publisher:
								'publisher',
							event: {
								kind:
									0,
								content:
									'{"name":"First"}',
								tags: []
							}
						}
					);

				const newer =
					createPendingPublication(
						entry.id,
						{
							type:
								'nostr-event',
							publisher:
								'publisher',
							event: {
								kind:
									0,
								content:
									'{"name":"Second"}',
								tags: []
							}
						}
					);

				const deleteEntry =
					vi.fn();

				const objectStore = {
					get:
						vi.fn()
							.mockResolvedValue(
								newer
							),
					delete:
						deleteEntry
				};

				const store =
					createStore({
						transaction:
							vi.fn()
								.mockReturnValue({
									objectStore:
										vi.fn()
											.mockReturnValue(
												objectStore
											),
									done:
										Promise.resolve()
								})
					} as unknown as Partial<ApplicationDB>);

				await expect(
					store.deleteIfCurrent(
						entry
					)
				).resolves.toBe(
					false
				);

				expect(
					deleteEntry
				).not.toHaveBeenCalled();
			}
		);

		it(
			'lists Outbox entries by publication status',
			async () => {
				const entry =
					createEntry();

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue([
							entry
						]);

				const store =
					createStore({
						getAllFromIndex
					});

				await expect(
					store.listByStatus(
						'pending'
					)
				).resolves.toEqual([
					entry
				]);

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					OUTBOX,
					OUTBOX_STATUS_INDEX,
					'pending'
				);
			}
		);
	}
);

function createEntry() {
	return createPendingPublication(
		'bible/text-markup:publisher/kjvs/1_1',
		{
			type:
				'resource',

			publisher:
				'publisher',

			resourceType:
				'kjvonly/overlays/text-markup',

			resourceId:
				'kjvonly/overlays/text-markup/kjvs/1_1',

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				'1': {
					'0': {
						class: [
							'bg-highlighta'
						]
					}
				}
			}
		}
	);
}

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBOutboxStore {
	return new IndexedDBOutboxStore(
		async () =>
			db as ApplicationDB
	);
}
