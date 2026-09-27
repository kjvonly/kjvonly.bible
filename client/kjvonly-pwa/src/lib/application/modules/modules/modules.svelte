<script lang="ts">
	// ================================ IMPORTS ================================

	import { usePaneLayoutContext } from '../../runtime/pane/pane-layout-context';
	// COMPONENTS
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// MODELS
	import { Modules } from '$lib/application/models/modules.model';

	// SERVICES
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import { useNavigationRuntimeContext } from '$lib/application/runtime/navigation/navigation-runtime-context';
	const {
		authenticationService,
		moduleLaunchDestinationResolver
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

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		return authenticationService.subscribe((state) => {
			addDynamicModules(state.status !== 'signed-out');
		});
	});

	// ================================ FUNCS ==================================
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
	<span class="flex-1"></span>
	<span class="text-center"> Modules </span>
	<span class="flex flex-1 justify-end">
		<KJVButton classes="" onClick={onClose}>
			<Close></Close>
		</KJVButton>
	</span>
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
