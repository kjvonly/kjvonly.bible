<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { Modules } from '$lib/models/modules.model';
	import { onDestroy, onMount } from 'svelte';

	// COMPONENTS
	import SearchResultActions from './searchResultActions.svelte';

	// MODELS
	import {
		newSearchResultResponse,
		type onFilterBibleLocationRefFunction,
		type SearchResult,
		type SearchResultResponse
	} from '$lib/models/search.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { searchService } from '$lib/services/search.service';
	import { verseService } from '$lib/services/bible/verse.service';

	// =============================== BINDINGS ================================

	let {
		searchText = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		paneID,
		searchID,
		onFilterBibleLocationRef
	}: {
		searchText: string;
		bibleVersion: string;
		paneID: string;
		searchID: string;
		onFilterBibleLocationRef: onFilterBibleLocationRefFunction;
	} = $props();

	// ================================== VARS =================================

	let searchResults: SearchResult[] = $state([]);
	let searchResultsResponse: SearchResultResponse = $state(
		newSearchResultResponse()
	);
	let renderedSearchResultsCount: number = $state(0);

	/**
	 * Position from bottom of scroll container before we load more
	 * {@link SearchResult}s.
	 */
	let pixelsFromBottomBeforeLoadingMoreSearchResults = 20;
	let numberOfSearchResultsToLoadAtOnce = 10;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		searchService.subscribe(searchID, onSearchResult);
		let el = document.getElementById(`${searchID}-scroll-container`);
		el?.addEventListener('scroll', handleScroll);
	});

	onDestroy(() => {
		searchService.unsubscribe(searchID);
	});

	function match(word: string) {
		let stripWord = word
			.toLowerCase()
			.replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		let matchText = searchText.replaceAll('OR', '');
		return new RegExp('\\b' + stripWord + '\\b').test(matchText.toLowerCase());
	}

	// ================================ FUNCS ==================================

	async function onSearchResult(srr: SearchResultResponse) {
		if (onFilterBibleLocationRef) {
			srr.bibleLocationRefs = onFilterBibleLocationRef(srr.bibleLocationRefs);
		}
		searchResultsResponse = srr;
		renderedSearchResultsCount = 0;
		searchResults = [];
		await renderToScreenMoreSearchResults();
	}

	function handleScroll() {
		let el = document.getElementById(`${searchID}-scroll-container`);
		if (el === null) {
			return;
		}

		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <=
			pixelsFromBottomBeforeLoadingMoreSearchResults;

		if (isReachBottom) {
			renderToScreenMoreSearchResults();
		}
	}

	async function renderToScreenMoreSearchResults() {
		for (
			let i = 0;
			shouldContinueLoadingSearchResults(i);
			i++, renderedSearchResultsCount++
		) {
			let sr = await searchResultIndexToSearchResult(
				searchResultsResponse.bibleLocationRefs[renderedSearchResultsCount]
			);
			if (!sr) {
				continue;
			}
			searchResults.push(sr);
		}
	}

	function shouldContinueLoadingSearchResults(i: number): boolean {
		return (
			i < numberOfSearchResultsToLoadAtOnce &&
			renderedSearchResultsCount !==
				searchResultsResponse.bibleLocationRefs?.length
		);
	}

	async function searchResultIndexToSearchResult(
		bibleLocationRef: string
	): Promise<SearchResult | undefined> {
		let verse = await verseService.get(`${bibleVersion}/${bibleLocationRef}`);
		if (!verse) {
			return;
		}

		let sr: SearchResult = {
			key: bibleLocationRef,
			bookName: bibleLocationReferenceService.extractBookName(bibleLocationRef),
			number: bibleLocationReferenceService.extractChapter(bibleLocationRef),
			verseNumber: verse.number,
			text: verse.text
		};

		return sr;
	}

	// ============================== CLICK FUNCS ==============================

	function onSearchResultClicked(sr: SearchResult) {
		let pane = paneService.findNode(paneService.rootPane, paneID);
		if (pane) {
			pane.buffer.bag = {
				bibleLocationRef: sr.key,
				bibleVersion: bibleVersion
			};
			pane?.updateBuffer(Modules.BIBLE);
		}
	}
</script>

{#if searchResultsResponse?.bibleLocationRefs && searchResultsResponse?.bibleLocationRefs.length > 0}
	<div class="sticky top-10 bg-neutral-50 text-center">
		Showing {renderedSearchResultsCount} of {searchResultsResponse
			?.bibleLocationRefs.length}
	</div>
{/if}

<div class="{searchResults?.length > 0 ? '' : 'hidden'} bg-neutral-50 pb-6">
	{#each searchResults as sr}
		<div
			tabindex="0"
			role="button"
			class="leading-loose"
			onclick={() => {
				onSearchResultClicked(sr);
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter') {
					onSearchResultClicked(sr);
				}
			}}
		>
			<div class="text-left whitespace-normal hover:cursor-pointer">
				<span class="py-2 text-left"
					>{sr.bookName} {sr.number}:{sr.verseNumber}</span
				>
				<span class="flex-fill flex"></span>
				{#each sr.text.split(' ') as w, idx}
					{#if match(w)}
						<span>
							{#if idx !== 0}<span>&nbsp;</span>{/if}
							<span class="text-redtxt">{w}</span>
						</span>
					{:else}
						<span>
							{#if idx !== 0}<span>&nbsp;</span>{/if}
							<span class="">{w}</span>
						</span>
					{/if}
				{/each}
				<SearchResultActions {paneID} searchResult={sr}></SearchResultActions>
			</div>
		</div>
	{/each}
</div>
