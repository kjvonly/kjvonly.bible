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
		pane = $bindable(),
		annotations = $bindable(),
		mode = $bindable()
	} = $props();

	let track: any = {};
	let verseNumber = $state(0);
	let wordAnnotations: any = $state();
	let notesAnnotations: any = $state();

	$effect(() => {
		annotations;
		wordAnnotations = getWordAnnotations();
		notesAnnotations = getNotesAnnotations();
	});

	function updateMode(m: string) {
		mode.value = m;
		mode.chapterKey = `${chapterKey}_${verse['number']}_${wordIdx}`;
	}

	function getWordAnnotations() {
		verseNumber = verse['number'];
		if (!annotations[verseNumber]) {
			return;
		}

		if (!annotations[verseNumber].decorations) {
			return;
		}

		if (!annotations[verseNumber].decorations.words) {
			return;
		}

		if (!annotations[verseNumber].decorations.words) {
			return;
		}

		if (!annotations[verseNumber].decorations.words[wordIdx]) {
			return;
		}

		return annotations[verseNumber].decorations.words[wordIdx];
	}

	function getNotesAnnotations() {
		verseNumber = verse['number'];
		if (!annotations[verseNumber]) {
			return;
		}

		if (!annotations[verseNumber].notes) {
			return;
		}

		if (!annotations[verseNumber].notes.words) {
			return;
		}

		if (!annotations[verseNumber].notes.words) {
			return;
		}

		if (!annotations[verseNumber].notes.words[wordIdx]) {
			return;
		}

		return Object.keys(annotations[verseNumber].notes.words[wordIdx]).length > 0;
	}

	function initWordAnnotations(wordIndex: number) {
		verseNumber = verse['number'];
		if (!annotations[verseNumber]) {
			annotations[verseNumber] = {};
		}

		if (!annotations[verseNumber].decorations) {
			annotations[verseNumber].decorations = {};
		}

		if (!annotations[verseNumber].decorations.words) {
			annotations[verseNumber].decorations.words = {};
		}

		if (!annotations[verseNumber].decorations.words) {
			annotations[verseNumber].decorations.words = {};
			annotations[verseNumber].decorations.words[wordIndex] = {};
		}

		if (!annotations[verseNumber].decorations.words[wordIndex]) {
			annotations[verseNumber].decorations.words[wordIndex] = {};
		}

		if (!annotations[verseNumber].decorations.words[wordIndex].class) {
			annotations[verseNumber].decorations.words[wordIndex].class = [];
		}

		return annotations[verseNumber].decorations.words[wordIndex];
	}

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
		verseNumber = verse['number'];

		if (
			annotations &&
			annotations[verseNumber] &&
			annotations[verseNumber].decorations &&
			annotations[verseNumber].decorations.words
		) {
			wordAnnotations = annotations[verseNumber].decorations.words[wordIdx];
		}
		if (
			annotations &&
			annotations[verseNumber] &&
			annotations[verseNumber].notes &&
			annotations[verseNumber].notes.words
		) {
			notesAnnotations = annotations[verseNumber].notes.words[wordIdx];
		}
	});

	let pressThresholdInMilliseconds = 1000;

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

			if (track[wordIdx].lastKnownScrollPosition != lastKnownScrollPosition) {
				delete track[wordIdx];
				return;
			}

			updateMode('edit');

			track[wordIdx].finished = true;
		}, pressThresholdInMilliseconds);
	}

	function onMouseUpTouchEnd() {
		if (track[wordIdx]) {
			const differenceInMilliseconds = Date.now() - track[wordIdx].startTime;
			if (differenceInMilliseconds < pressThresholdInMilliseconds) {
				clearTimeout(track[wordIdx].timeoutID);
			}
		}
	}

	function onEditClick() {
		if (mode.value == '') {
			return;
		}

		let widxs = [];
		if (word.class?.includes('vno')) {
			for (let i = 0; i < verse.words.length; i++) {
				widxs.push(i);
			}
		} else {
			widxs.push(wordIdx);
		}

		let shouldAdd = true;
		if (widxs.length > 1) {
			let w = initWordAnnotations(0);
			w.class.forEach((c: string) => {
				if (c.startsWith('bg')) {
					shouldAdd = false;
				}
			});
		}

		widxs.forEach((i) => {
			let w = initWordAnnotations(i);

			let indexOf: number | undefined;
			w.class.forEach((c: string, idx: number) => {
				if (c.startsWith(mode.type)) {
					indexOf = idx;
				}
			});

			if (indexOf !== undefined || !shouldAdd) {
				w.class.splice(indexOf, 1);
				if (mode.type === 'decoration') {
					w.class = w.class.filter((c: string) => {
						if (c === 'underline' || c.startsWith('decoration')) {
							return;
						}
						return c;
					});
				}
			} else {
				w.class.push(mode.colorAnnotation);
				if (mode.type === 'decoration') {
					w.class.push('underline', 'decoration-solid');
				}
			}
		});
	}

	function onNotesClicked() {
		mode.chapterKey = `${chapterKey}_${verseNumber}_${wordIdx}`;
		mode.notePopup.show = true;
	}
