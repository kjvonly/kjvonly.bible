<script lang="ts">
	import SubsView from './subscription/subsView.svelte';
	import NextReadings from './nextReadings/nextReadings.svelte';
	import Discover from './discover/discover.svelte';
	import { onMount } from 'svelte';
	import type { Pane } from '$lib/models/pane.model';
	import {
		NEXT_MAX_VIEW_ID,
		PLANS_MAX_VIEW_ID,
		PLANS_VIEWS,
		SUBS_MAX_VIEW_ID
	} from '$lib/models/plans.model';

	// =============================== BINDINGS ================================
	let { paneID = $bindable<string>(), pane = $bindable<Pane>() } = $props();

	// ================================== VARS =================================

	let plansDisplay: PLANS_VIEWS = $state(PLANS_VIEWS.SUBS_LIST);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		let plan = pane?.buffer?.bag?.navReadings;
		if (plan) {
			plansDisplay = plan.returnView;
		} else {
			plansDisplay = PLANS_VIEWS.SUBS_LIST;
		}
	});
</script>

{#if plansDisplay < PLANS_MAX_VIEW_ID}
	<Discover bind:plansDisplay bind:pane bind:paneID></Discover>
{:else if plansDisplay < SUBS_MAX_VIEW_ID}
	<SubsView bind:plansDisplay bind:pane bind:paneID></SubsView>
{:else if plansDisplay < NEXT_MAX_VIEW_ID}
	<NextReadings bind:plansDisplay bind:pane></NextReadings>
{/if}
