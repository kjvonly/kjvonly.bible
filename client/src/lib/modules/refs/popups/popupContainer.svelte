<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		clientHeight = $bindable<number>(),
		children
	}: {
		clientHeight: number;
		children: Snippet;
	} = $props();
</script>

<div
	style="height: {clientHeight}px"
	class="absolute z-[10000] h-full w-full max-w-lg"
>
	{@render children?.()}
</div>
