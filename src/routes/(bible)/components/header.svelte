<script lang="ts">
	import { base } from '$app/paths';
	import BookChapterPopup from './bookChapterPopup.svelte';

	let { chapterKey = $bindable(), bookName = $bindable(), bookChapter = $bindable() } = $props();

	let showBookChapterPopup: Boolean = $state(false);
	function onBookChapterClick() {
		showBookChapterPopup = !showBookChapterPopup;
	}

	function onSettingsClick() {}
</script>

<div class="flex-column sticky top-0 z-10 w-[100%] bg-white">
	<div class="pt-5">
		<h1 class="text-3xl font-bold">KJVonly</h1>
	</div>

	<div class="flex relative w-full justify-center pt-11 pb-2 text-base">
		<div class=" w-[300px] flex-col">
			<!-- book chapter selection -->
			<div class="relative">
				<button
					class="mt-2 flex w-full items-center justify-between border-b-2 hover:bg-gray-300/75"
					onclick={onBookChapterClick}
				>
					<span class="w-full text-start text-sm">{bookName} {bookChapter}</span>

					<span
						><img
							class="mr-2 inline-block w-3"
							src={`${base}/icons/chevron-down.svg`}
							alt="chevron-down"
						/></span
					>
				</button>
				<div
					class="md:absolute fixed md:-left-[150px] left-0 right-0 {showBookChapterPopup
						? ''
						: 'hidden'}  z-popover mx-auto h-[70vh] w-[90vw] md:min-w-sm bg-white shadow-lg md:w-1/2"
				>
					<BookChapterPopup bind:showBookChapterPopup bind:chapterKey></BookChapterPopup>
				</div>
			</div>
		</div>
		<!-- settings buttong Aa -->
		<button
			onclick={onSettingsClick}
			class="ml-5 h-8 w-8 rounded-full bg-white ring-1 ring-gray-200 ring-offset-2"
			aria-label="font-size button"
		>
			<svg
				class="h-8 w-8 py-2 text-center"
				version="1.1"
				id="svg415"
				width="117.02834"
				height="85.458069"
				viewBox="0 0 117.02834 85.458069"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g421" transform="translate(-59.92657,-22.570134)">
					<path
						class=""
						d="m 61.047083,105.83428 c -0.909677,-1.0961 -1.357219,-3.0461 -0.994538,-4.33334 2.723837,-9.667518 29.593018,-76.022427 31.317565,-77.34043 2.77458,-2.120501 5.875231,-2.120501 8.7698,0 2.5769,1.887787 31.90842,76.27342 31.29752,79.37145 -0.21793,1.10517 -1.39595,2.63891 -2.61781,3.40832 -3.31477,2.08732 -5.48086,-0.3959 -9.67888,-11.095958 L 115.4722,86.493843 H 95.74451 76.016817 l -3.573574,9.64098 C 68.099949,107.8524 64.948231,110.53488 61.047083,105.83428 Z M 103.87929,56.556127 C 99.75649,45.95705 95.977646,37.70705 95.481862,38.222794 c -0.98388,1.023491 -14.440673,35.219485 -14.440673,36.696201 0,0.4995 6.825174,0.908182 15.167056,0.908182 H 111.3753 Z m 44.91746,48.980683 c -1.96777,-1.22067 -4.31916,-3.6047 -5.2253,-5.29785 -0.90615,-1.693147 -2.14615,-3.07845 -2.75557,-3.07845 -1.75137,0 -1.25012,-18.974832 0.59772,-22.626647 0.91654,-1.811321 3.7577,-4.71296 6.31368,-6.448084 6.26244,-4.251241 13.47828,-3.376285 19.18026,2.325703 3.81485,3.814845 4.15174,4.916232 4.61341,15.082295 0.40279,8.869677 0.97824,11.303272 3.00914,12.725766 3.04066,2.129767 3.25362,5.998207 0.45792,8.318427 -1.51607,1.25823 -3.18403,1.35691 -6.37612,0.37723 -2.37763,-0.72971 -5.5037,-0.86521 -6.94683,-0.3011 -4.30028,1.68094 -9.06494,1.28206 -12.86831,-1.07729 z m 10.81774,-10.263803 c 2.45221,-2.954737 1.27956,-16.843718 -1.5733,-18.634332 -4.30358,-2.701161 -6.95208,0.556379 -7.40323,9.105679 -0.4255,8.063173 1.06356,11.416156 5.06989,11.416156 1.28708,0 3.04507,-0.849376 3.90664,-1.887503 z"
						id="path425"
					/>
				</g>
			</svg>
		</button>
	</div>

	<span class="fixed left-0 w-full border-b-2 bg-white dark:border-gray-500"></span>
</div>

<style>
</style>
