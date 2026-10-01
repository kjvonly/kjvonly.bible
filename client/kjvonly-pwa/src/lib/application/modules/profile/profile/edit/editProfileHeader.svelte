<script lang="ts">
	// ================================ IMPORTS ================================
	import KJVBackButton from '../../../../ui/navigation/KJVBackButton.svelte';

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

</script>

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Edit Profile"
		{leadingContent}
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
