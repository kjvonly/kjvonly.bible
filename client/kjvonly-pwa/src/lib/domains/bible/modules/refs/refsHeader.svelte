<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '$lib/application';

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

	function onBack(e: Event): void {
		e.stopPropagation();
		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->
<KJVHeader
	{title}
	leadingAction={{
		icon: 'arrow-back',
		label: 'Back',
		onClick: onBack
	}}
></KJVHeader>
