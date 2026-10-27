<script lang="ts">
	import type { Snippet } from 'svelte';

	// COMPONENTS
	import KJVBackButton from '../../../ui/navigation/KJVBackButton.svelte';
	import ViewBody from '../../../runtime/navigation/components/viewBody.svelte';
	import ViewHeader from '../../../runtime/navigation/components/viewHeader.svelte';
	import { KJVHeader } from '$lib/components';

	// RUNTIME
	import {
		usePaneLayoutContext
	} from '../../../runtime/pane/pane-layout-context';

	// =============================== BINDINGS ================================

	let {
		title,
		bodyClasses = 'px-4',
		children
	}: {
		title: string;
		bodyClasses?: string;
		children: Snippet;
	} = $props();

	// ================================= VARS ==================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	let headerHeight = $state(0);
</script>

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		{title}
		{leadingContent}
	></KJVHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>

<ViewBody {headerHeight} {clientHeight} classes={bodyClasses}>
	{@render children()}
</ViewBody>
