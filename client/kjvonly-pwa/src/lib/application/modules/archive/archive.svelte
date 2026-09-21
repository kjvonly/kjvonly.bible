<script lang="ts">
	// ================================ IMPORTS ================================

	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import type {
		NavigationComponentProps,
		NavigationView
	} from '$lib/application/services/navigation.service';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import ArchiveImport from './archiveImport.svelte';
	import ArchiveExport from './archiveExport.svelte';

	// =============================== BINDINGS ================================

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	}: NavigationComponentProps = $props();

	// ================================= VARS ==================================

	let headerHeight: number = $state(0);

	const {
		workspaceRuntime
	} = useApplicationContext();

	const actions = {
		import: ArchiveImport,
		export: ArchiveExport
	};

	// ============================== CLICK FUNCS ==============================

	function onClose(
		event: Event
	): void {
		event.stopPropagation();
		workspaceRuntime.closePane(
			paneID
		);
	}

	function onSelect(
		component:
			NavigationView['component']
	): void {
		navService.push({
			component,
			obj: {}
		});
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex-1"></span>
	<span class="text-center">Archive</span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onClose}>
			<Close classes=""></Close>
		</KJVButton>
	</span>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#each Object.entries(actions) as [label, component]}
		<div class="w-full">
			<button
				type="button"
				onclick={() => onSelect(component)}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>
				{label}
			</button>
		</div>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>

<BufferBody bind:clientHeight bind:headerHeight classes="">
	{@render body()}
</BufferBody>
