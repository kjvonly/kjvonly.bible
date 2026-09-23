<script lang="ts">
	import SubsView from './subscription/subsView.svelte';
	import NextReadings from './nextReadings/nextReadings.svelte';
	import Discover from './discover/discover.svelte';
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application';
	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';
	import type { Pane } from '$lib/application';
	import {
		NEXT_MAX_VIEW_ID,
		PLANS_MAX_VIEW_ID,
		PLANS_VIEWS,
		SUBS_MAX_VIEW_ID
	} from '../../models/plans.model';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		planSubscriptionsService,
		planProgressService,
		plansPubSubService
	} = useApplicationContext();

	// =============================== BINDINGS ================================
	let { paneID = $bindable<string>(), pane = $bindable<Pane>() } = $props();

	// ================================== VARS =================================

	let plansDisplay: PLANS_VIEWS = $state(PLANS_VIEWS.SUBS_LIST);
	let workerReady: boolean = $state(false);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		const booknamesSource =
			moduleResourceSelectionResolver.require(
				paneID,
				BIBLE_BOOKNAMES_RESOURCE_TYPE
			);

		const booknames =
			await bibleBooknamesService.get(
				booknamesSource
			);

		const subscriptions =
			await planSubscriptionsService.list();

		const progress =
			await planProgressService.list();

		await plansPubSubService.initialize(
			booknames.booknamesById,
			subscriptions,
			progress
		);

		let plan = pane?.buffer?.bag?.navReadings;
		if (plan) {
			plansDisplay = plan.returnView;
		} else {
			plansDisplay = subscriptions.length === 0
				? PLANS_VIEWS.PLANS_LIST
				: PLANS_VIEWS.SUBS_LIST;
		}

		workerReady = true;
	});
</script>

{#if workerReady}
	{#if plansDisplay < PLANS_MAX_VIEW_ID}
		<Discover bind:plansDisplay {paneID}></Discover>
	{:else if plansDisplay < SUBS_MAX_VIEW_ID}
		<SubsView bind:plansDisplay bind:pane bind:paneID></SubsView>
	{:else if plansDisplay < NEXT_MAX_VIEW_ID}
		<NextReadings bind:plansDisplay bind:pane bind:paneID></NextReadings>
	{/if}
{/if}
