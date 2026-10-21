<script lang="ts">
	import type {
		FileManagerIconID
	} from '../models/file-manager-icon.model';

	import {
		resolveFileManagerIconComponent
	} from '../resolvers/file-manager-icon-component-resolver';

	let {
		iconID,
		classes = 'h-6 w-6'
	}: {
		iconID: FileManagerIconID;
		classes?: string;
	} = $props();

	const IconComponent = $derived(
		resolveFileManagerIconComponent(iconID)
	);
</script>

<span aria-hidden="true" class="inline-flex shrink-0 items-center justify-center text-neutral-500">
	<IconComponent classes={`${classes} fill-current`}></IconComponent>
</span>
