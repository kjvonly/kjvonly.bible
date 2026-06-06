<script lang="ts">
	// ================================ IMPORTS ================================

	//MODELS
	import { Modules } from '$lib/models/modules.model';

	// SERVICES
	import { exporterService } from '$lib/services/importExport/exporter.service';
	import { importerService } from '$lib/services/importExport/importer.service';
	import { paneService } from '$lib/services/pane.service.svelte';

	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import BufferBody from '$lib/components/bufferBody.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// =============================== BINDINGS ================================

	let {
		showMenuPopup = $bindable<boolean>(),
		showCopyVersesPopup = $bindable<boolean>(),
		showBibleVersionPopup = $bindable<boolean>(),
		paneID
	}: {
		showMenuPopup: boolean;
		showCopyVersesPopup: boolean;
		showBibleVersionPopup: boolean;
		paneID: string;
	} = $props();

	// ================================= VARS ==================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let actions: any = {
		'copy verses': () => {
			showMenuPopup = false;
			showCopyVersesPopup = true;
		},
		'bible version': () => {
			showMenuPopup = false;
			showBibleVersionPopup = true;
		},
		search: () => {
			let p = paneService.findNode(paneService.rootPane, paneID);
			p?.updateBuffer(Modules.SEARCH);
		},
		notes: () => {
			let p = paneService.findNode(paneService.rootPane, paneID);
			p?.updateBuffer(Modules.NOTES);
		},
		'split vertical': () => {
			onSplitVertical();
		},
		'split horizontal': () => {
			onSplitHorizontal();
		},
		'export data': () => {
			exporterService.export();
		},
		'import data': () => {
			importerService.import();
		},
		close: () => {
			onClosePane();
		}
	};

	// ============================== CLICK FUNCS ==============================

	function onSplitVertical(): void {
		paneService.onSplitPane(paneID, 'v', Modules.MODULES, {});
		showMenuPopup = false;
	}

	function onSplitHorizontal() {
		paneService.onSplitPane(paneID, 'h', Modules.MODULES, {});
		showMenuPopup = false;
	}

	function onClosePane() {
		paneService.onDeletePane(paneService.rootPane, paneID);
	}

	function onClose() {
		showMenuPopup = false;
	}
</script>

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		<KJVButton onClick={onClose} classes="">
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>
	</BufferHeader>
	<BufferBody
		bind:clientHeight
		bind:headerHeight
		classes={'remove-default-class'}
	>
		{#each Object.keys(actions) as a}
			<div class="w-full">
				<button
					onclick={() => actions[a]()}
					class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
					>{a}</button
				>
			</div>
		{/each}
	</BufferBody>
</BufferContainer>
