import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { DictionaryEditionManifest, DictionaryEditionSource, DictionarySearchMatch } from '../models/dictionary.model';

import type {
	DictionaryInstallationService,
	DictionaryInstallationStatus
} from './dictionary-installation.service';
import type { DictionaryRuntime } from '../runtime/dictionary-runtime';

/** Listener notified when an edition preparation or retry finishes. */
export type DictionaryEditionStatusListener = (status: DictionaryInstallationStatus) => void;

/** UI-facing Dictionary operations; workers and request protocols belong to the runtime. */
export interface DictionaryService {
	/** Prepare the selected Resource edition through the existing Resource installation service. */
	prepareSource(source: DictionaryEditionSource): Promise<DictionaryInstallationStatus>;

	/** Notify open Dictionary panes when an archive import accepts a changed edition. */
	refreshImportedEditions(): Promise<void>;

	/** Follow installation/retry results shared by every open Dictionary pane. */
	subscribeToEditionStatus(listener: DictionaryEditionStatusListener): () => void;

	/** List accepted Resource editions for the Dictionary picker. */
	listInstalledEditions(): Promise<readonly DictionaryEditionManifest[]>;

	/** Register a mounted Dictionary view; release on unmount. */
	enter(): () => void;

	search(
		query: string,
		source: DictionaryEditionSource
	): Promise<{
		matches: readonly DictionarySearchMatch[];
	}>;

	/** Retrieve one unmodified stored definition by its opaque edition-scoped key. */
	get(source: DictionaryEditionSource, key: string): Promise<unknown>;

	getNormalized(source: DictionaryEditionSource, key: string): Promise<NormalizedDocument>;
}

/**
 * Bridge between Dictionary views and the application-owned runtime,
 * following Bible Search's service/runtime ownership boundary.
 */
class DefaultDictionaryService implements DictionaryService {
	private readonly editionStatusListeners = new Set<DictionaryEditionStatusListener>();
	private readonly reportedEditionStatuses = new Map<string, DictionaryInstallationStatus>();
	constructor(
		private readonly runtime: Pick<DictionaryRuntime, 'acquire' | 'search' | 'get' | 'getNormalized'>,
		private readonly installation: Pick<DictionaryInstallationService, 'prepareSource' | 'listInstalledEditions'>,
		private readonly prepareOnEnterSources: readonly DictionaryEditionSource[]
	) {}

	/** Preserve independent edition readiness and error reporting from installation. */
	async prepareSource(source: DictionaryEditionSource): Promise<DictionaryInstallationStatus> {
		let result: DictionaryInstallationStatus;
		try {
			result = await this.installation.prepareSource(source);
		} catch (reason) {
			result = { source, status: 'error', error: reason instanceof Error ? reason.message : String(reason) };
		}
		this.publishEditionStatus(result);
		return result;
	}

	/**
	 * Refresh accepted manifests after an archive imports Dictionary entries.
	 * Never downloads an edition or resets the worker's already-imported indexes.
	 * Unchanged editions do not disturb another pane's headword list.
	 */
	async refreshImportedEditions(): Promise<void> {
		// The installed-edition listing already returns accepted manifests;
		// avoid reading every one again after an archive import.
		const editions = await this.installation.listInstalledEditions();
		for (const edition of editions) {
			const source = { publisher: edition.publisher, resourceId: edition.resourceId };
			const status: DictionaryInstallationStatus = { source, status: 'ready', edition };
			const previous = this.reportedEditionStatuses.get(this.sourceKey(source));
			if (previous && this.statusKey(previous) === this.statusKey(status)) continue;
			this.publishEditionStatus(status);
		}
	}

	/** Register a listener without coupling Dictionary views or their navigation stacks. */
	subscribeToEditionStatus(listener: DictionaryEditionStatusListener): () => void {
		this.editionStatusListeners.add(listener);
		return () => { this.editionStatusListeners.delete(listener); };
	}

	/** A stable tuple key prevents publisher/Resource identity collisions. */
	private sourceKey(source: DictionaryEditionSource): string {
		return JSON.stringify([source.publisher, source.resourceId]);
	}

	/** Compare the accepted generation, not an edition object's reference identity. */
	private statusKey(status: DictionaryInstallationStatus): string {
		if (status.status === 'error') return JSON.stringify(['error', status.error]);
		return JSON.stringify([
			'ready',
			status.edition.modifiedAt,
			status.edition.chunkGeneration,
			status.edition.entryCount
		]);
	}

	/** Never let a late preparation or archive read regress an accepted edition. */
	private publishEditionStatus(status: DictionaryInstallationStatus): void {
		const key = this.sourceKey(status.source);
		const previous = this.reportedEditionStatuses.get(key);
		if (previous?.status === 'ready' && (
			status.status === 'error' || status.edition.modifiedAt < previous.edition.modifiedAt
		)) return;

		this.reportedEditionStatuses.set(key, status);
		for (const listener of this.editionStatusListeners) {
			try { listener(status); }
			catch (error) { console.error('Dictionary edition status listener failed.', error); }
		}
	}

	listInstalledEditions(): Promise<readonly DictionaryEditionManifest[]> {
		return this.installation.listInstalledEditions();
	}

	/** Prepare Application-configured editions on Dictionary entry, without startup downloads. */
	enter(): () => void {
		const release = this.runtime.acquire();
		for (const source of this.prepareOnEnterSources) {
			// Accepted editions need no repeat work; failed editions retry on the next entry.
			if (this.reportedEditionStatuses.get(this.sourceKey(source))?.status === 'ready') continue;
			void this.prepareSource(source);
		}
		return release;
	}

	search(query: string, source: DictionaryEditionSource) {
		return this.runtime.search(query, source);
	}

	get(source: DictionaryEditionSource, key: string) {
		return this.runtime.get(source, key);
	}

	getNormalized(source: DictionaryEditionSource, key: string) {
		return this.runtime.getNormalized(source, key);
	}
}

/**
 * Compose one application-facing Dictionary facade over the worker runtime
 * and the existing independent, serial edition installation service.
 */
export function createDictionaryService(
	runtime: Pick<DictionaryRuntime, 'acquire' | 'search' | 'get' | 'getNormalized'>,
	installation: Pick<DictionaryInstallationService, 'prepareSource' | 'listInstalledEditions'>,
	prepareOnEnterSources: readonly DictionaryEditionSource[] = []
): DictionaryService {
	return new DefaultDictionaryService(runtime, installation, prepareOnEnterSources);
}
