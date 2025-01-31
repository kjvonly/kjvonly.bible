<script lang="ts">
	import Button from '../../../components/button.svelte';
	import BookChapterPopup from './bookChapterPopup.svelte';
	import SettingsPopup from './settingsPopup.svelte';
	import { searchService } from '$lib/services/search.service';
	import { onMount } from 'svelte';
	import { bibleNavigationService } from '$lib/services/bible-navigation.service';

	let searchID = crypto.randomUUID();

	let clientHeight: number = $state(0);
	let searchInputHeight: number = $state(0);
	let pageWidth: number = $state(0);
	let bookChapterWidth: number = $state(0);
	let searchText = $state('');
	let searchResults: any[] = $state([]);

	let {
		chapterKey = $bindable(),
		bookName = $bindable(),
		bookChapter = $bindable(),
		chapterSettings = $bindable(),
		goTo
	} = $props();

	let showBookChapterPopup: Boolean = $state(false);
	let showSettingsPopup: Boolean = $state(false);

	function clearSearch() {
		searchText = '';
		searchResults = [];
	}

	function onBookChapterClick() {
		clearSearch();
		showSettingsPopup = false;
		showBookChapterPopup = !showBookChapterPopup;
	}

	function onSettingsClick() {
		clearSearch();
		showBookChapterPopup = false;
		showSettingsPopup = !showSettingsPopup;
	}

	// scroll header off the top of page
	let lastKnownScrollPosition = 0;
	let ticking = false;
	let headerTopOffset = $state(0);

	function setHeaderTopOffset(sp: number) {
		headerTopOffset = sp / 3;
	}

	document.addEventListener('scroll', (event) => {
		lastKnownScrollPosition = window.scrollY;
		if (!ticking) {
			window.requestAnimationFrame(() => {
				setHeaderTopOffset(lastKnownScrollPosition);
				ticking = false;
			});
			ticking = true;
		}
	});

	onMount(() => {
		searchService.subscribe(searchID, onSearchResult);
	});

	function onSearchResult(data: any) {
		searchResults = data.verses;
	}

	function onSearchTextChanged() {
		if (searchText.length < 3) {
			searchResults = [];
		} else {
			searchService.search(searchID, searchText);
		}
	}

	function gotoBCV(key: string) {
		searchText = '';
		searchResults = [];
		goTo(key)
	}

	function match(word: string) {
		let stripWord = word.toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		return new RegExp('\\b' + stripWord + '\\b').test(searchText.toLowerCase());
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<div
	bind:clientWidth={pageWidth}
	style="transform: translate3d(0px, -{headerTopOffset}px, 0px);"
	class="sticky top-0 z-20 flex max-h-[147.5px] w-[100%] flex-col justify-center bg-gradient-to-tl from-header-from from-50% to-header-to to-50%"
>
	<div
		class="{showSettingsPopup || showBookChapterPopup
			? ''
			: 'hidden'} fixed top-0 h-[100%] w-[100%]"
		onclick={(event) => {
			event.stopPropagation();
			showSettingsPopup = false;
			showBookChapterPopup = false;
		}}
	></div>
	<div class="mx-auto flex w-full max-w-6xl flex-col items-center">
		<div
			style="transform: translate3d(0px, {clientHeight / 6}px, 0px);"
			class="justify-center px-2 pt-4"
		>
			<h1 class="text-3xl font-bold text-header-title">KJVonly</h1>
		</div>

		<div
			bind:clientHeight
			style="transform: translate3d(0px, {clientHeight / 3}px, 0px);"
			class="relative flex min-h-32 w-[90%] items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 p-4 text-base shadow-lg"
		>
			<div class="flex w-[100%] flex-col justify-center">
				<div class="flex flex-row justify-center">
					<div
						bind:clientWidth={bookChapterWidth}
						class="w-full flex-col md:w-[300px]"
						style="max-width: {pageWidth}px;"
					>
						<!-- book chapter selection -->
						<div class="relative">
							<button
								class="items-cen ter mt-2 flex
					w-full justify-between border-b-2 border-b-neutral-400 text-neutral-700 hover:bg-neutral-100"
								onclick={onBookChapterClick}
							>
								<span class="w-full p-1 text-start text-sm font-bold">{bookName} {bookChapter}</span
								>

								<span>
									<svg
										class="mr-2 inline-block w-3"
										viewBox="0 0 25.4 14.098638"
										version="1.1"
										id="svg5"
										xml:space="preserve"
										xmlns="http://www.w3.org/2000/svg"
										><defs id="defs2" /><g id="layer1" transform="translate(-53.644677,-127.79211)"
											><path
												class="W fill-neutral-500"
												d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
												id="path179"
											/></g
										></svg
									>
								</span>
							</button>
							<div
								style="transform: translate3d(0px, 5px, 0px);"
								class="absolute -left-[4vw] right-0 md:-left-[150px] {showBookChapterPopup
									? ''
									: 'hidden'}  z-popover mx-auto h-[70vh] w-[90vw] bg-white shadow-lg md:w-1/2 md:min-w-sm"
							>
								<BookChapterPopup bind:showBookChapterPopup bind:chapterKey></BookChapterPopup>
							</div>
						</div>
					</div>
					<!-- settings buttong Aa -->

					<div class="relative pl-4">
						<Button fn={onSettingsClick} text={'Settings'} base={true}></Button>

						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							style="transform: translate3d(0px, 5px, 0px);"
							class="{showSettingsPopup ? '' : 'hidden'} fixed left-0 top-0 h-full w-full"
							onclick={(event) => {
								event.stopPropagation();
								showSettingsPopup = false;
							}}
						></div>
						<div
							class=" fixed left-0 right-0 md:absolute md:-left-[200px] {showSettingsPopup
								? ''
								: 'hidden'}  z-popover mx-auto h-[70vh] w-[90vw] bg-white shadow-lg md:w-1/2 md:min-w-xs"
						>
							<SettingsPopup bind:chapterSettings></SettingsPopup>
						</div>
					</div>
				</div>
				<div class="relative flex w-[100%] flex-row justify-center py-2">
					<input
						bind:clientHeight={searchInputHeight}
						class="w-full max-w-[440px] border-b border-primary-500 bg-neutral-50 p-1 outline-none"
						oninput={onSearchTextChanged}
						bind:value={searchText}
						placeholder="search"
					/>

					<div
						style="transform: translate3d(0px, {searchInputHeight + 2}px, 0px);"
						class="{searchResults?.length > 0
							? ''
							: 'hidden'} absolute  z-popover max-h-96
								  w-[90%] max-w-[450px] overflow-y-scroll overflow-x-hidden bg-neutral-50 md:absolute md:w-1/2 md:min-w-xs
								  "
					>
						{#each searchResults as v}
							<button
								onclick={() => gotoBCV(v.key)}
								class="px-4 py-2 text-left hover:bg-primary-100"
							>
								<span class="font-bold">{v.bookName} {v.number}:{v.verseNumber}</span><br />
								{#each v.text.split(' ') as w}
									{#if match(w)}
										<span class="inline-block text-redtxt">{w}</span>&nbsp;
									{:else}
										<span class="inline-block">{w}</span>&nbsp;
									{/if}
								{/each}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if searchResults.length > 0}
	<button
		aria-label="lskdjf"
		onclick={() => {
			searchText = '';
			searchResults = [];
		}}
		class="sticky left-0 top-0 z-[19] h-[100vh] w-[100%] bg-neutral-100 opacity-50"
	></button>
{/if}

<style>
</style>
