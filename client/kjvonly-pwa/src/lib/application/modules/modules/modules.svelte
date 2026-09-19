<script lang="ts">
	// ================================ IMPORTS ================================

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// MODELS
	import { Modules } from '$lib/application/models/modules.model';
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

	// SERVICES
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	const { workspaceRuntime } = useApplicationContext();

	// =============================== BINDINGS ================================
	let {
		paneID,
		pane = $bindable<Pane>()
	}: {
		paneID: string;
		pane: Pane;
	} = $props();

	// ================================== VARS =================================

	let components: any = $state({
		bible: Modules.BIBLE,
		search: Modules.SEARCH,
		notes: Modules.NOTES,
		plans: Modules.PLANS,
		archive: Modules.ARCHIVE,
		settings: Modules.SETTINGS
	});

	const { authenticationService } = useApplicationContext();

	let headerHeight = $state(0);
	let clientHeight = $state(0);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		return authenticationService.subscribe((state) => {
			addDynamicModules(state.status !== 'signed-out');
		});
	});

	// ================================ FUNCS ==================================
	function addDynamicModules(isAuthenticated: boolean) {
		delete components['profile'];
		delete components['login'];

		if (isAuthenticated) {
			components['profile'] = Modules.PROFILE;
		} else {
			components['login'] = Modules.LOGIN;
		}
	}

	// ============================== CLICK FUNCS ==============================
	function onClose(): void {
		workspaceRuntime.closePane(paneID);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<span class="flex-1"></span>
	<span class="text-center"> Modules </span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onClose}>
			<Close></Close>
		</KJVButton>
	</span>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#each Object.keys(components) as c}
		<div class="w-full">
			<button
				onclick={() => workspaceRuntime.replaceBuffer(paneID, components[c])}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
				>{c}</button
			>
		</div>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
