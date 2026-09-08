<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements';

	let {
		onClick,
		svgClasses = 'h-12 w-12 p-4',
		btnClasses = 'h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 ring-2 ring-neutral-300'
	}: {
		onClick: MouseEventHandler<HTMLButtonElement>;
		svgClasses?: string;
		btnClasses?: string;
	} = $props();
</script>

<button onclick={onClick} class={btnClasses} aria-label="next chapter arrow">
	<svg
		class="{svgClasses}  fill-neutral-700"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24px"
		height="24px"
	>
		<path
			d="M 19.171875 2 C 18.448125 2 17.724375 2.275625 17.171875 2.828125 L 16 4 L 20 8 L 21.171875 6.828125 C 22.275875 5.724125 22.275875 3.933125 21.171875 2.828125 C 20.619375 2.275625 19.895625 2 19.171875 2 z M 14.5 5.5 L 3 17 L 3 21 L 7 21 L 18.5 9.5 L 14.5 5.5 z"
		/>
	</svg>
</button>
