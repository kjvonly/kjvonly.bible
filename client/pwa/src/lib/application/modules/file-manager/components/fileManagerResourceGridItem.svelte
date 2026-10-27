<script lang="ts">
	import FileManagerIcon from './fileManagerIcon.svelte';

	import type {
		FileManagerResourceDisplay
	} from '../models/file-manager-resource-display.model';

	let {
		display,
		onOpen
	}: {
		display: FileManagerResourceDisplay;
		onOpen: () => void;
	} = $props();
</script>

<button
	type="button"
	aria-label={`Open ${display.name}`}
	onclick={onOpen}
	class="flex h-full min-h-[96px] w-full flex-col items-center p-3 text-center text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500"
>
	<FileManagerIcon
		iconID={display.iconID}
		classes="h-8 w-8"
	></FileManagerIcon>
	<span class="mt-2 block w-full break-words leading-snug">{display.name}</span>
</button>
