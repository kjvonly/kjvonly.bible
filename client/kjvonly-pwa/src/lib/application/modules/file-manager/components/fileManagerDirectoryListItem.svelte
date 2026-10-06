<script lang="ts">
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';

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
	class="flex min-h-[44px] w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-start text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
>
	<span aria-hidden="true" class="shrink-0 text-neutral-500">
		<FileManagerIcon iconID="folder"></FileManagerIcon>
	</span>
	<span class="min-w-0 flex-1 truncate">{name}</span>
	<span aria-hidden="true" class="shrink-0">
		<KeyboardArrowRight classes="h-6 w-6 text-neutral-500"></KeyboardArrowRight>
	</span>
</button>
