<script lang="ts">
	import { searchService } from '$lib/services/search.service';
	import { onMount } from 'svelte';

	let searchID = crypto.randomUUID();
	let searchInputHeight: number = $state(0);
	let searchText = $state('');
	let searchResults: any[] = $state([]);

	let { goTo } = $props();
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
		goTo(key);
	}

	function match(word: string) {
		let stripWord = word.toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		return new RegExp('\\b' + stripWord + '\\b').test(searchText.toLowerCase());
	}


	function onSearchResult(data: any) {
		searchResults = data.verses;
	}


	onMount(() => {
		searchService.subscribe(searchID, onSearchResult);
	});
</script>

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
		class="{searchResults?.length > 0 ? '' : 'hidden'} absolute z-popover max-h-96
                  w-[90%] max-w-[450px] overflow-x-hidden overflow-y-scroll border border-primary-500 bg-neutral-50 md:absolute md:w-1/2 md:min-w-xs
                  "
	>
		{#each searchResults as v}
			<button onclick={() => gotoBCV(v.key)} class="px-4 py-2 text-left hover:bg-primary-100">
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
