<script lang="ts">
	import { bibleNavigationService } from '$lib/services/bible-navigation.service';
	import { onMount } from 'svelte';
	import Header from '../../components/header.svelte';
	import Chapter from '../components/chapter.svelte';
	import { newChapterSettings, type ChapterSettings } from '../models/chapterSettings';

	let chapterKey: string | null = $state(null);
	let bookName: string = $state('');
	let bookChapter: string = $state('');

	let chapterSettings: ChapterSettings | null = $state(null);

	$effect(() => {
		chapterSettings;
		if (chapterSettings !== null) {
			localStorage.setItem('chapterSettings', JSON.stringify(chapterSettings));
		}
	});

	$effect(() => {
		if (chapterKey) {
			localStorage.setItem('currentChapterKey', chapterKey);
		}
	});

	onMount(() => {
		let cs = localStorage.getItem('chapterSettings');
		if (cs !== null) {
			chapterSettings = JSON.parse(cs);
		} else {
			chapterSettings = newChapterSettings();
		}

		let ck = localStorage.getItem('currentChapterKey');
		if (ck) {
			chapterKey = ck;
		} else {
			chapterKey = '50_3'; // John 3
		}
	});

	async function _nextChapter() {
		if (chapterKey) {
			chapterKey = bibleNavigationService.next(chapterKey);
		}
	}

	async function _previousChapter() {
		if (chapterKey) {
			chapterKey = bibleNavigationService.previous(chapterKey);
		}
	}
</script>

<div class="relative">
	<Header bind:bookName bind:bookChapter bind:chapterKey bind:chapterSettings></Header>

	<div class="m-4 flex justify-center md:m-12">
		<div class="max-w-sm md:max-w-lg">
			<div
				class="flex flex-wrap justify-start {chapterSettings?.fontSize} {chapterSettings?.fontFamily}"
			>
				<Chapter
					bind:bookName
					bind:bookChapter
					bind:chapterKey
					doChapterFadeAnimation={chapterSettings?.doChapterFadeAnimation}
				></Chapter>
			</div>
		</div>
	</div>
</div>

<!-- prev/next chapter buttons -->

<div class="fixed bottom-28 -z-10 mx-auto hidden w-full justify-center px-4 md:flex md:flex-row">
	<div class="flex w-full max-w-6xl">
		<button
			onclick={_previousChapter}
			class="rounded-full bg-white text-gray-500 shadow-lg ring-2 ring-gray-300 dark:bg-black dark:ring-gray-400"
			aria-label="left arrow"
		>
			<svg
				class="h-12 w-12 p-4"
				version="1.1"
				width="34.484818"
				height="58.242714"
				viewBox="0 0 34.484818 58.242714"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-40,-34.843996)">
					<path
						class="fill-gray-500"
						style="stroke-width:1.33333"
						d="M 53,80.35758 C 43.505656,70.810684 40,66.386425 40,63.951131 c 0,-2.445847 3.49976,-6.821123 13.132229,-16.417448 11.374404,-11.331724 13.649954,-13.023883 17,-12.641652 2.904499,0.331396 3.980004,1.235166 4.318418,3.62886 0.353064,2.497337 -1.95028,5.601021 -10.637231,14.333333 L 52.725541,64 63.813416,75.145776 C 72.500367,83.878088 74.803711,86.981772 74.450647,89.479109 74.105181,91.922689 73.066399,92.755693 70,93.048101 66.510733,93.380832 64.340117,91.760465 53,80.35758 Z"
						id="path170"
					/>
				</g>
			</svg>
		</button>
		<span class="flex-1"></span>
		<button
			onclick={_nextChapter}
			class="h-12 w-12 rounded-full bg-white text-gray-500 ring-2 ring-gray-300 dark:bg-black dark:ring-gray-400"
			aria-label="next chapter arrow"
		>
			<svg
				class="h-12 w-12 p-4"
				version="1.1"
				id="svg2"
				width="34.484821"
				height="58.242714"
				viewBox="0 0 34.484822 58.242714"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-105.93567,-41.081576)">
					<path
						class="fill-gray-500"
						style="stroke-width:1.33333"
						d="m 127.42049,86.59516 c 9.49434,-9.546896 13,-13.971155 13,-16.406449 0,-2.445847 -3.49976,-6.821123 -13.13223,-16.417448 -11.37441,-11.331724 -13.64996,-13.023883 -17,-12.641652 -2.9045,0.331396 -3.98001,1.235166 -4.31842,3.62886 -0.35306,2.497337 1.95028,5.601021 10.63723,14.333333 l 11.08788,11.145776 -11.08788,11.145776 c -8.68695,8.732312 -10.99029,11.835996 -10.63723,14.333333 0.34547,2.44358 1.38425,3.276584 4.45065,3.568992 3.48926,0.332731 5.65988,-1.287636 17,-12.690521 z"
						id="path170"
					/>
				</g>
			</svg>
		</button>
	</div>
