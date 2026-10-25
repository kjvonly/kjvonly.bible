<script lang="ts">
	// ================================ IMPORTS ================================

	import { usePaneLayoutContext } from '../../runtime/pane/pane-layout-context';
	// COMPONENTS
	import ViewBody from '$lib/application/runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '$lib/application/runtime/navigation/components/viewHeader.svelte';
	import { KJVHeader } from '$lib/components';
	import KJVBackButton from '../../ui/navigation/KJVBackButton.svelte';
	import Bible from '$lib/components/svgs/bible.svelte';
	import BookmarkStack from '$lib/components/svgs/bookmarkStack.svelte';
	import Dictionary from '$lib/components/svgs/dictionary.svelte';
	import EventNote from '$lib/components/svgs/eventNote.svelte';
	import FolderOpen from '$lib/components/svgs/folderOpen.svelte';
	import ImportExport from '$lib/components/svgs/importExport.svelte';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import Person from '$lib/components/svgs/person.svelte';
	import Search from '$lib/components/svgs/search.svelte';
	import Settings from '$lib/components/svgs/settings.svelte';

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
	const navigationViews = navigation.views;

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
		bookmarks: Modules.BOOKMARKS,
		dictionary: Modules.DICTIONARY,
		plans: Modules.PLANS,
		archive: Modules.ARCHIVE,
		files: Modules.FILE_MANAGER,
		settings: Modules.SETTINGS
	});

	let headerHeight = $state(0);
	let canClosePane = $state(false);
	let hasPreviousNavigationView = $derived(
		$navigationViews.length > 1
	);

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
{#snippet backButton()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<div
		class:ps-4={!hasPreviousNavigationView && !canClosePane}
		class="w-full"
	>
		<KJVHeader
			title="Modules"
			leadingContent={hasPreviousNavigationView
				? backButton
				: undefined}
			leadingAction={!hasPreviousNavigationView && canClosePane
				? {
					icon: 'close',
					label: 'Close pane',
					onClick: onClose
				}
				: undefined}
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
	</div>
{/snippet}

{#snippet moduleIcon(module: Modules)}
	{#if module === Modules.BIBLE}
		<Bible classes="h-5 w-5" />
	{:else if module === Modules.SEARCH}
		<Search classes="h-5 w-5" />
	{:else if module === Modules.NOTES}
		<NoteStack classes="h-5 w-5" />
	{:else if module === Modules.BOOKMARKS}
		<BookmarkStack classes="h-5 w-5" />
	{:else if module === Modules.DICTIONARY}
		<Dictionary classes="h-5 w-5" />
	{:else if module === Modules.PLANS}
		<EventNote classes="h-5 w-5" />
	{:else if module === Modules.ARCHIVE}
		<ImportExport classes="h-5 w-5" />
	{:else if module === Modules.FILE_MANAGER}
		<FolderOpen classes="h-5 w-5" />
	{:else if module === Modules.SETTINGS}
		<Settings classes="h-5 w-5" />
	{:else if module === Modules.PROFILE || module === Modules.LOGIN}
		<Person classes="h-5 w-5" />
	{/if}
{/snippet}

<!-- ================================= BODY ================================ -->
{#snippet body()}
	{#each Object.keys(components) as c}
		<div class="w-full">
			<button
				onclick={() => onModuleSelected(components[c])}
				class="flex w-full items-center gap-3 bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>
				<span class="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
					{@render moduleIcon(components[c])}
				</span>
				{c}
			</button>
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
