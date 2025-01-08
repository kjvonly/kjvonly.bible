<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChapterSettings } from '../bible/models/chapterSettings';
	import { colorTheme } from '$lib/services/colorTheme.service';

	let { chapterSettings = $bindable() } = $props();
	let headerHeight = $state(0)

	let fontSizes = [
		{
			height: 'h-8 w-8',
			fontSize: 'text-xs'
		},
		{
			height: 'h-10 w-10',
			fontSize: 'text-base'
		},
		{
			height: 'h-12 w-12',
			fontSize: 'text-2xl'
		}
	];

	let fontFamilies = [
		{
			name: 'sans',
			fontFamily: 'font-sans'
		},
		{
			name: 'KJV1611',
			fontFamily: 'font-KJV1611'
		}
	];
	onMount(async () => {
		if (chapterSettings && chapterSettings.doChapterFadeAnimation === undefined) {
			chapterSettings.doChapterFadeAnimation = false;
		}
	});

	function onSizeSelected(fontSize: string) {
		chapterSettings.fontSize = fontSize;
	}

	function onFontFamilySelected(fontFamily: string) {
		chapterSettings.fontFamily = fontFamily;
	}
</script>

<div
	class="h-full w-full justify-start justify-items-start overflow-y-scroll bg-neutral-100 text-neutral-700"
