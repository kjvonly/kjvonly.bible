<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// MODELS
	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	import {
		type Sub,
		PLANS_VIEWS,
		PLAN_PUBSUB_SUBSCRIPTIONS
	} from '../../../models/plans.model';
	import type { PlansSubscriptionsMessage } from '../../../models/plans-worker.model';

	// COMPONENTS
	import SubsList from './subsList.svelte';
	import { initializePlansRuntime } from '../runtime/initialize-plans-runtime';

	// OTHER
	import uuid4 from 'uuid4';

	const application =
		useApplicationContext();

	const {
		planSubscriptionsService,
		plansPubSubService
	} = application;

	const {
		navigation
	} = useNavigationRuntimeContext();

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

	const SUBSCRIBER_ID = uuid4();
	let mounted = true;
	let subs: Sub[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void initialize();
	});

	onDestroy(() => {
		mounted = false;
		plansPubSubService.unsubscribe(
			SUBSCRIBER_ID
		);
	});

	// ================================ FUNCS ==================================

	async function initialize(): Promise<void> {
		await initializePlansRuntime(
			navigationState,
			application
		);

		const subscriptions =
			await planSubscriptionsService.list();

		if (!mounted) {
			return;
		}

		plansPubSubService.subscribe(
			PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
			onGetAllSubs,
			SUBSCRIBER_ID
		);
		plansPubSubService.getAllSubs();

		if (
			subscriptions.length === 0 &&
			navigation.isActive(
				navigationState
			)
		) {
			navigation.pushView(
				PLANS_VIEWS.PLANS_LIST,
				{}
			);
		}
	}

	/**
	 * Subscription func for getAllSubs. Anytime a subscription is changed and
	 * published this function is called with the updated subscription data.
	 */
	function onGetAllSubs(
		data: PlansSubscriptionsMessage
	): void {
		subs.length = 0;
		data.subs
			.values()
			.toArray()
			.sort(
				(a: Sub, b: Sub) =>
					a.dateSubscribed -
					b.dateSubscribed
			)
			.forEach(
				(sub: Sub) =>
					subs.push(sub)
			);
	}

	function onSubSelected(
		sub: Sub
	): void {
		navigation.pushView(
			PLANS_VIEWS.SUBS_DETAILS,
			{
				subID: sub.id
			}
		);
	}

	/**
	 * Validates the navigation contract required by the Plans subscriptions view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is NavigationState<PLANS_VIEWS.SUBS_LIST> {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.SUBS_LIST ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Plans subscriptions navigation state'
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

<!-- ============================== CONTAINER ============================== -->

<SubsList {clientHeight} subsList={subs} {onSubSelected}></SubsList>
