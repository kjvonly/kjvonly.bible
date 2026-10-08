<script lang="ts">
	import {
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// MODELS
	import { Modules } from '$lib/application';

	// SERVICES
	import { REFS_VIEWS } from '../../../models/refs-navigation.model';
	import { NOTES_VIEWS } from '$lib/domains/notes';
	import type {
		BibleTextMarkup,
		BibleTextMarkupMarking
	} from '../../../models/bible-text-markup.model';
	import {
		BIBLE_MODES,
		type BibleMode,
		type Verse
	} from '../../../models/bible.model';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Notes from '$lib/components/svgs/notes.svelte';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import type {
		ChapterNotesByLocation
	} from './chapter-notes';
	import {
		toggleBibleTextMarkupVerse,
		toggleBibleTextMarkupWord
	} from './text-markup-edit';
	const {
		bibleLocationReferenceService,
		bibleVerseReferenceService
	} = useApplicationContext();
	const { navigation } =
		useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	let {
		textMarkup = $bindable<BibleTextMarkup>(),
		mode = $bindable<BibleMode>(),
		notes = $bindable<ChapterNotesByLocation>(),
		bibleLocationRef,
		bibleVersion,
		footnotes,
		verse,
		word,
		wordIdx
	}: {
		textMarkup: BibleTextMarkup;
		mode: BibleMode;
		notes: ChapterNotesByLocation;
		bibleLocationRef: string;
		bibleVersion: string;
		footnotes: { [key: string]: string };
		verse: Verse;
		word: Word;
		wordIdx: number;
	} = $props();

	// ================================= VARS ==================================

	let wordMarkup: BibleTextMarkupMarking | undefined = $state();
	let wordHasNotes: boolean = $state(false);
	let verseHasReferences = $state(false);
	let bibleWordAttributes = $derived({
		'data-bible-word': '',
		'data-verse': verse.number,
		'data-word-index': wordIdx
	});

	// =============================== LIFECYCLE ===============================

	$effect(() => {
		textMarkup;
		setWordMarkup();
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
				for (const h of w.href || []) {
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

	function setWordMarkup() {
		wordMarkup = undefined;

		if (
			textMarkup.markings &&
			textMarkup.markings[verse.number] &&
			textMarkup.markings[verse.number][wordIdx]
		) {
			wordMarkup = textMarkup.markings[verse.number][wordIdx];
		}
	}

	function setWordHasNotes(): void {
		const bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(
				bibleLocationRef
			);
		const wordKey =
			`${bookIDChapter}_${verse.number}_${wordIdx}`;

		wordHasNotes =
			wordKey in notes;
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
		updateBibleLocationRef();
		if (isWordAVerseNumber()) {
			applyMarkupToVerse();
		} else {
			applyMarkupToWord();
		}
	}

	function verseNumberClicked(): void {
		const {
			refs,
			strongsWords
		} = bibleVerseReferenceService
			.extractAll(verse);

		navigation.pushModule(
			Modules.STRONGS,
			REFS_VIEWS.ROOT,
			{
				bibleLocationRef:
					getVerseBibleLocationRef(),
				footnotes,
				refs,
				strongsWords
			}
		);
	}

	function nonVerseNumberClicked(): void {
		navigation.pushModule(
			Modules.STRONGS,
			REFS_VIEWS.ROOT,
			{
				bibleLocationRef:
					getVerseBibleLocationRef(),
				word,
				footnotes
			}
		);
	}

	function applyMarkupToVerse() {
		toggleBibleTextMarkupVerse(
			textMarkup,
			verse.number,
			verse.words.length,
			mode
		);
	}

	function applyMarkupToWord() {
		toggleBibleTextMarkupWord(
			textMarkup,
			verse.number,
			wordIdx,
			mode
		);
	}

	function getVerseBibleLocationRef(): string {
		return `${bibleLocationReferenceService
			.extractVersionBookIDChapter(
				bibleLocationRef
			)}_${verse.number}`;
	}


	function onNotesClicked() {
		const bookIDChapter =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		navigation.pushModule(
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{
				bibleLocationRef:
					`${bookIDChapter}_${verse.number}_${wordIdx}`
			}
		);
	}
</script>

{#if wordHasNotes}
	<span class={wordMarkup?.class?.join(' ')}>
		&nbsp;<KJVButton classes="" onClick={onNotesClicked}>
			<NoteStack classes="fill-support-a-500"></NoteStack>
		</KJVButton>
	</span>
{/if}{#if word && word.class && (word.class.includes('xref') || word.class.includes('FOOTNO') || word.class.includes('vno'))}
	<span {...bibleWordAttributes} class={wordMarkup?.class?.join(' ')}>
		<span class={wordMarkup?.class?.join(' ')}>&nbsp;</span><span
			role="button"
			tabindex="-1"
			onkeydown={() => {}}
			onclick={onWordClicked}
			class="{word.class?.join(' ')} {verseHasReferences
				? 'vno-refs'
				: ''} {wordMarkup?.class?.join(' ')}">{word.text}</span
		></span
	>
{:else if mode.value === BIBLE_MODES.EDIT}
	<span {...bibleWordAttributes} class=" {wordMarkup?.class?.join(' ')}">
		<span class={wordMarkup?.class?.join(' ')}>&nbsp;</span><span
			tabindex="-1"
			role="button"
			onkeydown={() => {}}
			onclick={onEditClick}
			class="{word.class?.join(' ')} {wordMarkup?.class?.join(' ')}"
			>{word.text}</span
		></span
	>
{:else}
	<span {...bibleWordAttributes} class=" {wordMarkup?.class?.join(' ')}">
		<span class={wordMarkup?.class?.join(' ')}>&nbsp;</span><span
			tabindex="-1"
			role="button"
			onkeydown={() => {}}
			class="{word.class?.join(' ')} {wordMarkup?.class?.join(' ')}"
			>{word.text}</span
		></span
	>
{/if}

<style>
	@reference "../../../../../../app.css";
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
