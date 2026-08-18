<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	// // SVGS
	import Close from '$lib/components/svgs/close.svelte';
	import Menu from '$lib/components/svgs/menu.svelte';
	import type { Pane } from '$lib/models/pane.model';

	// MODELS
	import { PLANS_VIEWS, type Sub } from '$lib/models/plans.model';

	// SERVICES
	import { paneService } from '$lib/services/pane.service.svelte';

	// =============================== BINDINGS ================================
	let {
		plansDisplay = $bindable<PLANS_VIEWS>(),
		pane = $bindable<Pane>(),
		paneID = $bindable<string>(),
		selectedSub = $bindable<Sub>(),
		subsList = $bindable<Sub[]>()
	}: {
		plansDisplay: PLANS_VIEWS;
		pane: Pane;
		paneID: string;
		selectedSub: Sub;
		subsList: Sub[];
	} = $props();

	// ================================== VARS =================================
	let clientHeight: number = $state(0);
	let headerHeight = $state(0);

	// ============================== CLICK FUNCS ==============================

	function onSubClicked(sub: any) {
		selectedSub = sub;
		plansDisplay = PLANS_VIEWS.SUBS_DETAILS;
	}

	function onClosePlansList(): void {
		paneService.onDeletePane(paneService.rootPane, paneID);
	}

	function onMenuClicked(): void {
		plansDisplay = PLANS_VIEWS.SUBS_ACTIONS;
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<div class="grid w-full grid-cols-5 place-items-center">
		<snap></snap>
		<span></span>
		<span>My Plans</span>

		<KJVButton classes="" onClick={onMenuClicked}>
			<Menu></Menu>
		</KJVButton>

		<KJVButton classes="" onClick={onClosePlansList}>
			<Close></Close>
		</KJVButton>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet subsListView()}
	{#each subsList as s}
		<button
			onclick={() => onSubClicked(s)}
			class="col-2 flex w-full flex-col p-2 text-base hover:bg-neutral-100"
		>
			<div class="flex w-full">
				<span class="pb-2 text-2xl">{s.name}</span>
				<span class="flex-grow"></span>
				<span class="text-support-a-500">{s.percentCompleted}%</span>
			</div>

			<div class="text-md">
				<p class="line-clamp-3 text-left">
					{s.description}
					{#each { length: 2000 } as _}
						&nbsp;
					{/each}
				</p>
			</div>
		</button>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render subsListView()}
	</BufferBody>
</BufferContainer>
