<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';

	// MODELS
	// SERVICES
	// =============================== BINDINGS ================================
	// ================================== VARS =================================
	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);
	// =============================== LIFECYCLE ===============================
	// ================================ FUNCS ==================================
	// ============================== CLICK FUNCS ==============================
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}{/snippet}
<!-- ================================= BODY ================================ -->
{#snippet body()}{/snippet}
<!-- ============================== CONTAINER ============================== -->
<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
