<script lang="ts">
	// ================================ IMPORTS ================================

	import { usePaneLayoutContext } from '../../runtime/pane/pane-layout-context';
	// COMPONENTS
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import { KJVHeader } from '$lib/components';

	// MODELS
	import { Modules } from '$lib/application/models/modules.model';
	import { PaneSplit } from '../../runtime/pane/models/pane-split';
	import { MODULES_VIEWS } from './modules-navigation.model';

	// SERVICES
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import { useNavigationRuntimeContext } from '$lib/application/runtime/navigation/navigation-runtime-context';
	const {
		authenticationService,
		moduleLaunchDestinationResolver,
		workspaceRuntime
	} = useApplicationContext();
	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================
	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	// ================================== VARS =================================

	let components: Record<string, Modules> = $state({
		bible: Modules.BIBLE,
		search: Modules.SEARCH,
		notes: Modules.NOTES,
		plans: Modules.PLANS,
		archive: Modules.ARCHIVE,
		settings: Modules.SETTINGS
	});

	let headerHeight = $state(0);
	let canClosePane = $state(false);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		const unsubscribeAuthentication =
			authenticationService.subscribe((state) => {
				addDynamicModules(state.status !== 'signed-out');
			});

		updateCanClosePane();
		const unsubscribeWorkspace =
			workspaceRuntime.subscribe(
				updateCanClosePane
			);

		return () => {
			unsubscribeAuthentication();
			unsubscribeWorkspace();
		};
	});

	// ================================ FUNCS ==================================
	function updateCanClosePane(): void {
		canClosePane =
			workspaceRuntime
				.deriveLayout()
				.activePaneIDs
				.length > 1;
	}

	function addDynamicModules(isAuthenticated: boolean) {
		delete components['profile'];
		delete components['login'];

		if (isAuthenticated) {
			components['profile'] = Modules.PROFILE;
		} else {
			components['login'] = Modules.LOGIN;
		}
	}

	// ============================== CLICK FUNCS ==============================
	function onClose(): void {
		navigation.closePane();
	}

	function onSplitHorizontal(): void {
		navigation.split(
			PaneSplit.HORIZONTAL,
			Modules.MODULES,
			MODULES_VIEWS.ROOT,
			{}
		);
	}

	function onSplitVertical(): void {
		navigation.split(
			PaneSplit.VERTICAL,
			Modules.MODULES,
			MODULES_VIEWS.ROOT,
			{}
		);
	}

	function onModuleSelected(
		module: Modules
	): void {
		const destination =
			moduleLaunchDestinationResolver
				.resolve(
					module
				);

		navigation.pushModule(
			module,
			destination.view,
			destination.state
		);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<KJVHeader
		title="Modules"
		leadingAction={canClosePane
			? {
				icon: 'close',
				label: 'Close pane',
				onClick: onClose
			}
			: undefined}
		reserveLeadingActionSpace={!canClosePane}
		actions={[
			{
				icon: 'split-horizontal',
				label: 'Split pane horizontally',
				onClick: onSplitHorizontal
			},
			{
				icon: 'split-vertical',
				label: 'Split pane vertically',
				onClick: onSplitVertical
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#each Object.keys(components) as c}
		<div class="w-full">
			<button
				onclick={() => onModuleSelected(components[c])}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
				>{c}</button
			>
		</div>
	{/each}
{/snippet}

<!-- ============================== CONTAINER ============================== -->
<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
