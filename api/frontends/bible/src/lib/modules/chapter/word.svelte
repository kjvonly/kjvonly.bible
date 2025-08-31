<script lang="ts">
	import { paneService } from '$lib/services/pane.service.svelte';
	import { searchService } from '$lib/services/search.service';
	import { onMount, untrack } from 'svelte';

	let {
		wordIdx,
		lastKnownScrollPosition,
		word,
		verse,
		footnotes,
		chapterKey,
		pane = $bindable(),
		annotations = $bindable(),
		notes = $bindable(),
		mode = $bindable()
	} = $props();

	let track: any = {};
	let verseNumber = $state(0);
	let wordAnnotations: any = $state();
	let notesAnnotations: any = $state(false);
	let hasVerseReferences = $state(false);
	$effect(() => {
		annotations;
		wordAnnotations = getWordAnnotations();
	});

	$effect(() => {
		notes;
		if (notes) {
			wordHasNotes();
		}
	});

	$effect(() => {
		word;
		untrack(() => {
			hasVerseReferences = false;
			if (wordIdx === 0) {
				verse?.words?.forEach((w: any) => {
					if (hasVerseReferences) {
						return;
					}
					w.href?.forEach((h: any) => {
						if (h.includes('/')) {
							hasVerseReferences = true;
							return;
						}
					});
				});
			}
		});
	});

	function updateMode(m: string) {
		mode.chapterKey = `${chapterKey}_${verse['number']}_${wordIdx}`;
		mode.value = m;
	}

	function getWordAnnotations() {
		verseNumber = verse['number'];

		if (!annotations.annots) {
			return;
		}

		if (!annotations.annots[verseNumber]) {
			return;
		}

		if (!annotations.annots[verseNumber][wordIdx]) {
			return;
		}

		return annotations.annots[verseNumber][wordIdx];
	}

	function wordHasNotes() {
		let verseNumber = verse['number'];
		let wordKey = `${chapterKey}_${verseNumber}_${wordIdx}`;
		notesAnnotations = notes[wordKey];
	}

	function initWordAnnotations(wordIndex: number) {
		verseNumber = verse['number'];

		if (!annotations.annots[verseNumber]) {
			annotations.annots[verseNumber] = {};
		}

		if (!annotations.annots[verseNumber][wordIndex]) {
			annotations.annots[verseNumber][wordIndex] = {};
		}

		if (!annotations.annots[verseNumber][wordIndex].class) {
			annotations.annots[verseNumber][wordIndex].class = [];
		}

		return annotations.annots[verseNumber][wordIndex];
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
	<span class={wordAnnotations?.class?.join(' ')}>
		&nbsp;<button
			onclick={onNotesClicked}
			aria-label="note"
			class="inline-block h-4 w-4 hover:cursor-pointer"
		>
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
						class="fill-support-a-500"
						style="stroke-width:1.33333"
						d="M 19.272727,108.72727 16,105.45455 V 64 22.545455 L 19.272727,19.272727 22.545455,16 H 64 105.45455 l 3.27272,3.272727 C 111.99725,22.542709 112,22.569285 112,50.959401 V 79.373349 L 95.647413,95.686675 79.294825,112 H 50.92014 c -28.348432,0 -28.377713,-0.003 -31.647413,-3.27273 z M 74.666667,88 V 74.666667 H 88 101.33333 v -24 -24 H 64 26.666667 V 64 101.33333 h 24 24 z M 37.333333,64 V 58.666667 H 50.666667 64 V 64 69.333333 H 50.666667 37.333333 Z m 0,-21.333333 V 37.333333 H 64 90.666667 V 42.666667 48 H 64 37.333333 Z"
						id="path925"
					/>
				</g>
			</svg>
		</button>
	</span>
{/if}{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	<span class={wordAnnotations?.class?.join(' ')}>
		<span class="">&nbsp;</span
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
			class="{word.class?.join(' ')} {hasVerseReferences && word.class.includes('vno')
				? 'vno-refs'
				: ''} ">{word.text}</span
		></span
	>
{:else}
	<span class=" {wordAnnotations?.class?.join(' ')}">
		<span class="">&nbsp;</span><span
			ontouchstart={onMouseDownTouchStart}
			ontouchend={onMouseUpTouchEnd}
			onmousedown={onMouseDownTouchStart}
			onmouseup={onMouseUpTouchEnd}
			onclick={onEditClick}
			class={word.class?.join(' ')}>{word.text}</span
		></span
	>
{/if}

<style>
	@reference "../../../app.css";
	.FOOTNO {
		cursor: pointer;
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		z-index: 0;
		height: 100%;
		@apply ps-1 pe-2 text-xs text-neutral-700 md:text-base;
	}

	.redtxt {
		@apply text-redtxt;
	}

	.vno {
		vertical-align: baseline;
		transform: translateY(-0.6em);
		cursor: pointer;
		@apply text-xs text-neutral-700 sm:text-base;
	}

	.vno-refs {
		@apply underline decoration-dotted;
	}

	.xref {
		/* @apply underline decoration-dotted !important; */
		@apply underline decoration-dotted;
		cursor: pointer;
	}

	span {
		display: inline-block;
	}
</style>
