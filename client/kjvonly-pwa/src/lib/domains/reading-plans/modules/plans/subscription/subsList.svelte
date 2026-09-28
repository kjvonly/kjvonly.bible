<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { ViewBody, ViewHeader } from '$lib/application/ui';

	// COMPONENTS
	import { KJVHeader } from '$lib/components';

	// MODELS
	import {
		PLANS_VIEWS,
		type Sub
	} from '../../../models/plans.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();

	// =============================== BINDINGS ================================
	let {
		subsList,
		onSubSelected
	}: {
		subsList: Sub[];
		onSubSelected: (sub: Sub) => void;
	} = $props();

	// ================================== VARS =================================
	let headerHeight = $state(0);

	// ============================== CLICK FUNCS ==============================

	function onSubClicked(sub: Sub): void {
		onSubSelected(sub);
	}

	function onBack(): void {
		navigation.back();
	}

	function onDiscoverPlansClicked(): void {
		navigation.pushView(
			PLANS_VIEWS.PLANS_LIST,
			{}
		);
	}

	function onNextReadingsClicked(): void {
		navigation.pushView(
			PLANS_VIEWS.NEXT_LIST,
			{}
		);
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
	<KJVHeader
		title="My Plans"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: onBack
		}}
		actions={[
			{
				icon: 'document-search',
				label: 'Discover plans',
				onClick: onDiscoverPlansClicked
			},
			{
				icon: 'book-ribbon',
				label: 'Next readings',
				onClick: onNextReadingsClicked
			},
			{
				icon: 'more-vertical',
				label: 'More actions',
				onClick: onMenuClicked
			}
		]}
	></KJVHeader>
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

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody clientHeight={paneLayout.clientHeight} {headerHeight} classes="">
	{@render subsListView()}
</ViewBody>
