<script lang="ts">
	import { bibleNavigationService } from '$lib/services/bibleNavigation.service';
	import { onMount, untrack } from 'svelte';
	import Chapter from './chapter.svelte';
	import { newSettings, type Settings } from '../../models/settings.model';
	import { settingsService } from '$lib/services/settings.service';

	import { paneService } from '$lib/services/pane.service.svelte';
	import ChapterActions from './chapterActions.svelte';
	import type { Pane } from '$lib/models/pane.model';
	import uuid4 from 'uuid4';
	import EditOptions from './editOptions.svelte';
	import { chapterService } from '$lib/api/chapters.service';

	let id = uuid4();
	let chapterKey: string | null = $state(null);
	let mode: any = $state({
		value: '',
		colorAnnotation: 'bg-highlighta',
		chapterKey: '73_1_1_1',
		notePopup: { show: false }
	});
	let annotations: any = $state({});
	let bookName: string = $state('');
	let bookChapter: string = $state('');
	let chapterWidth = $state(0);

	let chapterSettings: Settings | null = $state(null);

	let {
		paneId = $bindable<string>(),
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();


	$effect(() => {
		chapterSettings;

		if (chapterSettings !== null) {
			localStorage.setItem('settings', JSON.stringify(chapterSettings));
		}

		/* update color theme */
		if (chapterSettings && chapterSettings.colorTheme) {
			settingsService.setTheme(chapterSettings?.colorTheme);
		}
	});

	$effect(() => {
		if (chapterKey) {
			pane.buffer.bag.chapterKey = chapterKey;
			localStorage.setItem('lastChapterKey', chapterKey);
			paneService.save();
		}
	});

	async function _nextChapter(e: Event) {
		e.stopPropagation();
		if (chapterKey) {
			chapterKey = bibleNavigationService.next(chapterKey);
		}
	}

	async function _previousChapter(e: Event) {
		e.stopPropagation();
		if (chapterKey) {
			chapterKey = bibleNavigationService.previous(chapterKey);
		}
	}

	let lastKnownScrollPosition = $state(0);
	let ticking = false;

	let buttonTopOffset = $state(0);
	function setButtonOffset(sp: number) {
		let el = document.getElementById(id);
		if (el === null) {
			return;
		}

		const threshold = 200; // Adjust this value as needed
		const isReachBottom = el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;

		if (isReachBottom) {
			// this function will be called when window height changes i.e. changing a chapter.
			// when this happens pos will be negative. If we remove this check the buttons will
			// end up in the header :)
			let pos = (el.scrollTop + el.clientHeight - el.scrollHeight) * -1;
			if (pos < 0) {
				return;
			}
			buttonTopOffset = (el.scrollTop + el.clientHeight - el.scrollHeight) * -1;
		} else {
			buttonTopOffset = el.scrollTop / 3;
		}
	}

	onMount(() => {
		/*
		set paneId for popup actions
		*/
		mode.paneId = paneId;

		let cs = localStorage.getItem('settings');
		if (cs !== null) {
			chapterSettings = JSON.parse(cs);

			if (chapterSettings && chapterSettings.colorTheme) {
				settingsService.setTheme(chapterSettings?.colorTheme);
			}
		} else {
			chapterSettings = newSettings();
		}

		let ck = pane.buffer.bag.chapterKey;
		if (ck) {
			chapterKey = ck;
		} else {
			chapterKey = localStorage.getItem('lastChapterKey');
			if (!chapterKey) {
				chapterKey = '50_3'; // John 3
			}
		}

		let el = document.getElementById(id);
		if (el === null) {
			return;
		}

		el.addEventListener('scroll', (event) => {
			//lastKnownScrollPosition = window.scrollY;

			lastKnownScrollPosition = el.scrollTop;
			if (!ticking) {
				window.requestAnimationFrame(() => {
					setButtonOffset(lastKnownScrollPosition);
					ticking = false;
				});
				ticking = true;
			}
		});

		if (pane?.buffer?.bag?.lastVerse) {
			setTimeout(() => {
				let vel = document.getElementById(`${id}-vno-${pane.buffer.bag.lastVerse}`);
				vel?.scrollIntoView({
					behavior: 'instant',
					block: 'center'
				});
			}, 50);
		}

		let cc = document.getElementById(`chapter-container-${id}`);
		cc?.addEventListener('contextmenu', (e) => e.preventDefault());
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="overflow-hidden"
	oncontextmenu={() => {
		return false;
	}}
>
	<div {id} style="{containerHeight} {containerWidth}" class="overflow-y-scroll">
		<div class="sticky top-0 z-[1500] flex w-full justify-center">
			<ChapterActions
				bind:mode
				bind:chapterKey
				bind:annotations
				{bookName}
				{bookChapter}
				{containerHeight}
				{paneId}
			></ChapterActions>
		</div>
		<div class="kjvonly-noselect flex justify-center">
			<div class="max-w-lg">
				<div id="chapter-container-{id}" bind:clientWidth={chapterWidth}>
					<Chapter
						bind:bookName
						bind:bookChapter
						bind:chapterKey
						bind:id
						bind:pane
						bind:mode
						bind:annotations
						{lastKnownScrollPosition}
					></Chapter>
					<span class="h-16 md:hidden"></span>
				</div>
			</div>
		</div>
	</div>

	<!-- prev/next chapter buttons -->
	<div class="flex w-full justify-center">
		<div class="w-full max-w-6xl">
			{#if mode.value === ''}
				<div style="transform: translate3d(0px, {buttonTopOffset}px, 0px);" class="sticky z-10">
					<div class="absolute bottom-4 left-4">
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
				</div>
				<div style="transform: translate3d(0px, {buttonTopOffset}px, 0px); " class="sticky z-10">
					<div class="absolute bottom-4 right-4">
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
			{:else}
				<div style="transform: translate3d(0px, 0px, 0px); " class="sticky z-10">
					<div class="absolute bottom-0 w-full">
						<EditOptions bind:mode bind:annotations></EditOptions>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.kjvonly-noselect {
		-webkit-touch-callout: none;
		/* iOS Safari */
		-webkit-user-select: none;
		/* Safari */
		-khtml-user-select: none;
		/* Konqueror HTML */
		-moz-user-select: none;
		/* Old versions of Firefox */
		-ms-user-select: none;
		/* Internet Explorer/Edge */
		user-select: none;
		/* Non-prefixed version, currently
								  supported by Chrome, Edge, Opera and Firefox */
	}
</style>
