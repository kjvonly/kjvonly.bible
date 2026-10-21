import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { DictionaryEditionSource, DictionarySearchMatch } from '../models/dictionary.model';
import {
	createBrowserDictionarySearchWorkerClient,
	type DictionarySearchWorkerClient
} from '../workers/search/dictionary-search-worker-client';
import {
	createBrowserDictionaryDefinitionWorkerClient,
	type DictionaryDefinitionWorkerClient
} from '../workers/definition/dictionary-definition-worker-client';

type SearchClient = Pick<DictionarySearchWorkerClient, 'search' | 'dispose'>;
type DefinitionClient = Pick<DictionaryDefinitionWorkerClient, 'getNormalized' | 'dispose'>;

/**
 * Application-owned Dictionary runtime, following Bible Search's runtime ownership.
 * One pair of lazy worker clients is shared across all mounted Dictionary views.
 */
export class DictionaryRuntime {
	private users = 0;
	private searchClient: SearchClient | undefined;
	private definitionClient: DefinitionClient | undefined;

	constructor(
		private readonly createSearchClient: () => SearchClient = createBrowserDictionarySearchWorkerClient,
		private readonly createDefinitionClient: () => DefinitionClient = createBrowserDictionaryDefinitionWorkerClient
	) {}

	/**
	 * Keep the shared session alive while a Dictionary navigation view is mounted.
	 * The returned release function is safe to call more than once.
	 */
	acquire(): () => void {
		this.users++;
		let released = false;

		return () => {
			if (released) return;
			released = true;
			this.users--;
			if (this.users === 0) this.stopWorkers();
		};
	}

	/** Find headwords in the selected edition without loading HTML. */
	search(
		query: string,
		source: DictionaryEditionSource
	): Promise<{
		matches: readonly DictionarySearchMatch[];
	}> {
		this.searchClient ??= this.createSearchClient();
		return this.searchClient.search(query, source);
	}

	/** Normalize only the selected word's definitions in the shared definition worker. */
	getNormalized(source: DictionaryEditionSource, headwordKey: string): Promise<NormalizedDocument> {
		this.definitionClient ??= this.createDefinitionClient();
		return this.definitionClient.getNormalized(source, headwordKey);
	}

	/** Stop the session when no Dictionary view is mounted, without discarding accepted data. */
	private stopWorkers(): void {
		this.searchClient?.dispose();
		this.definitionClient?.dispose();
		this.searchClient = undefined;
		this.definitionClient = undefined;
	}
}
