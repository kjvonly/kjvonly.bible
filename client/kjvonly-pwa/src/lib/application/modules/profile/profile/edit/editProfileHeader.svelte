<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	// COMPONENTS
	import { KJVHeader } from '$lib/components';

	// =============================== BINDINGS ================================

	let {
		saving = false,
		onSave
	}: {
		saving?: boolean;
		onSave: () => Promise<void>;
	} = $props();

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
		title="Edit Profile"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back to profile',
			onClick: onBack
		}}
		actions={[
			{
				icon: 'save',
				label: 'Save profile',
				onClick: () => void onSave(),
				disabled: saving
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
