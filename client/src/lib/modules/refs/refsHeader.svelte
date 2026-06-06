<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import PopupContainer from './popups/popupContainer.svelte';
	import SearchPopup from './popups/searchPopup/searchPopup.svelte';

	// SERVICES
	import { paneService } from '$lib/services/pane.service.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID,
		clientHeight = $bindable<number>(),
		popups = $bindable()
	} = $props();

	// ============================== CLICK FUNCS ==============================

	function onClose(e: Event): void {
		e.stopPropagation();
		paneService.onDeletePane(paneService.rootPane, paneID);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div
		class="flex w-full max-w-lg flex-row bg-neutral-100 py-2 leading-tight outline outline-neutral-400"
	>
		<span class="flex-1"></span>
		<span class="text-center">Strongs / Refs</span>
		<div class="flex flex-1 justify-end pe-4">
			<KJVButton onClick={onClose} classes="">
				<Close classes=""></Close>
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ================================ POPUPS =============================== -->

{#snippet searchPopup()}
	{#if popups.searchPopup}
		<PopupContainer bind:clientHeight>
			<SearchPopup bind:popups></SearchPopup>
		</PopupContainer>
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
{@render searchPopup()}
