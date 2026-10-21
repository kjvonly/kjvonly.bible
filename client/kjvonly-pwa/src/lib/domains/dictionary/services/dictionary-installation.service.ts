import type { PublishedResourceReference, ResourceInstallResult } from '$lib/resource';
import { parseDictionaryResourceId } from '../models/dictionary-identity';
import type { DictionaryEditionSource, DictionaryEditionManifest } from '../models/dictionary.model';

import type { DictionaryHeadwordSourceStore } from '../persistence/dictionary-headword-source-store';
import { DICTIONARY_RESOURCE_TYPE } from '../resources/entries/dictionary-resource-contract';

/** Only the generic Resource worker may install published Dictionary editions. */
interface DictionaryResourceInstaller {
	install(source: PublishedResourceReference): Promise<ResourceInstallResult>;
}

/** Result for one independently installable Dictionary edition. */
export type DictionaryInstallationStatus =
	| { readonly source: DictionaryEditionSource; readonly status: 'ready'; readonly edition: DictionaryEditionManifest }
	| { readonly source: DictionaryEditionSource; readonly status: 'error'; readonly error: string };

/**
 * On-demand installation facade for Dictionary editions.
 *
 * The edition manifest is the locally accepted installation marker: the generic
 * Resource worker publishes it only after its chunks, locator and search index
 * have been persisted. This service never deletes Domain objects, contacts relays
 * to check for updates, or caches HTML bodies.
 */
export class DictionaryInstallationService {
	private readonly inFlight = new Map<string, Promise<DictionaryEditionManifest>>();

	/** Only one missing edition is downloaded/installed at a time per application. */
	private installationTail: Promise<void> = Promise.resolve();

	constructor(
		private readonly editions: DictionaryHeadwordSourceStore,
		private readonly resources: DictionaryResourceInstaller,
		private readonly publishedIndexes?: { prepare(source: DictionaryEditionSource): Promise<void> }
	) {}

	/** Installed editions are the candidate Resources shown by the edition picker. */
	listInstalledEditions(): Promise<readonly DictionaryEditionManifest[]> {
		return this.editions.listEditions();
	}

	/** Installs only when the requested publisher/Resource edition is absent locally. */
	ensureInstalled(source: DictionaryEditionSource): Promise<DictionaryEditionManifest> {
		const key = this.sourceKey(source);
		const pending = this.inFlight.get(key);
		if (pending) return pending;

		const loading = this.loadOrInstall(source);
		this.inFlight.set(key, loading);
		void loading.then(
			() => this.clearInFlight(key, loading),
			() => this.clearInFlight(key, loading)
		);
		return loading;
	}

	/** Reports one edition's result; callers can render each response independently. */
	async prepareSource(source: DictionaryEditionSource): Promise<DictionaryInstallationStatus> {
		try {
			const edition = await this.ensureInstalled(source);
			return { source, status: 'ready', edition };
		} catch (error) {
			return {
				source,
				status: 'error',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/** Reads local acceptance before ever asking the Resource worker to download. */
	private async loadOrInstall(source: DictionaryEditionSource): Promise<DictionaryEditionManifest> {
		const existing = await this.editions.getEdition(source);
		if (existing) return existing;

		return this.queueInstallation(source);
	}

	/**
	 * Serializes heavy Resource-worker installations across editions.
	 *
	 * The work itself stays in the Resource worker. This Promise chain merely
	 * schedules requests, preventing concurrent large IndexedDB transactions.
	 * Each caller retains its own success/failure; a failed edition never blocks
	 * subsequent editions or their retries.
	 */
	private queueInstallation(source: DictionaryEditionSource): Promise<DictionaryEditionManifest> {
		const installation = this.installationTail.then(async () => {
			// Resolve the optional published index Resource before installing dictionary entries.
			// It must never be a prerequisite to offline Dictionary availability.
			try { await this.publishedIndexes?.prepare(source); } catch { /* fallback */ }
			const result = await this.resources.install(source);
			assertDictionaryInstalled(result, source);

			const installed = await this.editions.getEdition(source);
			if (!installed) {
				throw new Error(`Dictionary edition was not installed: ${source.publisher}/${source.resourceId}`);
			}
			return installed;
		});

		// A rejection must not poison the queue for other editions.
		this.installationTail = installation.then(
			() => undefined,
			() => undefined
		);
		return installation;
	}

	/** A tuple key cannot collide when publisher or Resource ID contains punctuation. */
	private sourceKey(source: DictionaryEditionSource): string {
		parseDictionaryResourceId(source.resourceId);
		if (!source.publisher.trim()) throw new Error('Dictionary publisher is required.');
		return JSON.stringify([source.publisher, source.resourceId]);
	}

	/** Retains only active installation promises, including after failure/retry. */
	private clearInFlight(key: string, expected: Promise<DictionaryEditionManifest>): void {
		if (this.inFlight.get(key) === expected) this.inFlight.delete(key);
	}
}

/**
 * The requested Dictionary Resource must have been accepted. A successful
 * unrelated descriptor or a `found` flag alone does not prove installation.
 */
function assertDictionaryInstalled(
	result: ResourceInstallResult,
	source: DictionaryEditionSource
): void {
	if (!result.found) {
		throw new Error(`Dictionary Resource not found: ${source.publisher}/${source.resourceId}`);
	}
	for (const outcome of result.resources) {
		if (outcome.status === 'failed') throw outcome.error;
	}
	const accepted = result.resources.some(outcome =>
		(outcome.status === 'handled' || outcome.status === 'current') &&
		outcome.resourceType === DICTIONARY_RESOURCE_TYPE &&
		outcome.reference.publisher === source.publisher &&
		outcome.reference.resourceId === source.resourceId
	);
	if (!accepted) {
		throw new Error(`Dictionary Resource was not accepted: ${source.publisher}/${source.resourceId}`);
	}
}
