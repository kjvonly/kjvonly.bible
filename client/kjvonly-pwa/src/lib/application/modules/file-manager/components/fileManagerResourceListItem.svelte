<script lang="ts">
	import FileManagerIcon from './fileManagerIcon.svelte';

	import type {
		FileManagerResourceDisplay
	} from '../models/file-manager-resource-display.model';

	let {
		display,
		context = [],
		onOpen
	}: {
		display: FileManagerResourceDisplay;
		context?: readonly string[];
		onOpen: () => void;
	} = $props();
</script>

<button
	type="button"
	onclick={onOpen}
	class="flex min-h-[44px] w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-start text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
>
	<FileManagerIcon iconID={display.iconID}></FileManagerIcon>
	<span class="min-w-0 flex-1">
		<span class="block truncate">{display.name}</span>
		<span class="block truncate text-sm text-neutral-500">
			{display.metadataLabel}
		</span>
		{#each context as value}
			<span class="block truncate text-xs text-neutral-500">
				{value}
			</span>
		{/each}
	</span>
</button>
