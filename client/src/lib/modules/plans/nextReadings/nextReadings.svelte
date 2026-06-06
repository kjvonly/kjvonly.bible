<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// COMPONENTS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ReadingsComponent from '../components/readings.svelte';

	// MODELS
	import { Modules } from '$lib/models/modules.model';
	import type { Pane } from '$lib/models/pane.model';
	import {
		PLANS_VIEWS,
		PLAN_PUBSUB_SUBSCRIPTIONS,
		type Sub,
		type NextReadings,
		type Readings,
		type NavReadings
	} from '../../../models/plans.model';

	// SERVICES
	import { completedReadingsService } from '$lib/services/plans/completedReadings.service';
	import { plansPubSubService } from '$lib/services/plans/plansPubSub.service';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================

	let {
		pane = $bindable<Pane>(),
		plansDisplay = $bindable<PLANS_VIEWS>()
	}: {
		pane: Pane;
		plansDisplay: PLANS_VIEWS;
	} = $props();

	// ================================== VARS =================================

	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);

	let SUBSCRIBER_ID: string = uuid4();

	let subsByID: Map<string, Sub> = new Map<string, Sub>();
	let nextReadings: NextReadings[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		plansPubSubService.subscribe(
			PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
			onGetAllSubs,
			SUBSCRIBER_ID
		);
		plansPubSubService.getAllSubs();
	});

	onDestroy(() => {
		plansPubSubService.unsubscribe(SUBSCRIBER_ID);
	});

	// ================================ FUNCS ==================================

	/**
	 * Subscription func for getAllSubs. Anytime a sum is changed and published
	 * this function will be called with the updated Subs data
	 *
	 * @param data
	 */
	async function onGetAllSubs(data: any) {
		if (data) {
			subsByID = data.subs;

			await processNavReadings();
			await updateNextReadings();
		}
	}

	/**
	 * Necessary steps after a user completes a {@link Readings}.
	 */
	async function processNavReadings() {
		let nr: NavReadings = pane.buffer.bag?.navReadings;
		if (nr) {
			let cr = completedReadingsService.navReadingsToCompletedReadings(nr);
			await completedReadingsService.save(cr);
			completedReadingsService.updateSubMetadata(subsByID, nr, cr);
			completedReadingsService.cleanup(pane);
			completedReadingsService.notifyWorker(cr);
		}
	}

	function updateNextReadings() {
		let nrs: NextReadings[] = subsByID
			.entries()
			.filter(([_, s]) => filterSubsForNextReadings(s))
			.map(([_, s]) => subToNextReadings(s))
			.toArray();

		nextReadings.length = 0;
		nextReadings.push(...nrs);
	}

	/**
	 * skip completed subscriptions.
	 *
	 * @param s
	 */
	function filterSubsForNextReadings(s: Sub): Boolean {
		return s.nestedReadings.length - 1 > s.nextReadingsIndex;
	}

	function subToNextReadings(s: Sub): NextReadings {
		return {
			readings: s.nestedReadings[s.nextReadingsIndex],
			dateSubscribed: s.dateSubscribed ? s.dateSubscribed : Date.now(),
			name: s.name,
			percentCompleted: s.percentCompleted,
			subReadingsIndex: s.nextReadingsIndex,
			totalReadings: s.nestedReadings.length,
			subID: s.id
		};
	}

	// ============================== CLICK FUNCS ==============================

	function onCloseNextReadings() {
		plansDisplay = PLANS_VIEWS.SUBS_LIST;
	}

	function onSelectedNextReading(idx: number, returnView: PLANS_VIEWS) {
		let nrs: NextReadings = nextReadings[idx];
		let readings: Readings = nrs.readings;
		readings.bcvs = readings.bcvs.map((r: any) => {
			r.bibleLocationRef = `${r.bookID}_${r.chapter}_${r.verses}`;
			return r;
		});

		let nr: NavReadings = {
			subID: nrs.subID,
			subNestedReadingsIndex: nrs.subReadingsIndex,
			readings: readings,
			currentNavReadingsIndex: 0,
			returnView: returnView
		};

		pane.buffer.bag.navReadings = nr;

		pane.buffer.bag.bibleLocationRef = readings.bcvs[0].bibleLocationRef;
		pane.updateBuffer(Modules.BIBLE);
	}
</script>

{#snippet nextReading(n: any, idx: any)}
	<button
		onclick={() => onSelectedNextReading(idx, PLANS_VIEWS.NEXT_LIST)}
		class=" flex w-full flex-col px-2 py-4 text-base hover:bg-neutral-100"
	>
		<div class="flex">
			<span class="pb-2 text-2xl">{n.name}</span>
			<span class="flex-grow"></span>
			<span class="text-support-a-500">{n.percentCompleted}%</span>
		</div>
		<div class="flex flex-row">
			<div class="min-w-50">
				<ReadingsComponent bind:readings={n.readings.bcvs}></ReadingsComponent>
			</div>

			<div class="flex w-full min-w-50 flex-col">
				<div class="flex w-full">
					<span class="flex flex-grow"></span>
					<div class="text-lg">
						{n.subReadingsIndex + 1} of {n.totalReadings}
					</div>
				</div>
				<div class="flex w-full justify-end">
					<div class="text-base text-nowrap">
						Verses: {n.readings.totalVerses}
					</div>
				</div>
			</div>
		</div>
	</button>
{/snippet}

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<span class="flex-1">
		<KJVButton classes="" onClick={onCloseNextReadings}>
			<ArrowBack></ArrowBack>
		</KJVButton>
	</span>
	<span class="text-center">Next Readings</span>

	<span class="flex-1"></span>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{#if nextReadings.length > 0}
		{#each nextReadings as n, idx}
			{@render nextReading(n, idx)}
		{/each}
	{/if}
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
