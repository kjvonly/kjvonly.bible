<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount, untrack } from 'svelte';

	// COMPONENTS
	import Verse from './verse.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		newAnnotation,
		newParagraphs,
		newPericopes,
		type Annotations,
		type BibleMode,
		type Paragraphs,
		type Pericopes,
		type Verse as VerseModel
	} from '../../../models/bible.model';
	import { type Chapter } from '../../../models/bible.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
	import { chapterService } from '$lib/services/bible/chapter.service';
	import { notesService } from '$lib/services/notes.service';
	import { syncService } from '$lib/services/sync.service';
	import { annotsService } from '$lib/services/bible/annots.service';
	// API

	// OTHER
	import uuid4 from 'uuid4';
	import { scrollTo, scrollToTop } from '$lib/utils/eventHandlers';
	import type { Pane } from '$lib/models/pane.model';
	import { paragraphsService } from '$lib/services/bible/paragraphs.service';
	import { settingsService } from '$lib/services/settings.service';
	import type { Settings } from '$lib/models/settings.model';
	import { pericopesService } from '$lib/services/bible/pericopes.service';

	// =============================== BINDINGS ================================

	let {
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		id = $bindable<string>(),
		pane = $bindable<Pane>(),
		mode = $bindable<BibleMode>(),
		annotations = $bindable<Annotations>(),
		lastKnownScrollPosition
	}: {
		bibleLocationRef: string;
		bibleVersion: string;
		id: string;
		pane: Pane;
		mode: BibleMode;
		annotations: Annotations;
		lastKnownScrollPosition: number;
	} = $props();

	// ================================= VARS ==================================

	let notesID = uuid4();

	let footnotes: { [key: string]: string } = $state({});
	let hasVerseRange: boolean = $state(false);

	let notes: any = $state();

	let verseRangeStartIndex: number = 0;
	let verseRangeEndIndex: number = 0;

	let chapter: Chapter | undefined = $state();
	let paragraphs: Paragraphs = $state({});
	let pericopes: Pericopes = $state({});

	/**
	 * svelte isn't updating annotations on chapter change. Need to toggle
	 * to update annotations
	 */
	let toggleVersesView: boolean = $state(true);
	let verses: { [verseNumber: string]: VerseModel } = $state({});
	let versesNumbersToShow: string[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		subscribeToAnnotations();
		subscribeToNotes();
		subscribeToSettings();
	});

	onDestroy(() => {
		unsubscribeToAnnotations();
		unsubscribeToNotes();
		unsubscribeToSettings();
	});

	/**
	 * CORE NOTE: on new bibleLocationRef we must reset the chapter prior to
	 * loading new content. Otehrwise, the rendering will render previous chapter
	 * annotations, paragraphs, and pericopes on the new chapter.
	 */

	$effect(() => {
		bibleLocationRef;
		bibleVersion;
		untrack(() => {
			resetChapter();
			resetMode();
			resetAnnotations();
			resetParagraphs();
			resetPericopes();
			toggleVersesViewFn();
			setVerseRanges();
			scrollToVerse();
			loadAnnotations();
			loadParagraphs();
			loadPericopes();
			loadNotes();
			loadChapter();
		});
	});

	// ================================ FUNCS ==================================

	function toggleVersesViewFn() {
		toggleVersesView = !toggleVersesView;
	}

	function resetChapter() {
		chapter = undefined;
		verses = {};
		footnotes = {};
		versesNumbersToShow = [];
		verseRangeEndIndex = 0;
		verseRangeStartIndex = 0;
	}

	function resetMode() {
		mode.value = BIBLE_MODES.READING;
	}

	function resetAnnotations() {
		annotations = newAnnotation();
	}

	function resetParagraphs() {
		paragraphs = newParagraphs();
	}

	function resetPericopes() {
		pericopes = newPericopes();
	}

	function setVerseRanges() {
		let [start, end] =
			bibleLocationReferenceService.extractVersesOrOne(bibleLocationRef);
		hasVerseRange = start + end > 0;
		verseRangeStartIndex = start;
		verseRangeEndIndex = end;
	}

	function scrollToVerse() {
		if (bibleLocationReferenceService.hasVerse(bibleLocationRef)) {
			let verseNumber =
				bibleLocationReferenceService.extractVerse(bibleLocationRef);
			scrollTo(`${id}-vno-${verseNumber}`, animateScrolledToVerse);
		} else {
			scrollToTop(`${id}-scroll-container`, (el: HTMLElement) => {});
		}
	}

	function animateScrolledToVerse(el: HTMLElement) {
		el?.classList.add('animate-pulse');
		setTimeout(() => {
			el?.classList.remove('animate-pulse');
		}, 4000);
	}

	function subscribeToAnnotations() {
		syncService.subscribe(id, 'annotations', () => {
			loadAnnotations();
		});
	}

	function unsubscribeToAnnotations() {
		syncService.unsubscribe(id);
	}

	async function loadAnnotations() {
		annotations = await annotsService.get(bibleLocationRef);
	}

	async function loadParagraphs() {
		let settings = settingsService.getSettings();
		if (!settings.showParagraphs) {
			resetParagraphs();
		} else {
			paragraphs = await paragraphsService.get(bibleLocationRef);
		}
	}

	async function loadPericopes() {
		let settings = settingsService.getSettings();
		if (!settings.showPericopes) {
			resetPericopes();
		} else {
			pericopes = await pericopesService.get(bibleLocationRef);
		}
	}

	function subscribeToNotes() {
		notesService.subscribe(id, notesID, onSearchResults);
		notesService.subscribe(id, '*', loadNotes);
	}

	function unsubscribeToNotes() {
		notesService.unsubscribe(id);
	}

	async function loadNotes() {
		notesService.searchNotes(
			notesID,
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef),
			['bookChapter']
		);
	}

	function subscribeToSettings() {
		settingsService.subscribe(id, onSettingsChange);
	}

	function onSettingsChange() {
		loadParagraphs();
		loadPericopes();
	}

	function unsubscribeToSettings() {
		settingsService.unsubscribe(id);
	}

	async function loadChapter() {
		chapter = await chapterService.get(`${bibleVersion}/${bibleLocationRef}`);
		verses = chapter.verses;
		footnotes = chapter.footnotes;
		setChapterVersesToShow();
	}

	function setChapterVersesToShow() {
		if (hasVerseRange) {
			versesNumbersToShow = Object.keys(verses)
				.sort((a, b) => (Number(a) < Number(b) ? -1 : 1))
				.slice(verseRangeStartIndex, verseRangeEndIndex);
		} else {
			versesNumbersToShow = Object.keys(verses).sort((a, b) =>
				Number(a) < Number(b) ? -1 : 1
			);
		}
	}

	function onSearchResults(data: any) {
		if (data) {
			let tempNotes: any = {};
			Object.keys(data.notes).forEach(
				(id) => (tempNotes[data.notes[id].bibleLocationRef] = true)
			);
			notes = tempNotes;
		}
	}
</script>

{#snippet versesView()}
	{#each versesNumbersToShow as k, idx}
		<span class="whitespace-normal" id={`${id}-vno-${idx + 1}`}>
			<Verse
				bind:pane
				bind:annotations
				bind:paragraphs
				bind:pericopes
				bind:notes
				bind:mode
				{footnotes}
				verse={chapter?.verses[k] as VerseModel}
				{bibleLocationRef}
				{lastKnownScrollPosition}
			></Verse>
		</span>
	{/each}
{/snippet}

<div class="px-4 leading-loose">
	{#if toggleVersesView}
		{@render versesView()}
	{:else}
		{@render versesView()}
	{/if}
	<div class="mt-18"></div>
</div>