</div>

<div class="fixed md:hidden bottom-28 left-0 p-4">
	<button
		onclick={_previousChapter}
		class="rounded-full bg-white text-gray-500 shadow-lg ring-2 ring-gray-300 dark:bg-black dark:ring-gray-400"
		aria-label="left arrow"
	>
		<svg
			class="h-12 w-12 p-4"
			version="1.1"
			width="34.484818"
			height="58.242714"
			viewBox="0 0 34.484818 58.242714"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g id="g8" transform="translate(-40,-34.843996)">
				<path
					class="fill-gray-500"
					style="stroke-width:1.33333"
					d="M 53,80.35758 C 43.505656,70.810684 40,66.386425 40,63.951131 c 0,-2.445847 3.49976,-6.821123 13.132229,-16.417448 11.374404,-11.331724 13.649954,-13.023883 17,-12.641652 2.904499,0.331396 3.980004,1.235166 4.318418,3.62886 0.353064,2.497337 -1.95028,5.601021 -10.637231,14.333333 L 52.725541,64 63.813416,75.145776 C 72.500367,83.878088 74.803711,86.981772 74.450647,89.479109 74.105181,91.922689 73.066399,92.755693 70,93.048101 66.510733,93.380832 64.340117,91.760465 53,80.35758 Z"
					id="path170"
				/>
			</g>
		</svg>
	</button>
</div>
<div class="fixed md:hidden bottom-28 right-0 p-4">
	<button
		onclick={_nextChapter}
		class="h-12 w-12 rounded-full bg-white text-gray-500 ring-2 ring-gray-300 dark:bg-black dark:ring-gray-400"
		aria-label="next chapter arrow"
	>
		<svg
			class="h-12 w-12 p-4"
			version="1.1"
			id="svg2"
			width="34.484821"
			height="58.242714"
			viewBox="0 0 34.484822 58.242714"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g id="g8" transform="translate(-105.93567,-41.081576)">
				<path
					class="fill-gray-500"
					style="stroke-width:1.33333"
					d="m 127.42049,86.59516 c 9.49434,-9.546896 13,-13.971155 13,-16.406449 0,-2.445847 -3.49976,-6.821123 -13.13223,-16.417448 -11.37441,-11.331724 -13.64996,-13.023883 -17,-12.641652 -2.9045,0.331396 -3.98001,1.235166 -4.31842,3.62886 -0.35306,2.497337 1.95028,5.601021 10.63723,14.333333 l 11.08788,11.145776 -11.08788,11.145776 c -8.68695,8.732312 -10.99029,11.835996 -10.63723,14.333333 0.34547,2.44358 1.38425,3.276584 4.45065,3.568992 3.48926,0.332731 5.65988,-1.287636 17,-12.690521 z"
					id="path170"
				/>
			</g>
		</svg>
	</button>
</div>
