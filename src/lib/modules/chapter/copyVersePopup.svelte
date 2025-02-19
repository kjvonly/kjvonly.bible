<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { toastService } from '$lib/services/toast.service';
	import { onMount } from 'svelte';

	let { chapterKey, showCopyVersePopup = $bindable() } = $props();

	let verseKeys: string[] = $state([]);
	let verses: any = $state({});
	let booknames: any;
	let checkAll = $state(false);

	let title = $state('');
	onMount(() => {
		let keys = chapterKey.split('_');
		if (keys.length < 2) {
			showCopyVersePopup = false;
		}

		(async () => {
			let chapter = await chapterService.getChapter(`${keys[0]}_${keys[1]}`);
			booknames = await chapterService.getBooknames();
			verses = chapter.verses;
			if (chapter) {
				verseKeys = Object.keys(chapter.verseMap).sort((a, b) => {
					return parseInt(a) - parseInt(b);
				});
			}

			title = `${booknames['shortNames'][keys[0]]} ${keys[1]}`;
		})();
	});

	function onCopy() {
		let checked: any = [];
		Object.keys(verses).map((v: any) => {
			if (verses[v].checked) {
				checked.push(verses[v].number);
			}
		});

		let sortedKeys: any = [];
		if (checked.length > 1) {
			sortedKeys = checked.sort((a, b) => {
				return parseInt(a) - parseInt(b);
			});
		} else {
			sortedKeys = checked;
		}

		let startKey = sortedKeys[0];
		let lastKey = sortedKeys[0];

		let copyText = '';

		let buckets = [];
		let range: string[] = [];
		sortedKeys.forEach((k) => {
			if (k - lastKey > 1) {
				buckets.push(range);
				range = [k];
				lastKey = k;
			} else {
				range.push(k);
				lastKey = k;
			}
		});

		buckets.push(range);

		buckets.forEach((r) => {
			let first = r[0];
			let last = r[r.length - 1];

			let text = '';
			if (first === last) {
				text = `${title}:${first}\n`;
			} else {
				text = `${title}:${first}-${last}\n`;
			}

			r.forEach((v) => {
				text += `${verses[v].text}\n`;
			});

			text += '\n';
			copyText += text;
		});

		navigator.clipboard.writeText(copyText);
		toastService.showToast('Copied Verses');
	}

	function toggleSelects() {
		Object.keys(verses).forEach((v) => {
			verses[v].checked = checkAll;
		});
	}

	let clientHeight = $state(0);
	let headerHeight = $state(0);
</script>

<div bind:clientHeight class="flex h-full w-full justify-center bg-neutral-50">
	<div class="w-full md:max-w-lg">
		<header
			bind:clientHeight={headerHeight}
			class="sticky top-0 w-full flex-col border-b-2 bg-neutral-100 text-neutral-700"
		>
			<div class="flex w-full justify-between p-2">
				<header
					bind:clientHeight={headerHeight}
					class=" flex w-full max-w-lg flex-row items-center justify-between bg-neutral-100 text-neutral-700"
				>
					<button
						aria-label="save"
						onclick={() => {
							onCopy();
						}}
						class="h-12 w-12 px-2 pt-2 text-neutral-700"
					>
						<svg
							version="1.1"
							id="svg2"
							width="100%"
							height="100%"
							viewBox="0 0 106.96539 106.83998"
							xmlns="http://www.w3.org/2000/svg"
						>
							<defs id="defs6" />
							<g id="g8" transform="translate(-9.1541294,-7.1649487)">
								<path
									style="fill:#020202;stroke:none;stroke-width:1.33333"
									d="M 9.2233551,92.567516 H 19.890021 V 17.900849 H 94.55669 V 7.2341829 l -57.333069,0.004 c -7.420266,0.018 -17.579333,-1.0826537 -23.3292,4.6670661 -5.7497329,5.749867 -4.6490529,15.908934 -4.6670529,23.3292 l -0.004,57.333067 M 38.105088,31.106449 c -5.949867,3.266267 -7.0848,9.945334 -7.402,16.15 -0.7004,13.7028 -0.224533,27.591334 -0.133467,41.31 0.0428,6.435867 -0.4952,14.477741 3.859334,19.780261 4.1912,5.1036 11.393466,5.3456 17.4684,5.49387 12.426933,0.30333 24.895195,0.1036 37.325465,0.0529 6.182,-0.0252 13.5064,0.54933 19.1188,-2.5316 5.94987,-3.26627 7.0848,-9.94532 7.402,-16.149994 0.7004,-13.7028 0.22454,-27.591333 0.13347,-41.31 -0.0428,-6.435867 0.4952,-14.477733 -3.85933,-19.780267 -4.1912,-5.1036 -11.39347,-5.3456 -17.46841,-5.493866 -12.42693,-0.303334 -24.895195,-0.1036 -37.325462,-0.05293 -6.182,0.0252 -13.5064,-0.549333 -19.1188,2.5316 m 67.118272,8.127734 V 103.23419 H 41.223355 V 39.234183 Z"
									id="path1212"
								/>
							</g>
						</svg>
					</button>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<p onclick={() => {}} class="hover:cursor-pointer">
						<span class="inline-block font-bold">{title}</span>
					</p>
					<button
						aria-label="close"
						onclick={() => {
							showCopyVersePopup = false;
						}}
						class="h-12 w-12 px-2 pt-2 text-neutral-700"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
							<path
								class="fill-neutral-700"
								d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
							/>
						</svg>
					</button>
				</header>
			</div>
		</header>
		<div
			style="height: {clientHeight - headerHeight}px"
			class="flex w-full flex-col overflow-y-scroll border"
		>
			<div>
				<input
					type="checkbox"
					class="mx-4 mt-5 h-5 w-5 accent-supporta-500"
					bind:checked={checkAll}
					onchange={() => {
						toggleSelects();
					}}
				/>
			</div>
			{#each verseKeys as k}
				<div class="flex flex-row items-start space-y-4">
					<div>
						<input
							type="checkbox"
							class="mx-4 mt-5 h-5 w-5 accent-supporta-500"
							bind:checked={verses[k].checked}
						/>
					</div>
					<p>
						<span class="vno">{verses[k].text.split(' ')[0]}</span>
						{verses[k].text.split(' ').slice(1).join(' ')}
					</p>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.vno {
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		cursor: pointer;
		@apply text-xs text-neutral-700 sm:text-base;
	}
</style>
