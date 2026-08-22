<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		headerHeight = $bindable<number>(),
		classes = 'flex w-full justify-between outline outline-neutral-400 py-2 px-4 text-neutral-700',
		children
	}: {
		headerHeight: number;
		classes?: string;
		children: Snippet;
	} = $props();
</script>

<header
	bind:clientHeight={headerHeight}
	class="w-full bg-neutral-100 text-neutral-700"
>
	<div class="{classes} relative">
		{@render children?.()}
	</div>
</header>
