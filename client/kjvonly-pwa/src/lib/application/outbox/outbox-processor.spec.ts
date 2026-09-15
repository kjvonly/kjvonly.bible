import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	createPendingPublication,
	type OutboxEntry
} from './outbox-entry';

import {
	OutboxProcessor
} from './outbox-processor';

import type {
	OutboxPublicationStrategy
} from './outbox-publication-strategy';

import type {
	OutboxStore
} from './outbox-store';

describe(
	'OutboxProcessor',
	() => {
		it(
			'routes a pending publication to the strategy registered for its type',
			async () => {
				const entry =
					createResourceEntry();

				const publish =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const deleteIfCurrent =
					vi.fn()
						.mockResolvedValue(
							true
						);

				const processor =
					new OutboxProcessor(
						createStore({
							entries: [
								entry
							],
							deleteIfCurrent
						}),
						[
							createStrategy(
								'resource',
								publish
							)
						]
					);

				await processor
					.processPending();

				expect(
					publish
				).toHaveBeenCalledWith(
					entry.publication
				);

				expect(
					deleteIfCurrent
				).toHaveBeenCalledWith(
					entry
				);
			}
		);

		it(
			'uses publication type to select between registered strategies',
			async () => {
				const resourceEntry =
					createResourceEntry();

				const nostrEntry =
					createNostrEventEntry();

				const publishResource =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const publishNostrEvent =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const processor =
					new OutboxProcessor(
						createStore({
							entries: [
								resourceEntry,
								nostrEntry
							],
							deleteIfCurrent:
								vi.fn()
									.mockResolvedValue(
										true
									)
						}),
						[
							createStrategy(
								'resource',
								publishResource
							),
							createStrategy(
								'nostr-event',
								publishNostrEvent
							)
						]
					);

				await processor
					.processPending();

				expect(
					publishResource
				).toHaveBeenCalledWith(
					resourceEntry.publication
				);

				expect(
					publishNostrEvent
				).toHaveBeenCalledWith(
					nostrEntry.publication
				);
			}
		);

		it(
			'leaves a publication pending when no strategy is registered for its type',
			async () => {
				const entry =
					createNostrEventEntry();

				const deleteIfCurrent =
					vi.fn();

				const processor =
					new OutboxProcessor(
						createStore({
							entries: [
								entry
							],
							deleteIfCurrent
						}),
						[]
					);

				await processor
					.processPending();

				expect(
					deleteIfCurrent
				).not.toHaveBeenCalled();
			}
		);

		it(
			'rejects duplicate publication strategy registrations',
			() => {
				expect(
					() =>
						new OutboxProcessor(
							createStore({
								entries: [],
								deleteIfCurrent:
									vi.fn()
							}),
							[
								createStrategy(
									'resource',
									vi.fn()
								),
								createStrategy(
									'resource',
									vi.fn()
								)
							]
						)
				).toThrow(
					'Duplicate Outbox publication strategy: resource'
				);
			}
		);

		it(
			'serializes wakes and runs another pass when a wake arrives during publication',
			async () => {
				const first =
					createResourceEntry(
						'1_1'
					);

				const second =
					createResourceEntry(
						'1_2'
					);

				let releaseFirst:
					() => void =
						() => {};

				const firstPublication =
					new Promise<void>(
						(resolve) => {
							releaseFirst =
								resolve;
						}
					);

				const publish =
					vi.fn()
						.mockImplementationOnce(
							async () =>
								await firstPublication
						)
						.mockResolvedValueOnce(
							undefined
						);

				const listByStatus =
					vi.fn()
						.mockResolvedValueOnce([
							first
						])
						.mockResolvedValueOnce([
							second
						])
						.mockResolvedValue([]);

				const processor =
					new OutboxProcessor(
						createStore({
							entries: [],
							deleteIfCurrent:
								vi.fn()
									.mockResolvedValue(
										true
									),
							listByStatus
						}),
						[
							createStrategy(
								'resource',
								publish
							)
						]
					);

				processor.wake();

				await vi.waitFor(
					() => {
						expect(
							publish
						).toHaveBeenCalledTimes(
							1
						);
					}
				);

				processor.wake();
				releaseFirst();

				await vi.waitFor(
					() => {
						expect(
							publish
						).toHaveBeenCalledTimes(
							2
						);
					}
				);

				expect(
					listByStatus
				).toHaveBeenCalledTimes(
					2
				);
			}
		);

		it(
			'leaves a failed publication pending and continues processing',
			async () => {
				const first =
					createResourceEntry(
						'1_1'
					);

				const second =
					createResourceEntry(
						'1_2'
					);

				const publish =
					vi.fn()
						.mockRejectedValueOnce(
							new Error(
								'offline'
							)
						)
						.mockResolvedValueOnce(
							undefined
						);

				const deleteIfCurrent =
					vi.fn()
						.mockResolvedValue(
							true
						);

				const processor =
					new OutboxProcessor(
						createStore({
							entries: [
								first,
								second
							],
							deleteIfCurrent
						}),
						[
							createStrategy(
								'resource',
								publish
							)
						]
					);

				await processor
					.processPending();

				expect(
					publish
				).toHaveBeenCalledTimes(
					2
				);

				expect(
					deleteIfCurrent
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					deleteIfCurrent
				).toHaveBeenCalledWith(
					second
				);
			}
		);
	}
);

function createResourceEntry(
	chapterRef =
		'1_1'
): OutboxEntry {
	return createPendingPublication(
		`bible/text-markup:publisher/kjvs/${chapterRef}`,
		{
			type:
				'resource',

			publisher:
				'publisher',

			resourceType:
				'kjvonly/overlays/text-markup',

			resourceId:
				`kjvonly/overlays/text-markup/kjvs/${chapterRef}`,

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

function createNostrEventEntry():
	OutboxEntry {
	return createPendingPublication(
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
					'{"name":"Stephen"}',
				tags: []
			}
		}
	);
}

function createStore({
	entries,
	deleteIfCurrent,
	listByStatus
}: {
	readonly entries:
		readonly OutboxEntry[];

	readonly deleteIfCurrent:
		ReturnType<typeof vi.fn>;

	readonly listByStatus?:
		ReturnType<typeof vi.fn>;
}): OutboxStore {
	return {
		get:
			vi.fn(),

		put:
			vi.fn(),

		listByStatus:
			listByStatus ??
			vi.fn()
				.mockResolvedValue(
					entries
				),

		deleteIfCurrent
	};
}

function createStrategy(
	type: string,
	publish:
		ReturnType<typeof vi.fn>
): OutboxPublicationStrategy {
	return {
		type,
		publish
	};
}
