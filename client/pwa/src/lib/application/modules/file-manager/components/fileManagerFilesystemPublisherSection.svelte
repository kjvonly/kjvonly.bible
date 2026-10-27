<script lang="ts">
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';

	import FileManagerIcon from './fileManagerIcon.svelte';

	import type {
		FileManagerRootDisplay
	} from '../models/file-manager-root.model';

	import FileManagerRootRow from './fileManagerRootRow.svelte';

	let {
		filesystemPublisherName,
		roots
	}: {
		filesystemPublisherName: string;
		roots: readonly FileManagerRootDisplay[];
	} = $props();
</script>

<details class="group w-full" open>
	<summary
		class="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
	>
		<span aria-hidden="true" class="shrink-0">
			<KeyboardArrowDown
				classes="h-5 w-5 transition-transform group-open:rotate-0 -rotate-90"
			></KeyboardArrowDown>
		</span>
		<span aria-hidden="true" class="shrink-0">
			<FileManagerIcon iconID="publisher" classes="h-5 w-5"></FileManagerIcon>
		</span>
		<span class="min-w-0 flex-1 truncate">{filesystemPublisherName}</span>
	</summary>

	<div class="flex w-full flex-col">
		{#each roots as rootDisplay (`${rootDisplay.root.publisher}:${rootDisplay.root.rootPath}`)}
			<FileManagerRootRow {rootDisplay}></FileManagerRootRow>
		{/each}
	</div>
</details>
