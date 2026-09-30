<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { untrack } from 'svelte';

	// COMPONENTS
	import {
		KJVScrubbedViewport,
		ScrubbedWindow,
		type ScrubbedWindowEntry
	} from '$lib/components';
	import SearchResultActions from './searchResultActions.svelte';

	// MODELS
	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	import type {
		SearchResult,
		SearchResultResponse
	} from '../../models/search.model';
	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';
	import type { BibleBooknames } from '../../models/bible-booknames.model';

	// SERVICES
	const {
		verseService,
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		bibleLocationReferenceService,
		bibleVerseReferenceService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	import { BIBLE_CHAPTER_RESOURCE_TYPE } from '../../resources/chapters/bible-chapter-interpreter';
	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '../../resources/booknames/bible-booknames-interpreter';

	// =============================== BINDINGS ================================

	let {
		searchText,
		resourceNavigationState,
		searchResponse,
		showResults
	}: {
		searchText: string;
		resourceNavigationState: NavigationState;
		searchResponse?: SearchResultResponse;
		showResults: boolean;
	} = $props();

	let booknamesPromise: Promise<BibleBooknames> | undefined;
	let booknames: BibleBooknames | undefined = $state();

	// ================================== VARS =================================

	const searchResultWindow = new ScrubbedWindow<SearchResult>({
		batchSize: 10,
		maxItems: 40,
		jumpItems: 20,
		loadItem: searchResultIndexToSearchResult,
		onChange: (entries) => {
			searchResults = [...entries];
		}
	});

	let searchResults: ScrubbedWindowEntry<SearchResult>[] = $state([]);
	let activeSearchResponse: SearchResultResponse | undefined = $state();
	let scrubberValue = $state(1);

	let scrubberMax = $derived(
		activeSearchResponse?.bibleLocationRefs.length ?? 0
	);

	// =============================== LIFECYCLE ===============================

	$effect(() => {
		const response = searchResponse;

		untrack(() => {
			activeSearchResponse = response;
			scrubberValue = 1;
			void searchResultWindow.reset(
				response?.bibleLocationRefs.length ?? 0
			);
		});
	});

	function match(word: string) {
		let stripWord = word
			.toLowerCase()
			.replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		let matchText = searchText.replaceAll('OR', '');
		return new RegExp('\\b' + stripWord + '\\b').test(matchText.toLowerCase());
	}

	// ================================ FUNCS ==================================

	function getBooknames(): Promise<BibleBooknames> {
		booknamesPromise ??= loadBooknames();

		return booknamesPromise;
	}

	async function loadBooknames(): Promise<BibleBooknames> {
		const source =
			moduleResourceSelectionResolver.require(
				resourceNavigationState,
				BIBLE_BOOKNAMES_RESOURCE_TYPE
			);

		const value = await bibleBooknamesService.get(source);
		booknames = value;

		return value;
	}

	/**
	 * Formats an absolute scrubber position with the short book name at that
	 * position in the ordered search response. This lookup uses only the search
	 * response's location references and Booknames metadata; it does not load the
	 * corresponding verse or materialize that result in the sliding window.
	 */
	function formatScrubberValue(value: number): string {
		const bibleLocationRef =
			activeSearchResponse?.bibleLocationRefs[value - 1];

		if (!bibleLocationRef || !booknames) {
			return `Result ${value}`;
		}

		const bookID =
			bibleLocationReferenceService.extractBookID(bibleLocationRef);

		return (
			booknames.shortNames[bookID] ??
			booknames.booknamesById[bookID] ??
			`Result ${value}`
		);
	}

	/**
	 * Resolves one absolute search-result index for the generic scrubbed window.
	 * A response identity check prevents an old asynchronous load from publishing
	 * verse data into a newer search.
	 */
	async function searchResultIndexToSearchResult(
		index: number
	): Promise<SearchResult | undefined> {
		const response = activeSearchResponse;
		const bibleLocationRef =
			response?.bibleLocationRefs[index];

		if (!response || !bibleLocationRef) {
			return;
		}

		const source =
			moduleResourceSelectionResolver.require(
				resourceNavigationState,
				BIBLE_CHAPTER_RESOURCE_TYPE
			);

		const [verse, booknames] = await Promise.all([
			verseService.get(source, bibleLocationRef),
			getBooknames()
		]);

		if (
			response !== activeSearchResponse ||
			!verse
		) {
			return;
		}

		const bookID =
			bibleLocationReferenceService.extractBookID(bibleLocationRef);
		const {
			strongsRefs,
			crossRefs,
			strongsWords
		} = bibleVerseReferenceService
			.extractStrongsAndCrossReferences(
				verse
			);
		return {
			key: bibleLocationRef,
			bookName: booknames.booknamesById[bookID] ?? '',
			number: bibleLocationReferenceService.extractChapter(bibleLocationRef),
			verseNumber: verse.number,
			text: verse.text,
			strongsRefs,
			verseRefs: crossRefs,
			strongsWords
		};
	}

	// ============================== CLICK FUNCS ==============================

	function onSearchResultClicked(sr: SearchResult): void {
		navigation.pushModule(
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{
				bibleLocationRef: sr.key
			}
		);
	}
</script>

{#if showResults}
	<KJVScrubbedViewport
		min={1}
		max={scrubberMax}
		bind:value={scrubberValue}
		label="Search results"
		formatValue={formatScrubberValue}
		onReachStart={() => searchResultWindow.prepend()}
		onReachEnd={() => searchResultWindow.append()}
		prepareValue={(value) => searchResultWindow.prepareValue(value)}
	>
		<div class="bg-neutral-50 pb-6">
			{#each searchResults as entry (entry.value)}
				<div
					data-kjv-scrubber-value={entry.value}
					class="px-4 py-4 transition-colors duration-150 hover:bg-neutral-100 focus-within:bg-neutral-100"
				>
					<button
						type="button"
						class="w-full min-w-0 text-left active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500"
						onclick={() => onSearchResultClicked(entry.item)}
					>
						<div class="flex flex-col gap-2 whitespace-normal">
							<div class="text-sm text-neutral-600">
								{entry.item.bookName} {entry.item.number}:{entry.item.verseNumber}
							</div>
							<div class="text-base leading-relaxed text-neutral-700">
								{#each entry.item.text.split(' ') as w, idx}
									{#if match(w)}
										<span>
											{#if idx !== 0}<span>&nbsp;</span>{/if}
											<span class="text-primary-500">{w}</span>
										</span>
									{:else}
										<span>
											{#if idx !== 0}<span>&nbsp;</span>{/if}
											<span>{w}</span>
										</span>
									{/if}
								{/each}
							</div>
						</div>
					</button>

					<SearchResultActions
						searchResult={entry.item}
					></SearchResultActions>
				</div>
			{/each}
		</div>
	</KJVScrubbedViewport>
{/if}
