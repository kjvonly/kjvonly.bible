<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';
	import { onMount } from 'svelte';

	let { lastKnownScrollPosition, word, verse, footnotes, chapterKey, pane = $bindable() } = $props();

	function onWordClicked(e: Event, word: any) {
		e.stopPropagation();

		pane.buffer.bag.lastVerse = verse.number;
		let verseNumber = verse['number'];
		let ref = chapterKey.replaceAll('_', '/') + '/' + verseNumber;

		if (word.class.includes('vno')) {
			let refs: string[] = [];
			let strongsWords: string[] = [];
			verse.words.forEach((w: any) => {
				if (w.href) {
					refs.push(...w.href);

					w.href.forEach((ref: string) => {
						if (ref.startsWith('G') || ref.startsWith('H')) {
							strongsWords.push(w.text);
						}
					});
				}
			});

			paneService.onSplitPane(pane.id, 'h', 'StrongsVersesRefs', {
				footnotes: footnotes,
				currentVerseRef: ref,
				refs: refs,
				strongsWords: strongsWords
			});
		} else {
			paneService.onSplitPane(pane.id, 'h', 'StrongsVersesRefs', {
				word: word,
				footnotes: footnotes,
				currentVerseRef: ref
			});
		}
	}

	onMount(() => {

	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	&nbsp;<span
		onclick={(e) => {
			onWordClicked(e, word);
		}}
		ontouchstart={() => {
			console.log('touchstart', word.text);
		}}
		ontouchend={() => {
			console.log('touchend', word.text);
		}}
		onmousedown={() => {
			console.log('onMouseDown', word.text);
		}}
		onmouseup={(e) => {
			e.stopPropagation();
			console.log('onMouseUp', word.text);
		}}
		class="inline-block {word.class?.join(' ')}">{word.text}</span
	>
{:else}&nbsp;<span class="inline-block {word.class?.join(' ')}">{word.text}</span>
{/if}

<style>
	.FOOTNO {
		cursor: pointer;
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		@apply me-2 ms-1 text-xs text-neutral-700 md:text-base;
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
		cursor: pointer;
		@apply text-xs text-neutral-700 sm:text-base;
	}

	.xref {
		@apply underline decoration-dotted;
		cursor: pointer;
	}
</style>
