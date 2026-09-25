<script lang="ts">
	import { useApplicationContext } from '$lib/application';
	// ================================ IMPORTS ================================
	// COMPONENTS
	import { Modules } from '$lib/application';

	// SERVICES
	import KJVIconButton from '$lib/components/buttons/KJVIconButton.svelte';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';
	import { PaneSplit } from '$lib/application';
	const { workspaceRuntime, toastService } = useApplicationContext();

	// =============================== BINDINGS ================================

	let { paneID, searchResult } = $props();

	// ============================== CLICK FUNCS ==============================

	function onCopyToClipboard() {
		let content = `${searchResult.bookName} ${searchResult.number}:${searchResult.verseNumber}\n${searchResult.text}`;
		navigator.clipboard.writeText(content);
		toastService.showToast(
			`Copied ${searchResult.bookName} ${searchResult.number}:${searchResult.verseNumber}`
		);
	}
	function onSplitScreenHorizontal(e: Event, bibleLocationRef: string): void {
		e.stopPropagation();

		workspaceRuntime.splitPane(paneID, PaneSplit.HORIZONTAL, Modules.BIBLE, {
			bibleLocationRef: bibleLocationRef
		});
	}

	function onSplitScreenVertical(e: Event, bibleLocationRef: string): void {
		e.stopPropagation();
		workspaceRuntime.splitPane(paneID, PaneSplit.VERTICAL, Modules.BIBLE, {
			bibleLocationRef: bibleLocationRef
		});
	}
</script>

<div class="flex justify-end gap-2 pt-2 hover:cursor-default">
	<KJVIconButton
		label="Copy verse"
		variant="quiet"
		onClick={() => onCopyToClipboard()}
	>
		<Copy classes=""></Copy>
	</KJVIconButton>

	<KJVIconButton
		label="Split pane horizontally"
		variant="quiet"
		onClick={(e: Event) => onSplitScreenHorizontal(e, searchResult.key)}
	>
		<SplitScreenBottom></SplitScreenBottom>
	</KJVIconButton>
	<KJVIconButton
		label="Split pane vertically"
		variant="quiet"
		onClick={(e: Event) => onSplitScreenVertical(e, searchResult.key)}
	>
		<SplitScreenRight></SplitScreenRight>
	</KJVIconButton>
</div>
