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
	// COMPONENTS
	import {
		KJVMenuView,
		type KJVMenuAction
	} from '$lib/components';

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

	const actions: readonly KJVMenuAction<PlanSubscriptionAction>[] = [
		{
			label: 'Plans',
			value: PLAN_SUBSCRIPTION_ACTIONS.PLANS
		},
		{
			label: 'Next readings',
			value: PLAN_SUBSCRIPTION_ACTIONS.NEXT_READINGS
		}
	];

	async function onAction(
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

<!-- ============================== CONTAINER ============================== -->

<KJVMenuView
	title="More actions"
	{clientHeight}
	{actions}
	onBack={() => navigation.back()}
	{onAction}
></KJVMenuView>
