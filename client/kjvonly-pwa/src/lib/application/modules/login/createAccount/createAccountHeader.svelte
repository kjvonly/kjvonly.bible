<script lang="ts">
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';
	import type {
		NavigationService
	} from '$lib/application/services/navigation.service';

	let { navService = $bindable() }: {
		navService: NavigationService;
	} = $props();

	function onBack(e: Event): void {
		e.stopPropagation();
		navService.pop();
	}
</script>

{#snippet header()}
	<div
		class="grid w-full grid-cols-3 bg-neutral-100 py-2 leading-tight"
	>
		<KJVButton onClick={onBack} classes="ps-4">
			<ArrowBack></ArrowBack>
		</KJVButton>

		<span class="text-center">Create Account</span>
	</div>
{/snippet}

{@render header()}
