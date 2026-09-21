<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// SERVICES
	import type {
		NavigationService
	} from '$lib/application/services/navigation.service';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// =============================== BINDINGS ================================

	let { navService = $bindable() }: {
		navService: NavigationService;
	} = $props();

	// ============================== CLICK FUNCS ==============================

	function onBack(e: Event): void {
		e.stopPropagation();
		navService.pop();
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div
		class="grid w-full grid-cols-3 bg-neutral-100 py-2 leading-tight outline outline-neutral-400"
	>
		<KJVButton onClick={onBack} classes="ps-4">
			<ArrowBack></ArrowBack>
		</KJVButton>

		<span class="text-center">NSEC Login</span>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
