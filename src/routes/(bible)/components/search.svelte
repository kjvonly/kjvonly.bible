<script lang="ts">
	import { searchService } from '$lib/services/search.service';
	import { onMount } from 'svelte';
	import { paneService } from '../../../components/dynamic-grid-template-areas/pane.service.svelte';

	let searchID = crypto.randomUUID();
	let searchInputHeight: number = $state(0);
	let searchText = $state('');
	let searchResults: any[] = $state([]);

	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();
	function onSearchTextChanged() {
		if (searchText.length < 3) {
			searchResults = [];
		} else {
			searchService.search(searchID, searchText);
		}
	}

	function gotoBCV(key: string) {
		paneService.onSplitPane(paneId, 'h', 'ChapterContainer', { chapterKey: key });
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

<div style={containerHeight} class="pt-6">
	<div class="flex flex-col justify-center items-center">
		<input
			bind:clientHeight={searchInputHeight}
			class="max-w-3xl w-full border-b border-primary-500 bg-neutral-50 p-1 outline-none"
			oninput={onSearchTextChanged}
			bind:value={searchText}
			placeholder="search"
		/>

		<div
			class="{searchResults?.length > 0 ? '' : 'hidden'}
                  max-w-3xl overflow-x-hidden overflow-y-scroll  bg-neutral-50
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
</div>
