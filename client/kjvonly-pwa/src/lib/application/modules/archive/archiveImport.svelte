<script lang="ts">
	// ================================ IMPORTS ================================

	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import Close from '$lib/components/svgs/close.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	} = $props();

	// ================================= VARS ==================================

	let headerHeight: number = $state(0);
	let importing = $state(false);
	let importInput: HTMLInputElement;

	const {
		archiveService,
		toastService,
		workspaceRuntime
	} = useApplicationContext();

	// ============================== CLICK FUNCS ==============================

	function onBack(): void {
		navService.pop();
	}

	function onClose(
		event: Event
	): void {
		event.stopPropagation();
		workspaceRuntime.closePane(
			paneID
		);
	}

	function onChooseFile(): void {
		if (importing) {
			return;
		}

		importInput.click();
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

		importing = true;
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
			importing = false;
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

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex flex-1 justify-start">
		<KJVButton classes="" onClick={onBack}>
			<ArrowBack classes=""></ArrowBack>
		</KJVButton>
	</span>

	<span class="text-center">Import</span>

	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onClose}>
			<Close classes=""></Close>
		</KJVButton>
	</span>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="flex w-full flex-col gap-3 p-4">
		<div class="text-sm text-neutral-500">
			Import a KJVOnly archive through the normal Resource validation and installation path.
		</div>

		<button
			type="button"
			disabled={importing}
			onclick={onChooseFile}
			class="w-full bg-neutral-100 p-3 text-center font-medium hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{importing ? 'Importing…' : 'Choose .kjva'}
		</button>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>

<BufferBody bind:clientHeight bind:headerHeight classes="">
	{@render body()}
</BufferBody>
