<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// APPLICATION
	import {
		Modules,
		type NavigationState,
		useApplicationContext
	} from '$lib/application';
	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

	// COMPONENTS
	import DiscoverList from './discoverList.svelte';

	// MODELS
	import {
		PLANS_VIEWS,
		type PlanDefinitionView
	} from '../../../models/plans.model';

	const {
		bibleBooknamesService,
		encodedReadingsDecoderService,
		moduleResourceSelectionResolver,
		planDefinitionsService
	} = useApplicationContext();

	// =============================== BINDINGS ================================
	let {
		clientHeight,
		obj = $bindable()
	}: {
		clientHeight: number;
		obj: Record<string, unknown>;
	} = $props();

	const navigationState =
		obj.navigationState;

	validateNavState(
		navigationState
	);

	// ================================== VARS =================================
	let planList: PlanDefinitionView[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		const booknamesSource =
			moduleResourceSelectionResolver
				.requireWithNavigationState(
					navigationState,
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

	/**
	 * Validates the navigation contract required by the Plans discovery view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is NavigationState<PLANS_VIEWS.PLANS_LIST> {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.PLANS_LIST ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Plans discovery navigation state'
			);
		}
	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		);
	}
</script>

<DiscoverList {clientHeight} {planList}></DiscoverList>
