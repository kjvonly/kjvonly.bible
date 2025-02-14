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

	$effect(() => {
		annotations;
		wordAnnotations = initWordAnnotations(wordIdx);
	});

	$effect(() =>{
		mode;

		if(mode !== ''){
			console.log('mode changed',word, )
		}
	})

	function updateMode(m: string){
		mode.value = m
	}

	function initWordAnnotations(wordIndex: number) {
		verseNumber = verse['number'];
		if (!annotations[verseNumber]) {
			annotations[verseNumber] = {};
		}

		if (!annotations[verseNumber].words) {
			annotations[verseNumber].words = {};
		}

		if (!annotations[verseNumber].words) {
			annotations[verseNumber].words = {};
			annotations[verseNumber].words[wordIndex] = {};
		}

		if (!annotations[verseNumber].words[wordIndex]) {
			annotations[verseNumber].words[wordIndex] = {};
		}

		if (!annotations[verseNumber].words[wordIndex].class) {
			annotations[verseNumber].words[wordIndex].class = [];
		}

		return annotations[verseNumber].words[wordIndex];
	}

	function onWordClicked(e: Event, word: any) {
		e.stopPropagation();

		console.log('click edit', mode.value);
		if (mode.value != '') {
			console.log(mode.value);
			onEditClick();
			return;
		}

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

		if (annotations && annotations[verseNumber] && annotations[verseNumber].words) {
			wordAnnotations = annotations[verseNumber].words[wordIdx];
		}
	});

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

			console.log('2000 ms', word.text);
			updateMode('edit');
			
			track[wordIdx].finished = true;
		}, 2000);
		console.log('touchstart', word.text);
	}

	function onMouseUpTouchEnd() {
		if (track[wordIdx]) {
			const differenceInMilliseconds = Date.now() - track[wordIdx].startTime;
			const differenceInSeconds = differenceInMilliseconds / 1000;
			if (differenceInSeconds < 2) {
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
				if (c.startsWith('bg')) {
					indexOf = idx;
				}
			});

			if (indexOf !== undefined || !shouldAdd) {
				w.class.splice(indexOf, 1);
			} else {
				w.class.push('bg-primary-200');
			}
		});
	}
</script>


<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	<span class="inline-block {wordAnnotations?.class?.join(' ')}">&nbsp;</span><span
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