> 
	<header bind:clientHeight={headerHeight} class="items c sticky top-0 w-full flex-col border-b-2 bg-neutral-100">
		<div class="flex w-full justify-between pl-2 pt-2 text-neutral-700">
			<div class="flex items-center">
				<h1 class=" text-center text-lg">READING SETTINGS</h1>
			</div>
		</div>
	</header>

	<div style="max-height: calc(100% - {headerHeight}px);" class="flex w-full h-full flex-col justify-center bg-neutral-50 p-6">
		
		<div class="flex w-full flex-row">
			<button
				onclick={() => {
					colorTheme.setLightTheme();
					chapterSettings.colorTheme = 'light';
				}}
				class=" {chapterSettings?.colorTheme === 'light'
					? 'bg-primary-500 '
					: ' '} flex h-16 w-1/2 items-center justify-center border"
				aria-label="font-size button"
			>
				<svg
					class="h-6"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					width="24px"
					height="24px"
				>
					<path
						class={chapterSettings?.colorTheme === 'light'
							? 'fill-neutral-100'
							: 'fill-neutral-100'}
						d="M 12 0 C 11.4 0 11 0.4 11 1 L 11 2 C 11 2.6 11.4 3 12 3 C 12.6 3 13 2.6 13 2 L 13 1 C 13 0.4 12.6 0 12 0 z M 4.1992188 3.1992188 C 3.9492188 3.1992187 3.7 3.3 3.5 3.5 C 3.1 3.9 3.1 4.5003906 3.5 4.9003906 L 4.1992188 5.5996094 C 4.5992187 5.9996094 5.1996094 5.9996094 5.5996094 5.5996094 C 5.9996094 5.1996094 5.9996094 4.5992188 5.5996094 4.1992188 L 4.9003906 3.5 C 4.7003906 3.3 4.4492188 3.1992188 4.1992188 3.1992188 z M 19.800781 3.1992188 C 19.550781 3.1992188 19.299609 3.3 19.099609 3.5 L 18.400391 4.1992188 C 18.000391 4.5992187 18.000391 5.1996094 18.400391 5.5996094 C 18.800391 5.9996094 19.400781 5.9996094 19.800781 5.5996094 L 20.5 4.9003906 C 20.9 4.5003906 20.9 3.9 20.5 3.5 C 20.3 3.3 20.050781 3.1992188 19.800781 3.1992188 z M 12 5 A 7 7 0 0 0 5 12 A 7 7 0 0 0 12 19 A 7 7 0 0 0 19 12 A 7 7 0 0 0 12 5 z M 1 11 C 0.4 11 0 11.4 0 12 C 0 12.6 0.4 13 1 13 L 2 13 C 2.6 13 3 12.6 3 12 C 3 11.4 2.6 11 2 11 L 1 11 z M 22 11 C 21.4 11 21 11.4 21 12 C 21 12.6 21.4 13 22 13 L 23 13 C 23.6 13 24 12.6 24 12 C 24 11.4 23.6 11 23 11 L 22 11 z M 4.9003906 18.099609 C 4.6503906 18.099609 4.3992188 18.200391 4.1992188 18.400391 L 3.5 19.099609 C 3.1 19.499609 3.1 20.1 3.5 20.5 C 3.9 20.9 4.5003906 20.9 4.9003906 20.5 L 5.5996094 19.800781 C 5.9996094 19.400781 5.9996094 18.800391 5.5996094 18.400391 C 5.3996094 18.200391 5.1503906 18.099609 4.9003906 18.099609 z M 19.099609 18.099609 C 18.849609 18.099609 18.600391 18.200391 18.400391 18.400391 C 18.000391 18.800391 18.000391 19.400781 18.400391 19.800781 L 19.099609 20.5 C 19.499609 20.9 20.1 20.9 20.5 20.5 C 20.9 20.1 20.9 19.499609 20.5 19.099609 L 19.800781 18.400391 C 19.600781 18.200391 19.349609 18.099609 19.099609 18.099609 z M 12 21 C 11.4 21 11 21.4 11 22 L 11 23 C 11 23.6 11.4 24 12 24 C 12.6 24 13 23.6 13 23 L 13 22 C 13 21.4 12.6 21 12 21 z"
					/>
				</svg>
			</button>
			<button
				onclick={() => {
					colorTheme.setDarkTheme();
					chapterSettings.colorTheme = 'dark';
				}}
				class=" {chapterSettings?.colorTheme === 'dark'
					? 'bg-primary-500 '
					: ''} flex h-16 w-1/2 items-center justify-center border"
				aria-label="font-size button"
			>
				<svg
					class="h-6"
					version="1.1"
					id="svg473"
					width="94.847404"
					height="106.27697"
					viewBox="0 0 94.847404 106.27697"
					xmlns="http://www.w3.org/2000/svg"
				>
					<g id="g479" transform="translate(-83.478769,-13.695354)">
						<path
							class={chapterSettings?.colorTheme === 'dark'
								? ' fill-neutral-100'
								: 'fill-neutral-700'}
							d="m 123.63575,118.71778 c -8.26967,-1.94139 -20.37754,-9.06807 -26.273747,-15.4647 -2.994481,-3.24864 -7.343225,-9.914372 -9.663873,-14.812752 -3.815837,-8.054396 -4.219361,-10.117536 -4.219361,-21.572812 0,-11.455276 0.403524,-13.518416 4.219361,-21.572812 5.675823,-11.980419 13.42575,-20.064811 24.58783,-25.648972 12.91273,-6.459976 29.19281,-8.044725 29.19281,-2.841712 0,0.966241 -1.47081,2.720513 -3.26847,3.898383 -5.66308,3.710594 -10.23082,9.25226 -13.87367,16.83178 -2.96523,6.16963 -3.52199,9.131782 -3.50853,18.666666 0.0195,13.848922 2.44031,19.160356 13.22484,29.016804 9.75394,8.91455 17.24958,11.411006 32.39029,10.787724 13.53878,-0.557336 14.54362,0.447272 7.85384,7.852063 -11.41863,12.63905 -33.07019,18.99005 -50.66132,14.86034 z"
							id="path483"
						/>
					</g>
				</svg>
			</button>
		</div>

		<div class="flex w-full flex-row pt-4">
			{#each fontSizes as fs}
				<button
					onclick={() => onSizeSelected(fs.fontSize)}
					class=" {chapterSettings?.fontSize === fs.fontSize
						? 'bg-primary-500 '
						: ' '} flex h-16 w-1/3 items-center justify-center border"
					aria-label="font-size button"
				>
					<svg
						class="{fs.height} py-2 text-center"
						version="1.1"
						id="svg415"
						width="117.02834"
						height="85.458069"
						viewBox="0 0 117.02834 85.458069"
						xmlns="http://www.w3.org/2000/svg"
					>
						<g id="g421" transform="translate(-59.92657,-22.570134)">
							<path
								class={chapterSettings?.fontSize === fs.fontSize
									? 'fill-neutral-100'
									: 'fill-neutral-700'}
								d="m 61.047083,105.83428 c -0.909677,-1.0961 -1.357219,-3.0461 -0.994538,-4.33334 2.723837,-9.667518 29.593018,-76.022427 31.317565,-77.34043 2.77458,-2.120501 5.875231,-2.120501 8.7698,0 2.5769,1.887787 31.90842,76.27342 31.29752,79.37145 -0.21793,1.10517 -1.39595,2.63891 -2.61781,3.40832 -3.31477,2.08732 -5.48086,-0.3959 -9.67888,-11.095958 L 115.4722,86.493843 H 95.74451 76.016817 l -3.573574,9.64098 C 68.099949,107.8524 64.948231,110.53488 61.047083,105.83428 Z M 103.87929,56.556127 C 99.75649,45.95705 95.977646,37.70705 95.481862,38.222794 c -0.98388,1.023491 -14.440673,35.219485 -14.440673,36.696201 0,0.4995 6.825174,0.908182 15.167056,0.908182 H 111.3753 Z m 44.91746,48.980683 c -1.96777,-1.22067 -4.31916,-3.6047 -5.2253,-5.29785 -0.90615,-1.693147 -2.14615,-3.07845 -2.75557,-3.07845 -1.75137,0 -1.25012,-18.974832 0.59772,-22.626647 0.91654,-1.811321 3.7577,-4.71296 6.31368,-6.448084 6.26244,-4.251241 13.47828,-3.376285 19.18026,2.325703 3.81485,3.814845 4.15174,4.916232 4.61341,15.082295 0.40279,8.869677 0.97824,11.303272 3.00914,12.725766 3.04066,2.129767 3.25362,5.998207 0.45792,8.318427 -1.51607,1.25823 -3.18403,1.35691 -6.37612,0.37723 -2.37763,-0.72971 -5.5037,-0.86521 -6.94683,-0.3011 -4.30028,1.68094 -9.06494,1.28206 -12.86831,-1.07729 z m 10.81774,-10.263803 c 2.45221,-2.954737 1.27956,-16.843718 -1.5733,-18.634332 -4.30358,-2.701161 -6.95208,0.556379 -7.40323,9.105679 -0.4255,8.063173 1.06356,11.416156 5.06989,11.416156 1.28708,0 3.04507,-0.849376 3.90664,-1.887503 z"
								id="path425"
							/>
						</g>
					</svg>
				</button>
			{/each}
		</div>
		<div class="flex w-full flex-row pt-4">
			{#each fontFamilies as ff}
				<button
					onclick={() => onFontFamilySelected(ff.fontFamily)}
					class="{chapterSettings?.fontFamily === ff.fontFamily
						? 'bg-primary-500 text-neutral-100 '
						: ' '} {ff.fontFamily} flex h-16 w-1/2 items-center justify-center border text-lg font-bold"
					aria-label="font-size button"
				>
					{ff.name}
				</button>
			{/each}
		</div>

		<div class="flex w-full flex-col space-y-2 pt-4">
			<label for="Option1" class="flex cursor-pointer items-start gap-4">
				<div class="flex items-center">
					&#8203;
					{#if chapterSettings}
						<input
							type="checkbox"
							bind:checked={chapterSettings.doChapterFadeAnimation}
							class="size-4 rounded border-gray-300 accent-gray-10"
							id="Option1"
						/>
					{/if}
				</div>

				<div>
					<strong class="font-medium"> Chapter Fade Animation </strong>
				</div>
			</label>
		</div>
		<span class="flex-1 h-full"></span>
	</div>
</div>
