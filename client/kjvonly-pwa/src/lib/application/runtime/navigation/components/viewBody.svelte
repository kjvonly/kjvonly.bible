<script lang="ts">
	import type { Snippet } from 'svelte';
	import uuid4 from 'uuid4';

	let {
		ID = uuid4(),
		clientHeight,
		headerHeight,
		classes = 'px-4',
		children
	}: {
		ID?: string;
		clientHeight: number;
		headerHeight: number;
		classes?: string;
		children: Snippet;
	} = $props();
</script>

<div
	id="{ID}-scroll-container"
	style="height: {Math.max(0, clientHeight - headerHeight)}px"
	class="flex w-full min-h-0 min-w-0 flex-col overflow-y-scroll {classes}"
>
	{@render children?.()}
</div>
