import { DebounceService } from '$lib/application';

import type { DictionaryEditionSource, DictionarySearchMatch } from '../../models/dictionary.model';
import type { DictionaryService } from '../../services/dictionary.service';

/**
 * Coordinates one Dictionary root view's query results and request lifecycle.
 *
 * The application-owned DictionaryService/Runtime continues to own worker
 * execution; this session owns only the view's transient search state.
 */
export class DictionaryHeadwordSearchSession {
	matches: readonly DictionarySearchMatch[] = $state([]);
	searching = $state(false);
	searchError: string | undefined = $state();

	private readonly debounce: DebounceService;
	private requestGeneration = 0;
	private selectionKey: string | undefined;
	private currentRequest: {
		readonly prefix: string;
		readonly source: DictionaryEditionSource;
	} | undefined;

	constructor(
		private readonly dictionaryService: Pick<DictionaryService, 'search'>,
		debounceMilliseconds = 250
	) {
		this.debounce = new DebounceService(debounceMilliseconds);
	}

	/**
	 * Schedule a prefix search for the selected edition. Any change to
	 * the query, browse letter, or edition selection supersedes earlier results.
	 */
	update(
		prefix: string,
		source: DictionaryEditionSource | undefined,
		acceptedGeneration = ''
	): void {
		// A new object reference for the same edition must not restart a search.
		// Only the prefix, Resource identity, or accepted revision may do so.
		const selectionKey = JSON.stringify([
			prefix, source?.publisher, source?.resourceId, acceptedGeneration
		]);
		if (selectionKey === this.selectionKey) return;
		this.selectionKey = selectionKey;
		const generation = ++this.requestGeneration;
		this.debounce.cancel();
		this.matches = [];
		this.searchError = undefined;
		// Do not read reactive session state here: update() runs in the root's
		// $effect, and tracking searching would restart a completed search.
		const shouldSearch = Boolean(prefix && source);
		this.searching = shouldSearch;
		if (!prefix || !source) {
			this.currentRequest = undefined;
			return;
		}

		// Never retain a Svelte proxy in an asynchronous worker-facing request.
		const sourceSnapshot = { publisher: source.publisher, resourceId: source.resourceId };
		this.currentRequest = { prefix, source: sourceSnapshot };
		this.debounce.schedule(() => {
			void this.search(prefix, sourceSnapshot, generation);
		});
	}

	/** Retry an index/search failure without changing the query or selected edition. */
	retry(): void {
		const request = this.currentRequest;
		if (!request) return;
		const generation = ++this.requestGeneration;
		this.debounce.cancel();
		this.matches = [];
		this.searchError = undefined;
		this.searching = true;
		void this.search(request.prefix, request.source, generation);
	}

	/** Cancel queued work and prevent in-flight replies changing an unmounted view. */
	destroy(): void {
		this.debounce.cancel();
		this.selectionKey = undefined;
		this.currentRequest = undefined;
		this.requestGeneration++;
	}

	/** Apply a search response only while its query and selected edition are current. */
	private async search(
		prefix: string,
		source: DictionaryEditionSource,
		generation: number
	): Promise<void> {
		try {
			const result = await this.dictionaryService.search(prefix, source);
			if (generation !== this.requestGeneration) return;

			this.matches = result.matches;
		} catch (reason) {
			if (generation !== this.requestGeneration) return;
			this.searchError = reason instanceof Error ? reason.message : String(reason);
		} finally {
			if (generation === this.requestGeneration) this.searching = false;
		}
	}
}
