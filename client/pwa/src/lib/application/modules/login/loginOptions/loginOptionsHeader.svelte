<script lang="ts">
	// ================================ IMPORTS ================================
	import KJVBackButton from '../../../ui/navigation/KJVBackButton.svelte';

	// COMPONENTS
	import { KJVHeader } from '$lib/components';

</script>

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		title="Login"
		{leadingContent}
	></KJVHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

{@render header()}
