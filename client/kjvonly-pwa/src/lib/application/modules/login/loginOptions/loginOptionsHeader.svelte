<script lang="ts">
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	// ================================ IMPORTS ================================
	// COMPONENTS
	import Close from '$lib/components/svgs/close.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	const { workspaceRuntime } = useApplicationContext();

	// SERVICES

	// =============================== BINDINGS ================================

	let { paneID } = $props();

	// ============================== CLICK FUNCS ==============================

	function onClose(e: Event): void {
		e.stopPropagation();
		workspaceRuntime.closePane(paneID);
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet header()}
	<div
		class="flex w-full flex-row bg-neutral-100 py-2 leading-tight"
	>
		<span class="flex-1"></span>
		<span class="text-center">Login</span>
		<div class="flex flex-1 justify-end pe-4">
			<KJVButton onClick={onClose} classes="">
				<Close classes=""></Close>
			</KJVButton>
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->
{@render header()}
