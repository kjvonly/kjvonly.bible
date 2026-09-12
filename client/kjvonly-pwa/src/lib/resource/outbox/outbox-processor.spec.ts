import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourcePublisher
} from '$lib/resource/publication/resource-publisher';

import {
	createPendingResourcePublication,
	type OutboxEntry
} from './outbox-entry';

import {
	OutboxProcessor
} from './outbox-processor';

import type {
	OutboxStore
} from './outbox-store';

describe(
	'OutboxProcessor',
	() => {
		it(
			'publishes pending Resources directly',
			async () => {
				const entry =
					createEntry();

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
						createPublisher(
							publish
						)
					);

				await processor
					.processPending();

				expect(
					publish
				).toHaveBeenCalledWith(
					entry.resource
				);

				expect(
					deleteIfCurrent
				).toHaveBeenCalledWith(
					entry
				);
			}
		);

		it(
			'serializes wakes and runs another pass when a wake arrives during publication',
			async () => {
				const first =
					createEntry(
						'1_1'
					);

				const second =
					createEntry(
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
						createPublisher(
							publish
						)
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
					createEntry(
						'1_1'
					);

				const second =
					createEntry(
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
						createPublisher(
							publish
						)
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

function createEntry(
	chapterRef =
		'1_1'
): OutboxEntry {
	return createPendingResourcePublication(
		`bible/text-markup:publisher/kjvs/${chapterRef}`,
		{
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

function createPublisher(
	publish:
		ReturnType<typeof vi.fn>
): ResourcePublisher {
	return {
		publish
	};
}
