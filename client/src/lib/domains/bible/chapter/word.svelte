<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// MODELS
	import { Modules } from '$lib/models/modules.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import type { Pane } from '$lib/models/pane.model';
	import {
		BIBLE_MODES,
		type Annotations,
		type BibleMode,
		type Verse,
		type Word,
		type WordAnnots
	} from '$lib/models/bible.model';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Notes from '$lib/components/svgs/notes.svelte';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';

	// =============================== BINDINGS ================================

	let {
		annotations = $bindable<Annotations>(),
		pane = $bindable(),
		mode = $bindable<BibleMode>(),
		notes = $bindable(),
		bibleLocationRef,
		bibleVersion,
		footnotes,
		lastKnownScrollPosition,
		verse,
		word,
		wordIdx
	}: {
		annotations: Annotations;
		pane: Pane;
		mode: BibleMode;
		notes: any;
		bibleLocationRef: string;
		bibleVersion: string;
		footnotes: { [key: string]: string };
		lastKnownScrollPosition: number;
		verse: Verse;
		word: Word;
		wordIdx: number;
	} = $props();

	// ================================= VARS ==================================

	let track: any = {};
	let wordAnnotations: any = $state();
	let wordHasNotes: boolean = $state(false);
	let verseHasReferences = $state(false);
	let pressThresholdInMilliseconds = 1000;

	// =============================== LIFECYCLE ===============================

	$effect(() => {
		annotations;
		setWordAnnotations();
	});

	$effect(() => {
		notes;
		setWordHasNotes();
	});

	onMount(() => {
		setVerseHasReferences();
	});

	// ================================ FUNCS ==================================

	function setVerseHasReferences() {
		if (isWordAVerseNumber()) {
			for (let w of verse.words) {
				for (var h of w.href || []) {
					if (h.includes('/')) {
						verseHasReferences = true;
						return;
					}
				}
			}
		}
		verseHasReferences = false;
	}

	function isWordAVerseNumber(): boolean {
		return wordIdx === 0;
	}

	function setWordAnnotations() {
		if (
			annotations.annots &&
			annotations.annots[verse.number] &&
			annotations.annots[verse.number][wordIdx]
		) {
			wordAnnotations = annotations.annots[verse.number][wordIdx];
		}
	}

	function setWordHasNotes() {
		if (notes) {
			let bookIDChapter =
				bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
			let wordKey = `${bookIDChapter}_${verse.number}_${wordIdx}`;
			wordHasNotes = wordKey in notes;
		}
	}

	function updateMode(updMode: BIBLE_MODES) {
		updateBibleLocationRef();
		mode.value = updMode;
	}

	function updateBibleLocationRef() {
		let bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		mode.bibleLocationRef = `${bookIDChapter}_${verse.number}_${wordIdx}`;
	}

	// ============================== CLICK FUNCS ==============================

	function onWordClicked(e: Event) {
		e.stopPropagation();

		updateBibleLocationRef();

		if (isBibleModeEdit()) {
			onEditClick();
			return;
		}

		if (track[wordIdx] && track[wordIdx].finished) {
			return;
		}

		if (track[wordIdx]) {
			track[wordIdx].finished = true;
		}

		if (isWordAVerseNumber()) {
			verseNumberClicked();
		} else {
			nonVerseNumberClicked();
		}
	}

	function isBibleModeEdit() {
		return mode.value === BIBLE_MODES.EDIT;
	}

	function onEditClick() {
		if (isWordAVerseNumber()) {
			applyAnnotationToVerse();
		} else {
			applyAnnotationToWord();
		}
	}

	function verseNumberClicked() {
		let refs = extractAllVerseRefs();
		let strongsWords = extractStrongsWords();

		paneService.onSplitPane(pane.id, 'h', Modules.STRONGS, {
			footnotes: footnotes,
			currentVerseRef: getBibleCrossReference(),
			refs: refs,
			bibleVersion: bibleVersion,
			strongsWords: strongsWords
		});
	}

	function nonVerseNumberClicked() {
		paneService.onSplitPane(pane.id, 'h', Modules.STRONGS, {
			word: word,
			footnotes: footnotes,
			currentVerseRef: getBibleCrossReference(),
			bibleVersion: bibleVersion
		});
	}

	function applyAnnotationToVerse() {
		let w = initWordAnnotations(0);
		let exists = getExistingAnnotationIndex(w) !== undefined;
		let wordIndexes = getWordIndexesToEdit();
		wordIndexes.forEach((i) => {
			let w = initWordAnnotations(i);
			if (exists) {
				clearAnnotation(w);
			} else {
				clearAnnotation(w);
				addAnnotation(w.class);
			}
		});
	}

	function applyAnnotationToWord() {
		let w = initWordAnnotations(wordIdx);
		updateAnnotation(w);
	}

	function initWordAnnotations(wordIndex: number): WordAnnots {
		if (!annotations.annots[verse.number]) {
			annotations.annots[verse.number] = {};
		}

		if (!annotations.annots[verse.number][wordIndex]) {
			annotations.annots[verse.number][wordIndex] = { class: [] };
		}

		return annotations.annots[verse.number][wordIndex];
	}

	function getExistingAnnotationIndex(w: WordAnnots): number | undefined {
		let indexOf: number | undefined;
		w.class?.forEach((c: string, idx: number) => {
			if (c.startsWith(mode.type)) {
				indexOf = idx;
			}
		});
		return indexOf;
	}

	function getWordIndexesToEdit(): number[] {
		let wordIndexes = [];
		for (let i = 0; i < verse.words.length; i++) {
			wordIndexes.push(i);
		}
		return wordIndexes;
	}

	function clearAnnotation(w: WordAnnots) {
		let indexOf = getExistingAnnotationIndex(w);
		if (indexOf !== undefined) {
			removeAnnotation(w.class, indexOf);
		}
	}

	function removeAnnotation(cls: string[], indexOf: number) {
		cls.splice(indexOf, 1);
		removeClassDecorations(cls);
	}

	function removeClassDecorations(cls: string[]) {
		if (mode.type === 'decoration') {
			let filtered = cls.filter((c: string) => {
				if (c === 'underline' || c.startsWith('decoration')) {
					return;
				}
				return c;
			});
			cls.length = 0;
			cls.push(...filtered);
		}
	}

	function addAnnotation(cls: string[]) {
		addColorAnnotation(cls);
		addClassDecorations(cls);
	}

	function addColorAnnotation(cls: string[]) {
		cls.push(mode.colorAnnotation);
	}

	function addClassDecorations(cls: string[]) {
		if (mode.type === 'decoration') {
			cls.push('underline', 'decoration-solid');
		}
	}

	function updateAnnotation(w: WordAnnots) {
		let indexOf = getExistingAnnotationIndex(w);
		if (indexOf !== undefined) {
			removeAnnotation(w.class, indexOf);
		} else {
			addAnnotation(w.class);
		}
	}

	function extractAllVerseRefs(): string[] {
		return verse.words
			.flatMap((w: Word) => {
				return w.href;
			})
			.filter((s: string | null) => {
				return s !== null;
			});
	}

	function extractStrongsWords(): string[] {
		return verse.words
			.filter((w: Word) => {
				return w.href?.find((ref: string) => {
					return ref.startsWith('G') || ref.startsWith('H');
				});
			})
			.map((w: Word) => {
				return w.text;
			});
	}

	function getBibleCrossReference(): string {
		let bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		let bookIDChapterVerse = `${bookIDChapter}_${verse.number}`;
		return bookIDChapterVerse.replaceAll('_', '/');
	}

	function onNotesClicked() {
		let bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);

		mode.bibleLocationRef = `${bookIDChapter}_${verse.number}_${wordIdx}`;
		mode.notePopup.show = true;
	}

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

			updateMode(BIBLE_MODES.EDIT);

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
</script>

