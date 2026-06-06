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
		class="{svgClasses} fill-neutral-700"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24px"
		height="24px"
	>
		<path
			d="M 9 2 C 5.1458514 2 2 5.1458514 2 9 C 2 12.854149 5.1458514 16 9 16 C 10.747998 16 12.345009 15.348024 13.574219 14.28125 L 14 14.707031 L 14 16 L 20 22 L 22 20 L 16 14 L 14.707031 14 L 14.28125 13.574219 C 15.348024 12.345009 16 10.747998 16 9 C 16 5.1458514 12.854149 2 9 2 z M 9 4 C 11.773268 4 14 6.2267316 14 9 C 14 11.773268 11.773268 14 9 14 C 6.2267316 14 4 11.773268 4 9 C 4 6.2267316 6.2267316 4 9 4 z"
		/>
	</svg></button
>
