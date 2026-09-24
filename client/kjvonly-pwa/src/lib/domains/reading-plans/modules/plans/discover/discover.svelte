<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import DiscoverList from './discoverList.svelte';

	// MODELS
	import type { PlanDefinitionView } from '../../../models/plans.model';
	import type { NavigationComponentProps } from '$lib/application';

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
		paneID,
		clientHeight,
		navService
	}: NavigationComponentProps = $props();

	// ================================== VARS =================================
	let planList: PlanDefinitionView[] = $state([]);

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

<DiscoverList {clientHeight} {planList} {navService}></DiscoverList>
