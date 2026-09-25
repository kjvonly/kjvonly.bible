<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		Modules,
		type NavigationState,
		useNavigationRuntimeContext
	} from '$lib/application';
	import { BufferBody, BufferHeader } from '$lib/application/ui';

	// COMPONENTS
	import ActionItemsList from '../components/actionItemsList.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SVGS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import { PLANS_VIEWS } from '../../../models/plans.model';

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
	let headerHeight: number = $state(0);

	const subsActionItems: Record<string, () => void> = {
		plans: () => {
			navigation.back();
			navigation.pushView(
				PLANS_VIEWS.PLANS_LIST,
				{}
			);
		},
		'next readings': () => {
			navigation.back();
			navigation.pushView(
				PLANS_VIEWS.NEXT_LIST,
				{}
			);
		}
	};

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
<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</BufferBody>
