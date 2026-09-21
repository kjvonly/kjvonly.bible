<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import DiscoverList from './discoverList.svelte';
	import DiscoverDetails from './discoverDetails.svelte';

	// MODELS
	import {
		NullPlanDefinitionView,
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';

	// APPLICATION
	import { useApplicationContext } from '$lib/application';
	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

	const {
		bibleBooknamesService,
		encodedReadingsDecoderService,
		moduleResourceSelectionResolver,
		planDefinitionsService
	} = useApplicationContext();

	// =============================== BINDINGS ================================
	let {
		plansDisplay = $bindable(),
		paneID
	}: {
		plansDisplay: PLANS_VIEWS;
		paneID: string;
	} = $props();

	// ================================== VARS =================================
	let planList: PlanDefinitionView[] = $state([]);
	let selectedPlan: PlanDefinitionView = $state(NullPlanDefinitionView());

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

		const bookNameLookup =
			(bookID: string): string =>
				booknames.booknamesById[bookID] ?? '';

		const definitions =
			await planDefinitionsService.list();

		planList = definitions.map(
			(definition): PlanDefinitionView => ({
				...definition,
				nestedReadings:
					encodedReadingsDecoderService.parseEncodedReadings(
						[...definition.encodedReadings],
						bookNameLookup
					)
			})
		);
	});
</script>

{#if plansDisplay === PLANS_VIEWS.PLANS_LIST}
	<DiscoverList bind:selectedPlan bind:planList bind:plansDisplay {paneID}
	></DiscoverList>
{:else if plansDisplay === PLANS_VIEWS.PLANS_DETAILS}
	<DiscoverDetails bind:plansDisplay bind:selectedPlan {paneID}></DiscoverDetails>
{/if}
