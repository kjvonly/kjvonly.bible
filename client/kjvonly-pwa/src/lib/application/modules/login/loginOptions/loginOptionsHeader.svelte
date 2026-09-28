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
		title="Login"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: onBack
		}}
	></KJVHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{@render header()}
