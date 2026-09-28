<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import { KJVHeader } from '$lib/components';

	// ================================= VARS ==================================

	const {
		navigation
	} = useNavigationRuntimeContext();

	// ============================== CLICK FUNCS ==============================

	function onBack(): void {
		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<KJVHeader
		title="Create Account"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back to login options',
			onClick: onBack
		}}
	></KJVHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{@render header()}
