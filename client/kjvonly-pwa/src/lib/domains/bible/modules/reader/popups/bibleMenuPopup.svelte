<script lang="ts">
	// ================================ IMPORTS ================================

	// MODELS / APPLICATION
	import {
		Modules,
		PaneSplit,
		useApplicationContext
	} from '$lib/application';

	import {
		ArchiveExport,
		BufferBody,
		BufferContainer,
		BufferHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// SERVICES
	const {
		archiveService,
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
	let showArchiveExport = $state(false);
	let importInput: HTMLInputElement;

	let actions: Record<string, () => void> = {
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
			showArchiveExport = true;
		},
		'import data': () => {
			importInput.click();
		},
		close: () => {
			onClosePane();
		}
	};

	// ============================== CLICK FUNCS ==============================

	function onSplitVertical(): void {
		workspaceRuntime.splitPane(
			paneID,
			PaneSplit.VERTICAL,
			Modules.MODULES,
			{}
		);
		showMenuPopup = false;
	}

	function onSplitHorizontal(): void {
		workspaceRuntime.splitPane(
			paneID,
			PaneSplit.HORIZONTAL,
			Modules.MODULES,
			{}
		);
		showMenuPopup = false;
	}

	function onClosePane(): void {
		workspaceRuntime.closePane(
			paneID
		);
	}

	function onBack(): void {
		if (showArchiveExport) {
			showArchiveExport = false;
			return;
		}

		showMenuPopup = false;
	}

	async function onImportFileChanged(
		event: Event
	): Promise<void> {
		const input =
			event.currentTarget as HTMLInputElement;

		const file =
			input.files?.[0];

		if (!file) {
			return;
		}

		toastService.showToast(
			'Starting archive import.'
		);

		try {
			const result =
				await archiveService.import(
					new Uint8Array(
						await file.arrayBuffer()
					)
				);

			const handled =
				result.resources.filter(
					(resource) =>
						resource.status ===
						'handled'
				).length;

			const current =
				result.resources.filter(
					(resource) =>
						resource.status ===
						'current'
				).length;

			const failed =
				result.resources.filter(
					(resource) =>
						resource.status ===
						'failed' ||
						resource.status ===
						'unsupported'
				).length;

			toastService.showToast(
				`Archive import finished: ${handled} installed, ${current} current, ${failed} failed.`
			);
		} catch (error) {
			console.error(
				'KJVOnly archive import failed.',
				error
			);

			toastService.showToast(
				'Archive import failed.'
			);
		} finally {
			input.value = '';
		}
	}
</script>

<!-- =============================== IMPORT ================================ -->

<input
	bind:this={importInput}
	type="file"
	accept=".kjva,application/gzip"
	onchange={onImportFileChanged}
	class="hidden"
/>


<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		<KJVButton onClick={onBack} classes="">
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>
	</BufferHeader>

	<BufferBody
		bind:clientHeight
		bind:headerHeight
		classes={'remove-default-class'}
	>
		{#if showArchiveExport}
			<ArchiveExport />
		{:else}
			{#each Object.keys(actions) as action}
				<div class="w-full">
					<button
						onclick={() => actions[action]()}
						class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
					>
						{action}
					</button>
				</div>
			{/each}
		{/if}
	</BufferBody>
</BufferContainer>
