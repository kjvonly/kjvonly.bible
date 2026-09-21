<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount, untrack } from 'svelte';

	// COMPONENTS
	import {
		attachEvents,
		BufferBody,
		BufferContainer,
		BufferHeader
	} from '$lib/application/ui';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ReadingsComponent from '../components/readings.svelte';
	// // SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import CheckCircle from '$lib/components/svgs/checkCircle.svelte';
	import Pending from '$lib/components/svgs/pending.svelte';

	// MODELS
	import { Modules } from '$lib/application';
	import type { Pane } from '$lib/application';
	import {
		PLANS_VIEWS,
		type NavReadings,
		type Readings,
		type Sub
	} from '../../../models/plans.model';

	// SERVICES
	import { useApplicationContext } from '$lib/application';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================
	let {
		plansDisplay = $bindable<PLANS_VIEWS>(),
		pane = $bindable<Pane>(),
		paneID = $bindable<string>(),
		selectedSub = $bindable<Sub>()
	}: {
		plansDisplay: PLANS_VIEWS;
		pane: Pane;
		paneID: string;
		selectedSub: Sub;
	} = $props();

	const {
		workspaceRuntime,
		toastService
	} = useApplicationContext();

	// ================================== VARS =================================

	let clientHeight: number = $state(0);
	let headerHeight = $state(0);

	let hasCompletedReading = $state(false);
	let showCompletedReadings: boolean = $state(false);
	let subListReadingsToShow: number = $state(0);
	let subListViewID = uuid4();

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		loadMoreSubReadings();
		setHasCompletedReadings();

		return attachEvents(
			`${subListViewID}-scroll-container`,
			'scroll',
			handleScroll
		);
	});

	$effect(() => {
		selectedSub;
		untrack(() => {
			loadMoreSubReadings();
			setHasCompletedReadings();
		});
	});

	// ================================ FUNCS ==================================

	function loadMoreSubReadings() {
		let toShow = 0;
		let count = 0;
		const BATCH_SIZE_TO_SHOW = 30;

		while (
			toShow !== BATCH_SIZE_TO_SHOW &&
			count + subListReadingsToShow < selectedSub.nestedReadings.length
		) {
			let hasCompletedReading = selectedSub.completedReadingIndexes.has(
				subListReadingsToShow + count
			);
			count++;
			if (hasCompletedReading && !showCompletedReadings) {
				continue;
			}
			toShow = toShow + 1;
		}

		subListReadingsToShow += count;
	}

	function handleScroll() {
		let el = document.getElementById(`${subListViewID}-scroll-container`);
		if (el === null) {
			return;
		}

		const threshold = 20; // Adjust this value as needed
		const isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;

		if (isReachBottom) {
			loadMoreSubReadings();
		}
	}

	function setHasCompletedReadings(): void {
		hasCompletedReading = selectedSub.completedReadingIndexes.size > 0;
	}

	// ============================== CLICK FUNCS ==============================

	function onSelectedSubReading(
		subNestedReadingsIndex: number,
		returnView: PLANS_VIEWS
	): void {
		const readings: Readings = selectedSub.nestedReadings[subNestedReadingsIndex];

		let np: NavReadings = {
			subID: selectedSub.id,
			subNestedReadingsIndex: subNestedReadingsIndex,
			readings: readings,
			currentNavReadingsIndex: 0,
			returnView: returnView
		};

		workspaceRuntime.replaceBuffer(
			paneID,
			Modules.BIBLE,
			{
				...pane.buffer?.bag,
				navReadings: np,
				bibleLocationRef:
					readings.bcvs[0].bibleLocationRef
			}
		);
	}

	function onCloseSubDetails(): void {
		plansDisplay = PLANS_VIEWS.SUBS_LIST;
	}

	function onToggleCompletedReadings(): void {
		showCompletedReadings = !showCompletedReadings;
		let toastMsg = '';
		if (showCompletedReadings) {
			toastMsg = 'Showing Completed Readings';
		} else {
			toastMsg = 'Hiding CompletedReadings';
		}
		toastService.showToast('Toggled Completed Readings');
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<div class="grid w-full grid-cols-3 place-items-center">
		<div class="flex w-full">
			<KJVButton classes="" onClick={onCloseSubDetails}>
				<ArrowBack></ArrowBack>
			</KJVButton>
			<span class="flex-1"></span>
		</div>
		<span class="flex text-center">My plans</span>
		<div class="flex w-full">
			<span class="flex-1"></span>
			<KJVButton
				classes=""
				disabled={!hasCompletedReading}
				onClick={onToggleCompletedReadings}
			>
				{#if showCompletedReadings}
					<Pending></Pending>
				{:else}
					<CheckCircle></CheckCircle>
				{/if}
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{@render subListView(selectedSub)}
{/snippet}

{#snippet subListView(sub: Sub)}
	<span
		class=" sticky top-0 border-t border-neutral-400 bg-neutral-50 p-2 text-2xl"
		>{sub.name}</span
	>

	{#each Array(subListReadingsToShow) as _, idx}
		{#if !sub.completedReadingIndexes.has(idx) || (sub.completedReadingIndexes.has(idx) && showCompletedReadings)}
			<button
				onclick={() => onSelectedSubReading(idx, PLANS_VIEWS.SUBS_DETAILS)}
				class="flex w-full flex-row px-2 py-4 text-base hover:cursor-pointer hover:bg-neutral-100"
			>
				<div class="flex w-full min-w-50">
					<ReadingsComponent bind:readings={sub.nestedReadings[idx].bcvs}
					></ReadingsComponent>
				</div>

				<div class="flex w-full min-w-50 flex-col">
					<div class="flex w-full">
						<span class="flex flex-grow"></span>
						<div
							class="text-lg {sub.completedReadingIndexes.has(idx)
								? 'text-support-a-500'
								: ''}"
						>
							{idx + 1} of {sub.nestedReadings.length}
						</div>
					</div>
					<div class="flex w-full justify-end">
						<div class="text-base text-nowrap">
							Verses: {sub.nestedReadings[idx].totalVerses}
						</div>
					</div>
				</div>
			</button>
		{/if}
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody ID={subListViewID} {clientHeight} {headerHeight} classes="">
		{@render body()}
	</BufferBody>
</BufferContainer>
