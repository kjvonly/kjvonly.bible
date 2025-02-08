<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let { word, verse, footnotes, pane = $bindable() } = $props();

	function onWordClicked(e: Event, word: any) {
		e.stopPropagation();

		pane.buffer.bag.lastVerse = verse.number

		paneService.onSplitPane(pane.id, 'h', 'StrongsVersesRefs', { word: word, footnotes: footnotes });
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
&nbsp;<span
	onclick={(e) => {
		onWordClicked(e, word);
	}}
	class="inline-block {word.class?.join(' ')}">{word.text}</span
>

<style>
	.FOOTNO {
		cursor: pointer;
		vertical-align: baseline;
		position: relative;	
		top: -0.6em;
		@apply me-2 text-xs text-neutral-700 md:text-base;
	}

	.redtxt {
		@apply text-redtxt;
	}

	u {
		text-decoration: none;
	}

	.vno {
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		@apply text-xs text-neutral-700 sm:text-base;
	}

	.xref {
		@apply underline decoration-dotted;
		cursor: pointer;
	}
</style>
