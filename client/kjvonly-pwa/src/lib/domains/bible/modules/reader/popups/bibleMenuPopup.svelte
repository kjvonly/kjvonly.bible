<script lang="ts">
	import { useApplicationContext } from '$lib/application';
	// ================================ IMPORTS ================================

	//MODELS
	import { Modules } from '$lib/application';

	// SERVICES
	import { exporterService } from '$lib/application/services/importExport/exporter.service';
	import { importerService } from '$lib/application/services/importExport/importer.service';
	import { PaneSplit } from '$lib/application';

	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import { BufferContainer } from '$lib/application/ui';
	import { BufferHeader } from '$lib/application/ui';
	import { BufferBody } from '$lib/application/ui';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	const {
		workspaceRuntime,
		toastService
	} = useApplicationContext();

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
			workspaceRuntime.replaceBuffer(
				paneID,
				Modules.SEARCH
			);
		},
		notes: () => {
			workspaceRuntime.replaceBuffer(
				paneID,
				Modules.NOTES
			);
		},
		'split vertical': () => {
			onSplitVertical();
		},
		'split horizontal': () => {
			onSplitHorizontal();
		},
		'export data': () => {
			exporterService.export(
				toastService
			);
		},
		'import data': () => {
			importerService.import(
				toastService
			);
		},
		close: () => {
			onClosePane();
		}
	};

	// ============================== CLICK FUNCS ==============================

	function onSplitVertical(): void {
		workspaceRuntime.splitPane(paneID, PaneSplit.VERTICAL, Modules.MODULES, {});
		showMenuPopup = false;
	}

	function onSplitHorizontal() {
		workspaceRuntime.splitPane(paneID, PaneSplit.HORIZONTAL, Modules.MODULES, {});
		showMenuPopup = false;
	}

	function onClosePane() {
		workspaceRuntime.closePane(paneID);
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
