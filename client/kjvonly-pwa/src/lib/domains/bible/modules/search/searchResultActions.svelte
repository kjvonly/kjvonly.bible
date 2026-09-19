<script lang="ts">
	import { useApplicationContext } from '$lib/application';
	// ================================ IMPORTS ================================
	// COMPONENTS
	import { Modules } from '$lib/application';

	// SERVICES
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';
	import { PaneSplit } from '$lib/application';
	const {
		workspaceRuntime,
		toastService
	} = useApplicationContext();

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

<div class="flex flex-row justify-end space-x-4 p-4 hover:cursor-default">
	<KJVButton classes="" onClick={() => onCopyToClipboard()}>
		<Copy classes=""></Copy>
	</KJVButton>

	<KJVButton
		classes=""
		onClick={(e: Event) => onSplitScreenHorizontal(e, searchResult.key)}
	>
		<SplitScreenBottom></SplitScreenBottom>
	</KJVButton>
	<KJVButton
		classes=""
		onClick={(e: Event) => onSplitScreenVertical(e, searchResult.key)}
	>
		<SplitScreenRight></SplitScreenRight>
	</KJVButton>
</div>
