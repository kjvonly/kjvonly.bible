<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Copy from '$lib/components/buttons/copy.svelte';
	import HorizontalSplit from '$lib/components/buttons/horizontalSplit.svelte';
	import { Modules } from '$lib/models/modules.model';
	import VerticalSplit from '$lib/components/buttons/verticalSplit.svelte';

	// SERVICES
	import { toastService } from '$lib/services/toast.service';

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
</script>

<div class="flex flex-row justify-end space-x-4">
	<Copy onCopy={onCopyToClipboard}></Copy>

	<HorizontalSplit
		bind:paneID
		module={Modules.BIBLE}
		data={{ bibleLocationRef: searchResult.key }}
	></HorizontalSplit>

	<VerticalSplit
		bind:paneID
		module={Modules.BIBLE}
		data={{ bibleLocationRef: searchResult.key }}
	></VerticalSplit>
</div>
