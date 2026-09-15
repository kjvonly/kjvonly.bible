<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SERVICES
	import { paneService } from '$lib/application/services/pane.service.svelte';
	import Edit from '$lib/components/svgs/edit.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID,
		navService = $bindable(),
		clientHeight = $bindable<number>()
	} = $props();

	// ============================== CLICK FUNCS ==============================

	function onClose(e: Event): void {
		e.stopPropagation();
		paneService.onDeletePane(paneService.rootPane, paneID);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div class="grid w-full grid-cols-3 place-items-center">
		<div class="flex justify-center justify-self-start pe-4">
			<KJVButton onClick={onClose} classes="">
				<Edit classes=""></Edit>
			</KJVButton>
		</div>

		<span class="text-center">Profile</span>
		<div class="flex justify-center justify-self-end pe-4">
			<KJVButton onClick={onClose} classes="">
				<Close classes=""></Close>
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
