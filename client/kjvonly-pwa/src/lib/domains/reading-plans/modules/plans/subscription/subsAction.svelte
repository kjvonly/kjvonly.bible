<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		Modules,
		type NavigationState,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { ViewBody, ViewHeader } from '$lib/application/ui';

	// COMPONENTS
	import ActionItemsList from '../components/actionItemsList.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import {
		PLAN_NAVIGATION_RESULTS,
		PLAN_SUBSCRIPTION_ACTIONS,
		PLANS_VIEWS,
		type PlanSubscriptionAction
	} from '../../../models/plans.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigationState
	} = useNavigationEntryContext();

	validateNavState(
		navigationState
	);

	// ================================== VARS =================================
	let headerHeight: number = $state(0);

	const subsActionItems: Record<string, () => void> = {
		plans: () => {
			void returnAction(
				PLAN_SUBSCRIPTION_ACTIONS.PLANS
			);
		},
		'next readings': () => {
			void returnAction(
				PLAN_SUBSCRIPTION_ACTIONS.NEXT_READINGS
			);
		}
	};

	async function returnAction(
		action: PlanSubscriptionAction
	): Promise<void> {
		await navigation.backWithResult({
			type:
				PLAN_NAVIGATION_RESULTS.SUBSCRIPTION_ACTION,
			action
		});
	}

	/**
	 * Validates the navigation contract required by the Plans actions view.
	 */
	function validateNavState(
		value: unknown
	): asserts value is NavigationState<PLANS_VIEWS.SUBS_ACTIONS> {
		if (
			!isRecord(value) ||
			value.module !== Modules.PLANS ||
			value.view !== PLANS_VIEWS.SUBS_ACTIONS ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Plans actions navigation state'
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

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div class="grid w-full grid-cols-5 place-items-center">
		<span class="flex w-full">
			<KJVButton classes="" onClick={() => navigation.back()}>
				<ArrowBack></ArrowBack>
			</KJVButton>
			<span class="flex-1"></span>
		</span>
	</div>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	<ActionItemsList actionItems={subsActionItems}></ActionItemsList>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
