<script lang="ts">
	import FileManagerIcon from './fileManagerIcon.svelte';

	let {
		name,
		onOpen
	}: {
		name: string;
		onOpen: () => void;
	} = $props();
</script>

<button
	type="button"
	aria-label={`Open folder ${name}`}
	onclick={onOpen}
	class="flex h-full min-h-[96px] w-full flex-col items-center p-3 text-center text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-500"
>
	<FileManagerIcon
		iconID="folder"
		classes="h-8 w-8"
	></FileManagerIcon>
	<span class="mt-2 block w-full break-words leading-snug">{name}</span>
</button>
