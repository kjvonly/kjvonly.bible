<script lang="ts">
	import { bibleNavigationService } from '$lib/services/bible-navigation.service';
	import { onMount } from 'svelte';
	import Header from '../../components/header.svelte';
	import Chapter from '../components/chapter.svelte';
	import { newChapterSettings, type ChapterSettings } from '../models/chapterSettings';
	import { colorTheme } from '$lib/services/colorTheme.service';
	
	
	let chapterKey: string | null = $state(null);
	let bookName: string = $state('');
	let bookChapter: string = $state('');
	let chapterWidth = $state(0);

	let chapterSettings: ChapterSettings | null = $state(null);

	$effect(() => {
		chapterSettings;

		if (chapterSettings !== null) {
			localStorage.setItem('chapterSettings', JSON.stringify(chapterSettings));
		}

		/* update color theme */
		if (chapterSettings && chapterSettings.colorTheme) {
			colorTheme.setTheme(chapterSettings?.colorTheme);
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

			if (chapterSettings && chapterSettings.colorTheme) {
				colorTheme.setTheme(chapterSettings?.colorTheme);
			}
		} else {
			chapterSettings = newChapterSettings();
		}

		let ck = localStorage.getItem('currentChapterKey');
		if (ck) {
			chapterKey = ck;
		} else {
			chapterKey = '50_3'; // John 3
		}

		bibleNavigationService.subscribe('0', goto)
	});

	function goto(key: string){
		chapterKey = key
	}

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

	let lastKnownScrollPosition = 0;
	let ticking = false;

	let buttonTopOffset = $state(0);
	function setButtonOffset(sp: number) {
		const scrolledTo = window.scrollY + window.innerHeight;
		const threshold = 200; // Adjust this value as needed
		const isReachBottom = document.body.scrollHeight - threshold <= scrolledTo;
		if (isReachBottom) {
			// this function will be called when window height changes i.e. changing a chapter.
			// when this happens pos will be negative. If we remove this check the buttons will
			// end up in the header :)
			let pos = (scrolledTo - document.body.scrollHeight) * -1;
			if (pos < 0) {
				return;
			}
			buttonTopOffset = (scrolledTo - document.body.scrollHeight) * -1;
		} else {
			buttonTopOffset = sp / 3;
		}
	}

	document.addEventListener('scroll', (event) => {
		lastKnownScrollPosition = window.scrollY;
		if (!ticking) {
			window.requestAnimationFrame(() => {
				setButtonOffset(lastKnownScrollPosition);
				ticking = false;
			});
			ticking = true;
		}
	});

</script>

<div class="relative">
	<div>
		<Header bind:bookName bind:bookChapter bind:chapterKey bind:chapterSettings></Header>
	</div>
	<div class="min-h-16"></div>
	<div class="m-4 flex justify-center md:m-16">
		<div
			style="transform: translate3d(0px, {buttonTopOffset}px, 0px);"
			class="fixed bottom-28 mx-auto hidden w-full justify-center px-4 md:flex md:flex-row"
		>
			<div class="flex w-full max-w-6xl">
				<button
					onclick={_previousChapter}
					class="rounded-full bg-neutral-100 text-neutral-700 shadow-lg ring-2 ring-neutral-300"
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
								class="fill-neutral-700"
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
					class="h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 ring-2 ring-neutral-300"
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
								class="fill-neutral-700"
								style="stroke-width:1.33333"
								d="m 127.42049,86.59516 c 9.49434,-9.546896 13,-13.971155 13,-16.406449 0,-2.445847 -3.49976,-6.821123 -13.13223,-16.417448 -11.37441,-11.331724 -13.64996,-13.023883 -17,-12.641652 -2.9045,0.331396 -3.98001,1.235166 -4.31842,3.62886 -0.35306,2.497337 1.95028,5.601021 10.63723,14.333333 l 11.08788,11.145776 -11.08788,11.145776 c -8.68695,8.732312 -10.99029,11.835996 -10.63723,14.333333 0.34547,2.44358 1.38425,3.276584 4.45065,3.568992 3.48926,0.332731 5.65988,-1.287636 17,-12.690521 z"
								id="path170"
							/>
						</g>
					</svg>
				</button>
			</div>
		</div>

		<div class="max-w-sm md:z-10 md:max-w-lg">
			<div
				bind:clientWidth={chapterWidth}
				class="flex flex-wrap justify-start {chapterSettings?.fontSize} {chapterSettings?.fontFamily}"
			>
				<Chapter
					bind:bookName
					bind:bookChapter
					bind:chapterKey
					doChapterFadeAnimation={chapterSettings?.doChapterFadeAnimation}
				></Chapter>
				<span class="h-16 md:hidden"></span>
			</div>
		</div>
	</div>
</div>

<!-- prev/next chapter buttons -->

<div
	style="transform: translate3d(0px, {buttonTopOffset}px, 0px);"
	class="fixed bottom-0 left-0 p-4 md:hidden"
>
	<button
		onclick={_previousChapter}
		class="rounded-full bg-neutral-100 text-neutral-700 shadow-lg ring-2 ring-neutral-300"
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
					class="fill-neutral-700"
					style="stroke-width:1.33333"
					d="M 53,80.35758 C 43.505656,70.810684 40,66.386425 40,63.951131 c 0,-2.445847 3.49976,-6.821123 13.132229,-16.417448 11.374404,-11.331724 13.649954,-13.023883 17,-12.641652 2.904499,0.331396 3.980004,1.235166 4.318418,3.62886 0.353064,2.497337 -1.95028,5.601021 -10.637231,14.333333 L 52.725541,64 63.813416,75.145776 C 72.500367,83.878088 74.803711,86.981772 74.450647,89.479109 74.105181,91.922689 73.066399,92.755693 70,93.048101 66.510733,93.380832 64.340117,91.760465 53,80.35758 Z"
					id="path170"
				/>
			</g>
		</svg>
	</button>
</div>
<div
	style="transform: translate3d(0px, {buttonTopOffset}px, 0px); "
	class="fixed bottom-0 right-0 p-4 md:hidden"
>
	<button
		onclick={_nextChapter}
		class="h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 ring-2 ring-neutral-300"
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
					class="fill-neutral-700"
					style="stroke-width:1.33333"
					d="m 127.42049,86.59516 c 9.49434,-9.546896 13,-13.971155 13,-16.406449 0,-2.445847 -3.49976,-6.821123 -13.13223,-16.417448 -11.37441,-11.331724 -13.64996,-13.023883 -17,-12.641652 -2.9045,0.331396 -3.98001,1.235166 -4.31842,3.62886 -0.35306,2.497337 1.95028,5.601021 10.63723,14.333333 l 11.08788,11.145776 -11.08788,11.145776 c -8.68695,8.732312 -10.99029,11.835996 -10.63723,14.333333 0.34547,2.44358 1.38425,3.276584 4.45065,3.568992 3.48926,0.332731 5.65988,-1.287636 17,-12.690521 z"
					id="path170"
				/>
			</g>
		</svg>
	</button>
</div>
