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

	// ============================== CLICK FUNCS ==============================

	function onBack(e: Event): void {
		e.stopPropagation();
		navigation.back();
	}
</script>

<!-- ================================ HEADER =============================== -->
<KJVHeader
	title="Strongs / Refs"
	leadingAction={{
		icon: 'arrow-back',
		label: 'Back',
		onClick: onBack
	}}
></KJVHeader>
