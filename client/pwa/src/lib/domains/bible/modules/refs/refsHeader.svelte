<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		MODULES_VIEWS,
		Modules,
		PaneSplit,
		useNavigationRuntimeContext
	} from '$lib/application';
	import {
		KJVBackButton
	} from '$lib/application/ui';

	// COMPONENTS
	import { KJVHeader } from '$lib/components';

	const { navigation } =
		useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	let {
		title = 'Strongs / Refs'
	}: {
		title?: string;
	} = $props();

	// ============================== CLICK FUNCS ==============================

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
</script>

<!-- ================================ HEADER =============================== -->
{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<KJVHeader
	{title}
	{leadingContent}
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
