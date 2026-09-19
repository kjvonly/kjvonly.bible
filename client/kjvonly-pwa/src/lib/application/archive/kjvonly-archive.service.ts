import type {
	KJVOnlyArchiveExportSelection
} from './kjvonly-archive-export-selection';

import type {
	KJVOnlyArchiveImportResult
} from './kjvonly-archive-importer';

import type {
	KJVOnlyArchiveWorkerClient
} from './worker/kjvonly-archive-worker-client';

export class KJVOnlyArchiveService {
	constructor(
		private readonly workerClient:
			Pick<
				KJVOnlyArchiveWorkerClient,
				'import' | 'export'
			>
	) {}

	import(
		value: Uint8Array
	): Promise<KJVOnlyArchiveImportResult> {
		return this.workerClient.import(
			value
		);
	}

	export(
		selection:
			KJVOnlyArchiveExportSelection
	): Promise<Uint8Array> {
		return this.workerClient.export(
			selection
		);
	}
}
