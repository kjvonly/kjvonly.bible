<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		title: string;
		/** The owning view supplies its scrollable content and scrubber. */
		children: Snippet;
	} = $props();
</script>

<!-- Keep only the plan's identity fixed; metadata and readings share one scroller. -->
<div class="flex h-full min-h-0 w-full min-w-0 flex-col pt-px">
	<div class="min-w-0 shrink-0 bg-neutral-50 py-4">
		<h2 class="line-clamp-2 text-lg font-semibold text-neutral-700" title={title}>
			{title}
		</h2>
	</div>

	{@render children()}
</div>
