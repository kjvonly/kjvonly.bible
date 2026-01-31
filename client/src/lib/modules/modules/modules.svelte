<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// MODELS
	import { Modules } from '$lib/models/modules.model';
	import type { Pane } from '$lib/models/pane.model';

	// SERVICES
	import { paneService } from '$lib/services/pane.service.svelte';
	import { onMount } from 'svelte';
	import { loginService } from '$lib/nostr/services/login.service';

	// =============================== BINDINGS ================================
	let {
		paneID,
		pane = $bindable<Pane>()
	}: {
		paneID: string;
		pane: Pane;
	} = $props();

	// ================================== VARS =================================

	let components: any = {
		bible: Modules.BIBLE,
		search: Modules.SEARCH,
		notes: Modules.NOTES,
		plans: Modules.PLANS,
		settings: Modules.SETTINGS
	};

	let headerHeight = $state(0);
	let clientHeight = $state(0);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		addDynamicModules();
	});

	// ================================ FUNCS ==================================
	function addDynamicModules() {
		if (loginService.getLogin()) {
			components['profile'] = Modules.PROFILE;
		} else {
			components['login'] = Modules.LOGIN;
		}
	}

	// ============================== CLICK FUNCS ==============================
	function onClose(): void {
		paneService.onDeletePane(paneService.rootPane, paneID);
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
				onclick={(event) => pane.updateBuffer(components[c])}
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
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
