<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';

	let { wordIndex, word, verse, footnotes, chapterKey, pane = $bindable() } = $props();

	function onWordClicked(e: Event, word: any) {
		e.stopPropagation();

		pane.buffer.bag.lastVerse = verse.number;

		let verseNumber = verse['number'];
		let ref = chapterKey.replaceAll('_', '/') + '/' + verseNumber;

		paneService.onSplitPane(pane.id, 'h', 'StrongsVersesRefs', {
			word: word,
			footnotes: footnotes,
			currentVerseRef: ref
		});
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO'))}
	&nbsp;<span
		onclick={(e) => {
			onWordClicked(e, word);
		}}
		class="inline-block {word.class?.join(' ')}">{word.text}</span
	>
{:else}&nbsp;<span class="inline-block {word.class?.join(' ')}"
		>{word.text}</span
	>
{/if}

<style>
	.FOOTNO {
		cursor: pointer;
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		@apply ms-1 me-2 text-xs text-neutral-700 md:text-base;
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
