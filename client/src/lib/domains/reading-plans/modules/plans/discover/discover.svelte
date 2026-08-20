<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// COMPONENTS
	import DiscoverList from './discoverList.svelte';
	import DiscoverDetails from './discoverDetails.svelte';

	// MODELS
	import {
		cachedPlanToPlan,
		NullPlan,
		PLAN_PUBSUB_SUBSCRIPTIONS,
		PLANS_VIEWS,
		type Plan
	} from '$lib/models/plans.model';

	// SERVICES
	import { encodedReadingsDecoderService } from '$lib/domains/reading-plans/services/encodedReadingsDecoder.service';
	import { plansPubSubService } from '$lib/domains/reading-plans/services/plansPubSub.service';

	// API
	import { plansApi } from '$lib/nostr/events/plans.nostr';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================
	let {
		plansDisplay = $bindable(),
		clientHeight = $bindable(),
		paneID = $bindable(),
		pane = $bindable()
	} = $props();

	// ================================== VARS =================================
	let SUBSCRIBER_ID: string = uuid4();
	let plansMap: Map<string, Plan> = $state(new Map());
	let planList: Plan[] = $state([]);
	let selectedPlan: Plan = $state(NullPlan());

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		plansPubSubService.subscribe(
			PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_PLANS,
			onGetAllPlans,
			SUBSCRIBER_ID
		);
		plansPubSubService.getAllPlans();
	});

	onDestroy(() => {
		plansPubSubService.unsubscribe(SUBSCRIBER_ID);
	});

	// ============================== CLICK FUNCS ==============================

	async function onGetAllPlans(data: any) {
		if (data) {
			plansMap = data.plans;
			let cachedPlan = await plansApi.getPlansFromPeopleYouFollow();
			for (let c of cachedPlan) {
				let p = cachedPlanToPlan(c);
				p.nestedReadings = encodedReadingsDecoderService.parseEncodedReadings(
					c.encodedReadings
				);

				plansMap.set(p.id, p);
			}
			planList = plansMap
				.values()
				.toArray()
				.sort((a: Plan, b: Plan) => a.dateCreated - b.dateCreated);
		}
	}
</script>

{#if plansDisplay === PLANS_VIEWS.PLANS_LIST}
	<DiscoverList bind:selectedPlan bind:planList bind:plansDisplay {paneID}
	></DiscoverList>
{:else if plansDisplay === PLANS_VIEWS.PLANS_ACTIONS}{:else if plansDisplay === PLANS_VIEWS.PLANS_DETAILS}
	<DiscoverDetails bind:plansDisplay bind:selectedPlan></DiscoverDetails>
{/if}
