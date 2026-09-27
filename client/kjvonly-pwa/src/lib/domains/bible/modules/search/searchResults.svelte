<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount, untrack } from 'svelte';

	// COMPONENTS
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
		bibleLocationReferenceService
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
		scrollContainerID,
		searchResponse,
		showResults,
		onRenderedCountChanged
	}: {
		searchText: string;
		resourceNavigationState: NavigationState;
		scrollContainerID: string;
		searchResponse?: SearchResultResponse;
		showResults: boolean;
		onRenderedCountChanged: (
			query: string,
			rendered: number,
			total: number
		) => void;
	} = $props();

	let booknamesPromise: Promise<BibleBooknames> | undefined;

	// ================================== VARS =================================

	let searchResults: SearchResult[] = $state([]);
	let activeSearchResponse: SearchResultResponse | undefined = $state();
	let renderedSearchResultsCount: number = $state(0);
	let loadingResponse: SearchResultResponse | undefined;

	/**
	 * Position from bottom of scroll container before we load more
	 * {@link SearchResult}s.
	 */
	let pixelsFromBottomBeforeLoadingMoreSearchResults = 20;
	let numberOfSearchResultsToLoadAtOnce = 10;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		const el = document.getElementById(`${scrollContainerID}-scroll-container`);
		el?.addEventListener('scroll', handleScroll);

		return () => {
			el?.removeEventListener('scroll', handleScroll);
		};
	});

	$effect(() => {
		const response = searchResponse;

		untrack(() => {
			activeSearchResponse = response;
			renderedSearchResultsCount = 0;
			searchResults = [];

			if (response) {
				void renderToScreenMoreSearchResults();
			}
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

		return bibleBooknamesService.get(source);
	}

	function handleScroll() {
		let el = document.getElementById(`${scrollContainerID}-scroll-container`);
		if (el === null) {
			return;
		}

		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <=
			pixelsFromBottomBeforeLoadingMoreSearchResults;

		if (isReachBottom) {
			void renderToScreenMoreSearchResults();
		}
	}

	async function renderToScreenMoreSearchResults() {
		const response = activeSearchResponse;

		if (!response || loadingResponse === response) {
			return;
		}

		loadingResponse = response;

		try {
			for (
				let i = 0;
				shouldContinueLoadingSearchResults(i, response);
				i++, renderedSearchResultsCount++
			) {
				let sr = await searchResultIndexToSearchResult(
					response.bibleLocationRefs[renderedSearchResultsCount]
				);

				if (response !== activeSearchResponse) {
					return;
				}

				if (!sr) {
					continue;
				}
				searchResults.push(sr);
			}

			onRenderedCountChanged(
				response.text,
				renderedSearchResultsCount,
				response.bibleLocationRefs.length
			);
		} finally {
			if (loadingResponse === response) {
				loadingResponse = undefined;
			}
		}
	}

	function shouldContinueLoadingSearchResults(
		i: number,
		response: SearchResultResponse
	): boolean {
		return (
			i < numberOfSearchResultsToLoadAtOnce &&
			renderedSearchResultsCount !== response.bibleLocationRefs.length
		);
	}

	async function searchResultIndexToSearchResult(
		bibleLocationRef: string
	): Promise<SearchResult | undefined> {
		const source =
			moduleResourceSelectionResolver.require(
				resourceNavigationState,
				BIBLE_CHAPTER_RESOURCE_TYPE
			);

		const [verse, booknames] = await Promise.all([
			verseService.get(source, bibleLocationRef),
			getBooknames()
		]);

		if (!verse) {
			return;
		}

		const bookID =
			bibleLocationReferenceService.extractBookID(bibleLocationRef);

		let sr: SearchResult = {
			key: bibleLocationRef,
			bookName: booknames.booknamesById[bookID] ?? '',
			number: bibleLocationReferenceService.extractChapter(bibleLocationRef),
			verseNumber: verse.number,
			text: verse.text
		};

		return sr;
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
	<div class="bg-neutral-50 pb-6">
		{#each searchResults as sr}
			<div
				class="px-4 py-4 transition-colors duration-150 hover:bg-neutral-100 focus-within:bg-neutral-100"
			>
				<button
					type="button"
					class="w-full min-w-0 text-left active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500"
					onclick={() => onSearchResultClicked(sr)}
				>
					<div class="flex flex-col gap-2 whitespace-normal">
						<div class="text-sm text-neutral-600">
							{sr.bookName} {sr.number}:{sr.verseNumber}
						</div>
						<div class="text-base leading-relaxed text-neutral-700">
							{#each sr.text.split(' ') as w, idx}
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
					searchResult={sr}
				></SearchResultActions>
			</div>
		{/each}
	</div>
{/if}
