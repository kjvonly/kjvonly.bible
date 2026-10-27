import type {
	KJVOnlyArchiveExportIdsSelection
} from './kjvonly-archive-export-ids-selection';

import type {
	KJVOnlyArchiveExportSelection
} from './kjvonly-archive-export-selection';

import type {
	KJVOnlyArchiveImportResult
} from './kjvonly-archive-importer';

import type {
	KJVOnlyArchiveWorkerClient
} from './worker/kjvonly-archive-worker-client';

export interface KJVOnlyArchiveImportEvent {
	readonly result:
		KJVOnlyArchiveImportResult;

	readonly importedResourceTypes:
		ReadonlySet<string>;
}

export type KJVOnlyArchiveImportSubscriber = (
	event: KJVOnlyArchiveImportEvent
) => void;

export class KJVOnlyArchiveService {
	private readonly importSubscribers =
		new Set<KJVOnlyArchiveImportSubscriber>();

	constructor(
		private readonly workerClient:
			Pick<
				KJVOnlyArchiveWorkerClient,
				'import' | 'export' | 'exportIds'
			>
	) {}

	import(
		value: Uint8Array
	): Promise<KJVOnlyArchiveImportResult> {
		const importPromise =
			this.workerClient.import(
				value
			);

		void importPromise.then(
			(result) => {
				this.publishImportCompleted(
					result
				);
			},
			() => undefined
		);

		return importPromise;
	}

	private publishImportCompleted(
		result:
			KJVOnlyArchiveImportResult
	): void {
		const event:
			KJVOnlyArchiveImportEvent = {
				result,

				importedResourceTypes:
					new Set(
						result.resources
							.filter(
								(resource) =>
									resource.status ===
										'handled' &&
									Boolean(
										resource.resourceType
									)
							)
							.map(
								(resource) =>
									resource.resourceType as string
							)
					)
			};

		for (
			const subscriber
			of this.importSubscribers
		) {
			try {
				subscriber(
					event
				);
			} catch (error) {
				console.error(
					'Archive import subscriber failed.',
					error
				);
			}
		}
	}

	subscribeToImports(
		subscriber:
			KJVOnlyArchiveImportSubscriber
	): () => void {
		this.importSubscribers.add(
			subscriber
		);

		return () => {
			this.importSubscribers.delete(
				subscriber
			);
		};
	}

	export(
		selection:
			KJVOnlyArchiveExportSelection
	): Promise<Uint8Array> {
		return this.workerClient.export(
			selection
		);
	}

	exportIds(
		selection:
			KJVOnlyArchiveExportIdsSelection
	): Promise<Uint8Array> {
		return this.workerClient.exportIds(
			selection
		);
	}
}
