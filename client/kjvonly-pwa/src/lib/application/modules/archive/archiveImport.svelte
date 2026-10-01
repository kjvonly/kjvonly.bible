<script lang="ts">
	// ================================ IMPORTS ================================
	import KJVBackButton from '../../ui/navigation/KJVBackButton.svelte';

	import {
		usePaneLayoutContext
	} from '../../runtime/pane/pane-layout-context';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	// COMPONENTS
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import {
		KJVAdaptiveHeaderTitle,
		KJVHeader
	} from '$lib/components';

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	// ================================= VARS ==================================

	let headerHeight: number = $state(0);
	let importing = $state(false);
	let importInput: HTMLInputElement;

	const {
		archiveService,
		toastService
	} = useApplicationContext();

	// ============================== CLICK FUNCS ==============================

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

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle="Import archive"
		shortTitle="Import"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Import archive"
		{leadingContent}
		{titleContent}
		actions={[
			{
				icon: 'import',
				label: 'Choose archive to import',
				onClick: onChooseFile,
				disabled: importing
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="flex w-full flex-col gap-3 p-4">
		<div class="text-sm text-neutral-500">
			Import a KJVOnly archive through the normal Resource validation and installation path.
		</div>

		<div class="text-sm text-neutral-500">
			Use the import button in the header to choose a .kjva file.
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>

<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
