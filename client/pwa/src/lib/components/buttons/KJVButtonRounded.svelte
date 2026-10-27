<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	let {
		onClick,
		classes = 'h-12 min-w-24 rounded bg-neutral-100 text-neutral-700 ring-2 ring-neutral-300 p-2',
		disabled = false,
		children
	}: {
		onClick: MouseEventHandler<HTMLButtonElement>;
		classes?: string;
		disabled?: boolean;
		children: Snippet;
	} = $props();
</script>

{#if disabled}
	<button
		disabled
		onclick={onClick}
		class="{classes} disabled disabled:pointer-events-none disabled:opacity-50"
	>
		{@render children?.()}
	</button>
{:else}
	<button onclick={onClick} class={classes}>
		{@render children?.()}
	</button>
{/if}
