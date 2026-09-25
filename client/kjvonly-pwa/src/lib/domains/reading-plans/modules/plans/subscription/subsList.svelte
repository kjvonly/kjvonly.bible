<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import { useNavigationRuntimeContext } from '$lib/application';
	import { BufferBody, BufferHeader } from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SVGS
	import Close from '$lib/components/svgs/close.svelte';
	import Menu from '$lib/components/svgs/menu.svelte';

	// MODELS
	import {
		PLANS_VIEWS,
		type Sub
	} from '../../../models/plans.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================
	let {
		clientHeight,
		subsList,
		onSubSelected
	}: {
		clientHeight: number;
		subsList: Sub[];
		onSubSelected: (sub: Sub) => void;
	} = $props();

	// ================================== VARS =================================
	let headerHeight = $state(0);

	// ============================== CLICK FUNCS ==============================

	function onSubClicked(sub: Sub): void {
		onSubSelected(sub);
	}

	function onClosePlansList(): void {
		navigation.clear();
	}

	function onMenuClicked(): void {
		navigation.pushView(
			PLANS_VIEWS.SUBS_ACTIONS,
			{}
		);
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

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight} classes="">
	{@render subsListView()}
</BufferBody>
