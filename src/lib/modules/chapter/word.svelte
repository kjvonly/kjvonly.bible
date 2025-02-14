<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';
	import { onMount } from 'svelte';

	let {
		wordIdx,
		lastKnownScrollPosition,
		word,
		verse,
		footnotes,
		chapterKey,
		pane = $bindable()
	} = $props();

	let track: any = {};

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

	onMount(() => {});

	function onMouseDownTouchStart() {
		track[wordIdx] = {
			startTime: Date.now(),
			lastKnownScrollPosition: lastKnownScrollPosition,
			finished: false
		};

		track[wordIdx].timeoutID = setTimeout(() => {
			if (track[wordIdx].finished) {
				return;
			}

			const differenceInMilliseconds = Date.now() - track[wordIdx].startTime;
			const differenceInSeconds = differenceInMilliseconds / 1000;
			if (differenceInSeconds < 2) {
				return;
			}

			if (track[wordIdx].lastKnownScrollPosition != lastKnownScrollPosition) {
				delete track[wordIdx];
				return;
			}

			console.log('2000 ms', word.text);
			track[wordIdx].finished = true;
		}, 2000);
		console.log('touchstart', word.text);
	}

	function onMouseUpTouchEnd() {
		track[wordIdx].finished = true;
	}
	
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	&nbsp;<span
		onclick={(e) => {
			if (!track[wordIdx] || track[wordIdx].finished) {
				return;
			}

			track[wordIdx].finished = true;
			onWordClicked(e, word);
		}}
		ontouchstart={onMouseDownTouchStart}
		ontouchend={onMouseUpTouchEnd}
		onmousedown={onMouseDownTouchStart}
		onmouseup={onMouseUpTouchEnd}
		class="inline-block {word.class?.join(' ')}">{word.text}</span
	>
{:else}&nbsp;<span
		ontouchstart={onMouseDownTouchStart}
		ontouchend={onMouseUpTouchEnd}
		onmousedown={onMouseDownTouchStart}
		onmouseup={onMouseUpTouchEnd}
		class="inline-block {word.class?.join(' ')}">{word.text}</span
	>
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
