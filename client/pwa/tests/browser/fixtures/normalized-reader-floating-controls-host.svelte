<script lang="ts">
	import NormalizedContentNavButtons from '$lib/domains/normalized-content/modules/reader/normalizedContentNavButtons.svelte';
	import NormalizedDocumentProgress from '$lib/domains/normalized-content/modules/reader/normalizedDocumentProgress.svelte';
	import { useNormalizedContentFloatingControlsVisibility } from '$lib/domains/normalized-content/modules/reader/runtime/normalized-content-floating-controls-visibility.svelte';

	let {
		scrollContainerId,
		showButtons = true,
		atDocumentEnd = false,
		atDocumentStart = true,
		currentIndex = 0,
		documentReady = true
	}: {
		scrollContainerId: string;
		showButtons?: boolean;
		atDocumentEnd?: boolean;
		atDocumentStart?: boolean;
		currentIndex?: number;
		documentReady?: boolean;
	} = $props();

	const controls = useNormalizedContentFloatingControlsVisibility({
		scrollContainerId,
		showButtons: () => showButtons,
		atDocumentEnd: () => atDocumentEnd,
		atDocumentStart: () => atDocumentStart,
		currentIndex: () => currentIndex,
		documentReady: () => documentReady
	});
</script>

<NormalizedDocumentProgress progress={0.42} height={300} visible={controls.visible} onSeek={() => {}} />
{#if showButtons}
	<NormalizedContentNavButtons
		visible={controls.visible}
		canPrevious={false}
		canNext={true}
		onPrevious={() => {}}
		onNext={() => {}}
	/>
{/if}
