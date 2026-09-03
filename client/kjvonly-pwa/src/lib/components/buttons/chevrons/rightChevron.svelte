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
	class="h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 ring-2 ring-neutral-300 hover:cursor-pointer"
	aria-label="next chapter arrow"
>
	<svg
		class={classes}
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
