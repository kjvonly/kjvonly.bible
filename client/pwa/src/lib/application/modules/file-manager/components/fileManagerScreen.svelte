<script lang="ts">
	import {
		onMount,
		type Snippet
	} from 'svelte';

	// COMPONENTS
	import {
		KJVHeader,
		type HeaderActions
	} from '$lib/components';
	import KJVBackButton from '../../../ui/navigation/KJVBackButton.svelte';
	import KJVMoreActionsButton from '../../../ui/navigation/KJVMoreActionsButton.svelte';
	import ViewBody from '../../../runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '../../../runtime/navigation/components/viewHeader.svelte';

	// RUNTIME
	import {
		useNavigationEntryContext
	} from '../../../runtime/navigation/navigation-entry-context';
	import {
		useNavigationRuntimeContext
	} from '../../../runtime/navigation/navigation-runtime-context';
	import {
		usePaneLayoutContext
	} from '../../../runtime/pane/pane-layout-context';
	import {
		useFileManagerNavigationContext
	} from '../runtime/file-manager-navigation-context';
	import {
		handleFileManagerOverflowNavigationResult
	} from '../runtime/file-manager-overflow-navigation-result';

	// TYPES
	import type {
		NavigationStateValue
	} from '../../../services/navigation.service';

	// =============================== BINDINGS ================================

	let {
		title,
		actions = [],
		bodyClasses = '',
		children
	}: {
		title: string;
		actions?: HeaderActions;
		bodyClasses?: string;
		children: Snippet;
	} = $props();

	// ================================= VARS ==================================

	const paneLayout = usePaneLayoutContext();
	const fileManagerNavigation =
		useFileManagerNavigationContext();
	const {
		navigation
	} = useNavigationRuntimeContext();
	const {
		onResult,
		whenActive
	} = useNavigationEntryContext();

	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	let headerHeight = $state(0);

	let headerActions = $derived.by(
		(): HeaderActions => {
			if (actions.length > 2) {
				throw new Error(
					'FileManager header supports at most two direct actions before overflow.'
				);
			}

			return actions;
		}
	);

	// =============================== LIFECYCLE ===============================

	onMount(() =>
		onResult(
			onNavigationResult
		)
	);

	// ================================ FUNCS ==================================

	/** Routes menu results only after the mounted FileManager entry is active again. */
	function onNavigationResult(
		result: NavigationStateValue
	): void {
		handleFileManagerOverflowNavigationResult(
			result,
			{
				navigation,
				whenActive
			}
		);
	}
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet trailingContent()}
	<KJVMoreActionsButton
		onClick={() => fileManagerNavigation.openOverflowActions()}
	></KJVMoreActionsButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		{title}
		{leadingContent}
		{trailingContent}
		actions={headerActions}
	></KJVHeader>
{/snippet}

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>

<ViewBody {headerHeight} {clientHeight} classes={bodyClasses}>
	{@render children()}
</ViewBody>
