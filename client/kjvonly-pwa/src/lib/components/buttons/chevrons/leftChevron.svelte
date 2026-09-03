<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements';

	let {
		onClick,
		classes = 'h-12 w-12 p-4'
	}: {
		onClick: MouseEventHandler<HTMLButtonElement>;
		classes?: string;
	} = $props();
</script>

<button
	onclick={onClick}
	class="rounded-full bg-neutral-100 text-neutral-700 shadow-lg ring-2 ring-neutral-300 hover:cursor-pointer"
	aria-label="left arrow"
>
	<svg
		class={classes}
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
