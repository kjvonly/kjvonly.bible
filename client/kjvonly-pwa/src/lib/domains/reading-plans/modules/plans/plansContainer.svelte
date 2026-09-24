<script lang="ts">
	import { onMount } from 'svelte';
	import { type Writable } from 'svelte/store';

	import {
		PLANS_VIEWS,
		type NavReadings
	} from '../../models/plans.model';
	import {
		type NavigationView,
		type Pane,
		useApplicationContext
	} from '$lib/application';
	import { BufferContainer } from '$lib/application/ui';
	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

	import SubsView from './subscription/subsView.svelte';
	import NextReadings from './nextReadings/nextReadings.svelte';
	import Discover from './discover/discover.svelte';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		navigationServiceFactory,
		planSubscriptionsService,
		planProgressService,
		plansPubSubService
	} = useApplicationContext();

	// =============================== BINDINGS ================================
	let { paneID = $bindable<string>(), pane = $bindable<Pane>() } = $props();

	// ================================== VARS =================================

	let clientHeight: number = $state(0);
	let nav: Writable<NavigationView[]> | undefined = $state();
	let navService = navigationServiceFactory.create();

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

		navService.push({
			component: SubsView,
			obj: {}
		});

		const navReadings: NavReadings | undefined =
			pane?.buffer?.bag?.navReadings;

		if (navReadings?.returnView === PLANS_VIEWS.NEXT_LIST) {
			navService.push({
				component: NextReadings,
				obj: {}
			});
		} else if (!navReadings && subscriptions.length === 0) {
			navService.push({
				component: Discover,
				obj: {}
			});
		}

		nav = navService.views;
	});
</script>

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	{#if nav}
		{#each $nav as n, index}
			{@const Component = n.component}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				tabindex="0"
				role="button"
				class="{$nav && index === $nav.length - 1 ? '' : 'hidden'} h-full w-full"
				onclick={(event) => event.stopPropagation()}
			>
				<Component {paneID} {clientHeight} obj={n.obj} {navService}></Component>
			</div>
		{/each}
	{/if}
</BufferContainer>
