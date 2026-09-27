<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount, untrack } from 'svelte';

	// COMPONENTS
	import Verse from './verse.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		type BibleMode,
		type Verse as VerseModel
	} from '../../../models/bible.model';
	import type {
		BibleParagraphMap
	} from '../../../models/bible-paragraphs.model';
	import type {
		BiblePericopeMap
	} from '../../../models/bible-pericopes.model';
	import { type Chapter } from '../../../models/bible.model';
	import type {
		BibleTextMarkup
	} from '../../../models/bible-text-markup.model';

	// SERVICES
	// OTHER
	import uuid4 from 'uuid4';
	import { scrollTo, scrollToTop } from '$lib/application/ui';
	import type { Settings as AppSettings } from '$lib/application';


	// APPLICATION CONTEXT
	import {
		useApplicationContext,
		useNavigationEntryContext
	} from '$lib/application';

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE
	} from '../../../resources/chapters/bible-chapter-interpreter';

	import {
		BIBLE_PARAGRAPHS_RESOURCE_TYPE
	} from '../../../resources/paragraphs/bible-paragraphs-interpreter';

	import {
		BIBLE_PERICOPES_RESOURCE_TYPE
	} from '../../../resources/pericopes/bible-pericopes-interpreter';

	import {
		BIBLE_TEXT_MARKUP_RESOURCE_TYPE
	} from '../../../resources/text-markup/bible-text-markup-interpreter';

	import {
		NOTES_COLLECTION_CHANGED
	} from '$lib/domains/notes';
	import type {
		NotesSearchResult
	} from '$lib/domains/notes';
	import {
		createChapterNotesByLocation,
		type ChapterNotesByLocation
	} from './chapter-notes';

	const {
		chapterService,
		paragraphsService,
		pericopesService,
		bibleTextMarkupService,
		notesService,
		moduleResourceSelectionResolver,
		settingsService,
		bibleLocationReferenceService
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	// =============================== BINDINGS ================================

	let {
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		id = $bindable<string>(),
		mode = $bindable<BibleMode>(),
		textMarkup = $bindable<BibleTextMarkup>(),
		lastKnownScrollPosition
	}: {
		bibleLocationRef: string;
		bibleVersion: string;
		id: string;
		mode: BibleMode;
		textMarkup: BibleTextMarkup;
		lastKnownScrollPosition: number;
	} = $props();

	// ================================= VARS ==================================

	let notesID = uuid4();

	let footnotes: { [key: string]: string } = $state({});
	let hasVerseRange: boolean = $state(false);

	let notes: ChapterNotesByLocation = $state({});

	let verseRangeStartIndex: number = 0;
	let verseRangeEndIndex: number = 0;

	let chapter: Chapter | undefined = $state();
	let paragraphs: BibleParagraphMap = $state({});
	let pericopes: BiblePericopeMap = $state({});
	let currentSettings: AppSettings = settingsService.getSettings();

	/**
	 * svelte isn't updating Text Markup on chapter change. Need to toggle
	 * to update Text Markup
	 */
	let toggleVersesView: boolean = $state(true);
	let verses: { [verseNumber: string]: VerseModel } = $state({});
	let versesNumbersToShow: string[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		subscribeToNotes();
		subscribeToSettings();
	});

	onDestroy(() => {
		unsubscribeFromTextMarkup();
		unsubscribeToNotes();
		unsubscribeToSettings();
	});

	/**
	 * CORE NOTE: on new bibleLocationRef we must reset the chapter prior to
	 * loading new content. Otehrwise, the rendering will render previous chapter
	 * Text Markup, paragraphs, and pericopes on the new chapter.
	 */

	$effect(() => {
		bibleLocationRef;
		bibleVersion;
		untrack(() => {
			resetChapter();
			resetMode();
			unsubscribeFromTextMarkup();
			resetTextMarkup();
			resetParagraphs();
			resetPericopes();
			toggleVersesViewFn();
			setVerseRanges();
			scrollToVerse();
			loadTextMarkup();
			void loadParagraphs(currentSettings);
			void loadPericopes(currentSettings);
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

	function resetTextMarkup() {
		const source =
			moduleResourceSelectionResolver.find(
				navigationState,
				BIBLE_TEXT_MARKUP_RESOURCE_TYPE
			);

		if (!source) {
			textMarkup = {
				id: '',
				chapterRef: '',
				markings: {}
			};
			return;
		}

		textMarkup =
			bibleTextMarkupService.create(
				source,
				bibleLocationRef
			);
	}

	function resetParagraphs() {
		paragraphs = {};
	}

	function resetPericopes() {
		pericopes = {};
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

	function subscribeToTextMarkup(
		textMarkupId: string
	) {
		bibleTextMarkupService.subscribe(
			id,
			textMarkupId,
			onTextMarkupChange
		);
	}

	function unsubscribeFromTextMarkup() {
		bibleTextMarkupService.unsubscribe(
			id
		);
	}

	function onTextMarkupChange(
		updated: BibleTextMarkup
	) {
		textMarkup =
			JSON.parse(
				JSON.stringify(
					updated
				)
			);
	}

	async function loadTextMarkup() {
		const source =
			moduleResourceSelectionResolver.find(
				navigationState,
				BIBLE_TEXT_MARKUP_RESOURCE_TYPE
			);

		if (!source) {
			resetTextMarkup();
			return;
		}

		const installed =
			await bibleTextMarkupService.get(
				source,
				bibleLocationRef
			);

		textMarkup =
			JSON.parse(
				JSON.stringify(
					installed
				)
			);

		subscribeToTextMarkup(
			installed.id
		);
	}

	async function loadParagraphs(settings: AppSettings) {
		if (!settings.showParagraphs) {
			resetParagraphs();
			return;
		}

		const locationRef = bibleLocationRef;
		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_PARAGRAPHS_RESOURCE_TYPE
		);

		const installed = await paragraphsService.get(
			source,
			locationRef
		);

		if (
			!currentSettings.showParagraphs
			|| bibleLocationRef !== locationRef
		) {
			return;
		}

		paragraphs = installed.paragraphs;
	}

	async function loadPericopes(settings: AppSettings) {
		if (!settings.showPericopes) {
			resetPericopes();
			return;
		}

		const locationRef = bibleLocationRef;
		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_PERICOPES_RESOURCE_TYPE
		);

		const installed = await pericopesService.get(
			source,
			locationRef
		);

		if (
			!currentSettings.showPericopes
			|| bibleLocationRef !== locationRef
		) {
			return;
		}

		pericopes = installed.pericopes;
	}

	function subscribeToNotes() {
		notesService.subscribe(id, notesID, onChapterNotesSearchResults);
		notesService.subscribe(
			id,
			NOTES_COLLECTION_CHANGED,
			loadNotes
		);
	}

	function unsubscribeToNotes() {
		notesService.unsubscribe(id);
	}

	function loadNotes() {
		notesService.searchNotes(
			notesID,
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef),
			['bookChapter']
		);
	}

	function subscribeToSettings() {
		settingsService.subscribe(id, onSettingsChange);
	}

	function onSettingsChange(settings: AppSettings) {
		currentSettings = settings;
		void loadParagraphs(settings);
		void loadPericopes(settings);
	}

	function unsubscribeToSettings() {
		settingsService.unsubscribe(id);
	}

	async function loadChapter() {
		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_CHAPTER_RESOURCE_TYPE
		);

		chapter = await chapterService.get(
			source,
			bibleLocationRef
		);
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

	function onChapterNotesSearchResults(
		data: NotesSearchResult
	): void {
		notes =
			createChapterNotesByLocation(
				data.notes
			);
	}
</script>

{#snippet versesView()}
	{#each versesNumbersToShow as k, idx}
		<span class="whitespace-normal" id={`${id}-vno-${idx + 1}`}>
			<Verse
				bind:textMarkup
				bind:paragraphs
				bind:pericopes
				bind:notes
				bind:mode
				{footnotes}
				verse={chapter?.verses[k] as VerseModel}
				{bibleLocationRef}
				{bibleVersion}
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
