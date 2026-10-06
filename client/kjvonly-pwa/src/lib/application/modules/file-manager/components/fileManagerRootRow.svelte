<script lang="ts">
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';

	import FileManagerIcon from './fileManagerIcon.svelte';

	import type {
		FileManagerRootDisplay
	} from '../models/file-manager-root.model';

	import {
		useFileManagerNavigationContext
	} from '../runtime/file-manager-navigation-context';

	let {
		rootDisplay
	}: {
		rootDisplay: FileManagerRootDisplay;
	} = $props();

	const navigation =
		useFileManagerNavigationContext();
</script>

<button
	type="button"
	aria-label={`Open filesystem root ${rootDisplay.name}`}
	onclick={() => navigation.openRoot(rootDisplay.root)}
	class="flex min-h-[44px] w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-start text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
>
	<span aria-hidden="true" class="shrink-0 text-neutral-500">
		<FileManagerIcon iconID="folder"></FileManagerIcon>
	</span>
	<span class="min-w-0 flex-1">
		<span class="block truncate">{rootDisplay.name}</span>
		{#if rootDisplay.path !== rootDisplay.name}
			<span class="block truncate text-sm text-neutral-500">{rootDisplay.path}</span>
		{/if}
	</span>
	<span aria-hidden="true" class="shrink-0">
		<KeyboardArrowRight classes="h-6 w-6 text-neutral-500"></KeyboardArrowRight>
	</span>
</button>