</script>

{#if notesAnnotations}
	&nbsp;<button onclick={onNotesClicked} aria-label="note" class="inline-block h-4 w-4">
		<svg
			version="1.1"
			id="svg798"
			width="100%"
			height="100%"
			viewBox="0 0 96 96"
			xmlns="http://www.w3.org/2000/svg"
		>
			<g id="g804" transform="translate(-16,-16)">
				<path
					class="fill-supporta-500"
					style="stroke-width:1.33333"
					d="M 19.272727,108.72727 16,105.45455 V 64 22.545455 L 19.272727,19.272727 22.545455,16 H 64 105.45455 l 3.27272,3.272727 C 111.99725,22.542709 112,22.569285 112,50.959401 V 79.373349 L 95.647413,95.686675 79.294825,112 H 50.92014 c -28.348432,0 -28.377713,-0.003 -31.647413,-3.27273 z M 74.666667,88 V 74.666667 H 88 101.33333 v -24 -24 H 64 26.666667 V 64 101.33333 h 24 24 z M 37.333333,64 V 58.666667 H 50.666667 64 V 64 69.333333 H 50.666667 37.333333 Z m 0,-21.333333 V 37.333333 H 64 90.666667 V 42.666667 48 H 64 37.333333 Z"
					id="path925"
				/>
			</g>
		</svg>
	</button>
{/if}{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	<span class="inline-block {wordAnnotations?.class?.join(' ')}">&nbsp;</span
	><!-- svelte-ignore a11y_no_static_element_interactions --><!-- svelte-ignore a11y_click_events_have_key_events --><span
		onclick={(e) => {
			if (mode.value !== '') {
				onEditClick();
				return;
			}

			if (track[wordIdx] && track[wordIdx].finished) {
				return;
			}

			if (track[wordIdx]) {
				track[wordIdx].finished = true;
			}

			onWordClicked(e, word);
		}}
		ontouchstart={onMouseDownTouchStart}
		ontouchend={onMouseUpTouchEnd}
		onmousedown={onMouseDownTouchStart}
		onmouseup={onMouseUpTouchEnd}
		class="inline-block {word.class?.join(' ')} {wordAnnotations?.class?.join(' ')}"
		>{word.text}</span
	>
{:else}<span class="inline-block {wordAnnotations?.class?.join(' ')}">&nbsp;</span><span
		ontouchstart={onMouseDownTouchStart}
		ontouchend={onMouseUpTouchEnd}
		onmousedown={onMouseDownTouchStart}
		onmouseup={onMouseUpTouchEnd}
		onclick={onEditClick}
		class="inline-block {word.class?.join(' ')} {wordAnnotations?.class?.join(' ')}"
		>{word.text}</span
	>
{/if}

<style>
	.FOOTNO {
		cursor: pointer;
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		height: 100%;
		@apply pe-2 ps-1 text-xs text-neutral-700 md:text-base;
	}

	.redtxt {
		@apply text-redtxt;
	}

	.vno {
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		cursor: pointer;
		@apply text-xs text-neutral-700 sm:text-base;
	}

	.xref {
		@apply underline decoration-dotted !important;
		cursor: pointer;
	}
</style>