{#if wordHasNotes}
	<span class={wordAnnotations?.class?.join(' ')}>
		&nbsp;<KJVButton classes="" onClick={onNotesClicked}>
			<NoteStack classes="fill-support-a-500"></NoteStack>
		</KJVButton>
	</span>
{/if}{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	<span class={wordAnnotations?.class?.join(' ')}>
		<span class={wordAnnotations?.class?.join(' ')}>&nbsp;</span><span
			role="button"
			tabindex="-1"
			onkeydown={() => {}}
			onclick={onWordClicked}
			ontouchstart={onMouseDownTouchStart}
			ontouchend={onMouseUpTouchEnd}
			onmousedown={onMouseDownTouchStart}
			onmouseup={onMouseUpTouchEnd}
			class="{word.class?.join(' ')} {verseHasReferences
				? 'vno-refs'
				: ''} {wordAnnotations?.class?.join(' ')}">{word.text}</span
		></span
	>
{:else if mode.value === BIBLE_MODES.EDIT}
	<span class=" {wordAnnotations?.class?.join(' ')}">
		<span class={wordAnnotations?.class?.join(' ')}>&nbsp;</span><span
			tabindex="-1"
			role="button"
			onkeydown={() => {}}
			ontouchstart={onMouseDownTouchStart}
			ontouchend={onMouseUpTouchEnd}
			onmousedown={onMouseDownTouchStart}
			onmouseup={onMouseUpTouchEnd}
			onclick={onEditClick}
			class="{word.class?.join(' ')} {wordAnnotations?.class?.join(' ')}"
			>{word.text}</span
		></span
	>
{:else}
	<span class=" {wordAnnotations?.class?.join(' ')}">
		<span class={wordAnnotations?.class?.join(' ')}>&nbsp;</span><span
			tabindex="-1"
			role="button"
			onkeydown={() => {}}
			ontouchstart={onMouseDownTouchStart}
			ontouchend={onMouseUpTouchEnd}
			onmousedown={onMouseDownTouchStart}
			onmouseup={onMouseUpTouchEnd}
			class="{word.class?.join(' ')} {wordAnnotations?.class?.join(' ')}"
			>{word.text}</span
		></span
	>
{/if}

<style>
	@reference "../../../../app.css";
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
		@apply cursor-pointer;
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
