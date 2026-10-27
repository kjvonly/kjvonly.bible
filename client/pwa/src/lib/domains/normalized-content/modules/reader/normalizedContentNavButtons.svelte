<!-- @component Floating previous/next controls. Scroll-direction visibility is owned by the Reader runtime. -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import LeftChevron from '$lib/components/buttons/chevrons/leftChevron.svelte';
	import RightChevron from '$lib/components/buttons/chevrons/rightChevron.svelte';

	let {
		visible = true,
		showButtons = true,
		canPrevious,
		canNext,
		onPrevious,
		onNext
	}: {
		visible?: boolean;
		showButtons?: boolean;
		canPrevious: boolean;
		canNext: boolean;
		onPrevious: () => void;
		onNext: () => void;
	} = $props();
</script>

<!-- Action-state availability is immediate; only scroll visibility fades. -->
{#if showButtons}
	{#if visible}
		<div
			class="pointer-events-none relative z-10 h-0 w-full"
			transition:fade={{ duration: 500 }}
		>
			<div class="pointer-events-auto absolute bottom-2 left-4">
				<LeftChevron
					ariaLabel="Previous document"
					disabled={!canPrevious}
					onClick={onPrevious}
				></LeftChevron>
			</div>
			<div class="pointer-events-auto absolute right-4 bottom-2">
				<RightChevron
					ariaLabel="Next document"
					disabled={!canNext}
					onClick={onNext}
				></RightChevron>
			</div>
		</div>
	{/if}
{/if}
