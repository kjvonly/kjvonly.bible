<script lang="ts">
	import { searchService } from '$lib/services/search.service';
	import { onMount } from 'svelte';
	import { paneService } from '$lib/services/pane.service.svelte';

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

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	function copyToClipboard(v: any) {
		let verse = `${v.bookName} ${v.number}:${v.verseNumber}\n${v.text}`;
		navigator.clipboard.writeText(verse);
	}
</script>

{#snippet actions(v: any)}
	<div class="flex flex-row justify-end space-x-4">
		<!-- copy -->
		<button
			aria-label="copy button"
			onclick={() => {
				copyToClipboard(v);
			}}
		>
			<svg
				class="h-8 w-8"
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 106.96539 106.83998"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs id="defs6" />
				<g id="g8" transform="translate(-9.1541294,-7.1649487)">
					<path
						class="fill-neutral-400"
						d="M 9.2233551,92.567516 H 19.890021 V 17.900849 H 94.55669 V 7.2341829 l -57.333069,0.004 c -7.420266,0.018 -17.579333,-1.0826537 -23.3292,4.6670661 -5.7497329,5.749867 -4.6490529,15.908934 -4.6670529,23.3292 l -0.004,57.333067 M 38.105088,31.106449 c -5.949867,3.266267 -7.0848,9.945334 -7.402,16.15 -0.7004,13.7028 -0.224533,27.591334 -0.133467,41.31 0.0428,6.435867 -0.4952,14.477741 3.859334,19.780261 4.1912,5.1036 11.393466,5.3456 17.4684,5.49387 12.426933,0.30333 24.895195,0.1036 37.325465,0.0529 6.182,-0.0252 13.5064,0.54933 19.1188,-2.5316 5.94987,-3.26627 7.0848,-9.94532 7.402,-16.149994 0.7004,-13.7028 0.22454,-27.591333 0.13347,-41.31 -0.0428,-6.435867 0.4952,-14.477733 -3.85933,-19.780267 -4.1912,-5.1036 -11.39347,-5.3456 -17.46841,-5.493866 -12.42693,-0.303334 -24.895195,-0.1036 -37.325462,-0.05293 -6.182,0.0252 -13.5064,-0.549333 -19.1188,2.5316 m 67.118272,8.127734 V 103.23419 H 41.223355 V 39.234183 Z"
						id="path1212"
					/>
				</g>
			</svg>
		</button>

		<!-- horizontal split -->
		<button
			aria-label="horizontal split"
			onclick={() => {
				paneService.onSplitPane(paneId, 'h', 'ChapterComponent', {
					chapterKey: v.key
				});
			}}
		>
			<svg
				class=" h-8 w-8"
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 94.018994 99.168052"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-16.573607,-13.492392)">
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						width="90"
						height="42.665619"
						x="-108.58311"
						y="-58.167511"
						transform="scale(-1)"
					/>
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						width="90"
						height="42.665619"
						x="-108.58311"
						y="-110.65095"
						transform="scale(-1)"
					/>
				</g>
			</svg>
		</button>

		<!-- vertical split -->
		<button
			aria-label="horizontal split"
			onclick={() => {
				paneService.onSplitPane(paneId, 'v', 'ChapterComponent', {
					chapterKey: v.key
				});
			}}
		>
			<svg
				class="h-8 w-8"
				version="1.1"
				id="svg2"
				width="100%"
				height="100%"
				viewBox="0 0 94.018994 99.168052"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-16.898488,-13.804183)">
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						id="rect2158"
						width="90"
						height="42.665619"
						x="-105.81368"
						y="18.907988"
						transform="rotate(-90)"
					/>
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						id="rect2330"
						width="90"
						height="42.665619"
						x="-105.81368"
						y="70.164314"
						transform="rotate(-90)"
					/>
				</g>
			</svg>
		</button>
	</div>
{/snippet}

<div bind:clientHeight style={containerHeight} class="overflow-hidden">
	<div class="flex flex-col items-center justify-center">
		<div bind:clientHeight={headerHeight} class="flex w-full flex-col items-center">
			<div class="flex w-full max-w-lg justify-end bg-neutral-100">
				<button
					onclick={() => {
						paneService.onDeletePane(paneService.rootPane, paneId);
					}}
					class="px-2 pt-2 text-neutral-700">Close</button
				>
			</div>
			<div class="flex w-full max-w-lg justify-center px-4">
				<input
					bind:clientHeight={searchInputHeight}
					class=" w-full max-w-3xl border-b border-primary-500 bg-neutral-50 outline-none"
					oninput={onSearchTextChanged}
					bind:value={searchText}
					placeholder="search"
				/>
			</div>
		</div>
		<div class="p-4">
			<div
				style="height: {clientHeight - headerHeight}px"
				class="{searchResults?.length > 0 ? '' : 'hidden'}
                  -m-1 max-w-lg overflow-x-hidden overflow-y-scroll bg-neutral-50
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
					{@render actions(v)}
				{/each}
				<div class="h-6"></div>
			</div>
		
		</div>
	</div>
</div>
