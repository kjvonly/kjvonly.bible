<!-- @component
Owns the Bible chapter interaction surface: resource loading, visible verse range,
Reader click routing, Text Markup click/drag mutation, inline Note navigation, and
Add Note/Bookmark location selection. Persistence remains owned by the Reader container.
-->
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
	import {
		applyBibleTextMarkupWord,
		removeBibleTextMarkupWord,
		toggleBibleTextMarkupVerse,
		toggleBibleTextMarkupWord
	} from './text-markup-edit';
	import {
		bibleTextMarkupDrag,
		type BibleTextMarkupDragTarget
	} from './interactions/bible-text-markup-drag';
	import {
		BIBLE_CHAPTER_CLICK_INTENTS,
		bibleChapterClick,
		type BibleChapterClickTarget
	} from './interactions/bible-chapter-click';
	import {
		createBibleTokenLocationRef
	} from './interactions/bible-token-location';
	import { getBibleBookmarkVersePreview } from './interactions/bible-bookmark-verse-preview';

	import {
		BIBLE_READER_EDIT_INTENTS,
		useBibleReaderEditContext
	} from '../runtime/bible-reader-edit-context';

	// SERVICES
	// OTHER
	import uuid4 from 'uuid4';
	import { scrollTo, scrollToTop } from '$lib/application/ui';
	import type { Settings as AppSettings } from '$lib/application';

	// APPLICATION CONTEXT
	import {
		Modules,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE
	} from '../../../resources/chapters/bible-chapter-resource';

	import {
		BIBLE_PARAGRAPHS_RESOURCE_TYPE
	} from '../../../resources/paragraphs/bible-paragraphs-resource';

	import {
		BIBLE_PERICOPES_RESOURCE_TYPE
	} from '../../../resources/pericopes/bible-pericopes-resource';

	import {
		BIBLE_TEXT_MARKUP_RESOURCE_TYPE
	} from '../../../resources/text-markup/bible-text-markup-resource';

	import {
		REFS_VIEWS
	} from '../../../models/refs-navigation.model';

	import {
		NOTES_BIBLE_SCOPE_KINDS,
		NOTES_COLLECTION_CHANGED,
		NOTES_VIEWS,
		type NotesSearchResult
	} from '$lib/domains/notes';
	import {
		BOOKMARKS_VIEWS,
		type ChapterBookmarksByLocation
	} from '$lib/domains/bookmarks';
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
		bookmarksService,
		moduleResourceSelectionResolver,
		settingsService,
		bibleLocationReferenceService,
		bibleVerseReferenceService
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	const { navigation } =
		useNavigationRuntimeContext();

	const readerEdit =
		useBibleReaderEditContext();

	// =============================== BINDINGS ================================

	interface Props {
		/** Active canonical Bible location rendered by this chapter surface. */
		bibleLocationRef: string;
		/** Canonical Bible version ID used for chapter content/resource lookup. */
		bibleVersion: string;
		/** Reader instance ID used to scope subscriptions and DOM anchors. */
		id: string;
		/** Mutable Reader mode used to route reading/edit interactions. */
		mode: BibleMode;
		/** Mutable in-memory Text Markup draft for the active chapter. */
		textMarkup: BibleTextMarkup;
	}

	let {
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		id = $bindable<string>(),
		mode = $bindable<BibleMode>(),
		textMarkup = $bindable<BibleTextMarkup>()
	}: Props = $props();

	// ================================= VARS ==================================

	let noteLocationSelectionActive =
		$derived(readerEdit.intent === BIBLE_READER_EDIT_INTENTS.NOTE_LOCATION);
	let bookmarkLocationSelectionActive =
		$derived(readerEdit.intent === BIBLE_READER_EDIT_INTENTS.BOOKMARK_LOCATION);
	let bookmarkRelocationLocationSelectionActive =
		$derived(readerEdit.intent === BIBLE_READER_EDIT_INTENTS.BOOKMARK_RELOCATION_LOCATION);

	let notesID = uuid4();

	let footnotes: { [key: string]: string } = $state({});
	let hasVerseRange: boolean = $state(false);

	let notes: ChapterNotesByLocation = $state({});
	let bookmarks: ChapterBookmarksByLocation = $state({});
	let unsubscribeBookmarks: (() => void) | undefined;

	let verseRangeStartIndex: number = 0;
	let verseRangeEndIndex: number = 0;

	let chapter: Chapter | undefined = $state();
	let paragraphs: BibleParagraphMap = $state({});
	let pericopes: BiblePericopeMap = $state({});
	let currentSettings: AppSettings = settingsService.getSettings();

	/**
	 * Forces the verse subtree to remount when the chapter changes so rendered
	 * Text Markup/paragraph/pericope state cannot leak from the previous chapter.
	 */
	let toggleVersesView: boolean = $state(true);
	let verses: { [verseNumber: string]: VerseModel } = $state({});
	let versesNumbersToShow: string[] = $state([]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		subscribeToNotes();
		subscribeToBookmarks();
		subscribeToSettings();
	});

	onDestroy(() => {
		unsubscribeFromTextMarkup();
		unsubscribeToNotes();
		unsubscribeToBookmarks();
		unsubscribeToSettings();
	});

	/**
	 * Rebuilds all chapter-local state when the Reader location/version changes.
	 *
	 * Resets happen before async loads start so the new location cannot briefly
	 * render Text Markup, paragraphs, pericopes, or Notes from the previous chapter.
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
			resetBookmarks();
			toggleVersesViewFn();
			setVerseRanges();
			scrollToVerse();
			loadTextMarkup();
			void loadParagraphs(currentSettings);
			void loadPericopes(currentSettings);
			void loadBookmarks();
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

	/** Recreates an empty/current-source Text Markup draft for the active chapter. */
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

	function resetBookmarks() {
		bookmarks = {};
	}

	/** Resolves the optional verse-range window encoded in the Reader location. */
	function setVerseRanges() {
		let [start, end] =
			bibleLocationReferenceService.extractVersesOrOne(bibleLocationRef);
		hasVerseRange = start + end > 0;
		verseRangeStartIndex = start;
		verseRangeEndIndex = end;
	}

	/** Scrolls to the selected verse when present, otherwise restores chapter top. */
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

	/** Subscribes this Reader instance to updates for the installed markup object. */
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

	/**
	 * Replaces the mutable local draft from an external Text Markup store update.
	 *
	 * @param updated - Latest installed Text Markup value for this chapter.
	 */
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

	/**
	 * Loads the installed Text Markup for the active chapter and subscribes to it.
	 * Falls back to an empty draft when no Text Markup resource is selected.
	 */
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

	/**
	 * Loads paragraph presentation for the active location when enabled.
	 * Stale async results are discarded if settings/location change mid-request.
	 *
	 * @param settings - Settings snapshot that triggered the load.
	 */
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

	/**
	 * Loads pericope presentation for the active location when enabled.
	 * Stale async results are discarded if settings/location change mid-request.
	 *
	 * @param settings - Settings snapshot that triggered the load.
	 */
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

	/** Requests the chapter-scoped Note index used to render inline Note affordances. */
	function loadNotes() {
		notesService.searchNotes(
			notesID,
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef),
			['bookChapter']
		);
	}

	function subscribeToBookmarks(): void {
		unsubscribeBookmarks = bookmarksService.subscribe(() => void loadBookmarks());
	}

	function unsubscribeToBookmarks(): void {
		unsubscribeBookmarks?.();
		unsubscribeBookmarks = undefined;
	}

	/** Loads the chapter's exact-location Bookmark indicators through the Bookmarks Domain. */
	async function loadBookmarks(): Promise<void> {
		const locationRef = bibleLocationRef;
		try {
			const installed = await bookmarksService.getChapterBookmarksByLocation(locationRef);
			if (bibleLocationRef === locationRef) {
				bookmarks = installed;
			}
		} catch (error) {
			if (bibleLocationRef === locationRef) {
				console.error('Failed to load Bible Bookmarks', error);
			}
		}
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

	/** Loads the active Bible chapter resource and rebuilds the visible verse list. */
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

	/** Projects the loaded chapter into the full or requested verse-range window. */
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

	/**
	 * Converts Notes search results into the exact-location lookup consumed by Word.
	 *
	 * @param data - Chapter-scoped Notes search result.
	 */
	function onChapterNotesSearchResults(
		data: NotesSearchResult
	): void {
		notes =
			createChapterNotesByLocation(
				data.notes
			);
	}

	/**
	 * Handles one delegated reading-mode reference/verse token click.
	 *
	 * Returns whether the token belongs to the Reader's reading interaction contract;
	 * the click router consumes only handled tokens.
	 *
	 * @param target - Semantic Bible token identity resolved from the chapter DOM.
	 * @returns True when reading navigation handled the token.
	 */
	function activateReadingToken(
		target: BibleChapterClickTarget
	): boolean {
		const selectedVerse =
			verses[String(target.verseNumber)];
		const selectedWord =
			selectedVerse?.words[target.wordIndex];

		if (
			!selectedVerse ||
			!selectedWord ||
			!isReadingInteractiveWord(selectedWord.class)
		) {
			return false;
		}

		const bookIDChapter =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);
		const verseBibleLocationRef =
			`${bibleLocationReferenceService
				.extractVersionBookIDChapter(
					bibleLocationRef
				)}_${target.verseNumber}`;

		mode.bibleLocationRef =
			`${bookIDChapter}_${target.verseNumber}_${target.wordIndex}`;

		if (target.wordIndex === 0) {
			const {
				refs,
				strongsWords
			} = bibleVerseReferenceService
				.extractAll(selectedVerse);

			navigation.pushModule(
				Modules.STRONGS,
				REFS_VIEWS.ROOT,
				{
					bibleLocationRef:
						verseBibleLocationRef,
					footnotes,
					refs,
					strongsWords
				}
			);
			return true;
		}

		navigation.pushModule(
			Modules.STRONGS,
			REFS_VIEWS.ROOT,
			{
				bibleLocationRef:
					verseBibleLocationRef,
				word: selectedWord,
				footnotes
			}
		);

		return true;
	}

	/** Preserves the existing reading-mode clickable token contract. */
	function isReadingInteractiveWord(
		classes: string[] | null
	): boolean {
		return (
			classes?.includes('xref') === true ||
			classes?.includes('FOOTNO') === true ||
			classes?.includes('vno') === true
		);
	}

	/** Applies the currently selected markup family to one drag-resolved token. */
	function applyDragMarkup(
		target: BibleTextMarkupDragTarget
	): void {
		applyBibleTextMarkupWord(
			textMarkup,
			target.verseNumber,
			target.wordIndex,
			mode
		);
	}

	/** Removes only the selected markup family from one drag-resolved token. */
	function removeDragMarkup(
		target: BibleTextMarkupDragTarget
	): void {
		removeBibleTextMarkupWord(
			textMarkup,
			target.verseNumber,
			target.wordIndex,
			mode
		);
	}

	/**
	 * Toggles Text Markup for one delegated edit-mode Bible token click.
	 *
	 * A verse-number token (`wordIndex === 0`) retains whole-verse click semantics;
	 * ordinary tokens toggle only that exact word.
	 *
	 * @param target - Semantic Bible token identity resolved by the click router.
	 */
	function toggleClickedMarkup(
		target: BibleChapterClickTarget
	): void {
		const selectedVerse =
			verses[String(target.verseNumber)];

		if (!selectedVerse) {
			return;
		}

		const bookIDChapter =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		mode.bibleLocationRef =
			`${bookIDChapter}_${target.verseNumber}_${target.wordIndex}`;

		if (target.wordIndex === 0) {
			toggleBibleTextMarkupVerse(
				textMarkup,
				target.verseNumber,
				selectedVerse.words.length,
				mode
			);
			return;
		}

		toggleBibleTextMarkupWord(
			textMarkup,
			target.verseNumber,
			target.wordIndex,
			mode
		);
	}

	/**
	 * Opens existing Notes with an exact Bible scope for one inline Note affordance.
	 *
	 * @param target - Bible location represented by the clicked Note affordance.
	 */
	function openInlineNote(
		target: BibleChapterClickTarget
	): void {
		const bookIDChapter =
			bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		navigation.pushModule(
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{
				bibleScope: {
					kind: NOTES_BIBLE_SCOPE_KINDS.EXACT,
					bibleLocationRef:
						`${bookIDChapter}_${target.verseNumber}_${target.wordIndex}`
				}
			}
		);
	}

	/** Opens all Bookmarks attached to the clicked exact verse/word location. */
	function openInlineBookmark(target: BibleChapterClickTarget): void {
		const bookIDChapter = bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		navigation.pushModule(
			Modules.BOOKMARKS,
			BOOKMARKS_VIEWS.ROOT,
			{
				bibleLocationRef: `${bookIDChapter}_${target.verseNumber}_${target.wordIndex}`,
				returnBibleLocationToReader: true
			}
		);
	}

	/**
	 * Converts the selected Bible token into its canonical location and
	 * completes the Reader-scoped Note-location selection flow.
	 *
	 * @param target - Verse/word token selected while Add Note mode is active.
	 */
	function selectNoteLocation(
		target: BibleChapterClickTarget
	): void {
		const bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		void readerEdit.completeNoteLocationSelection(
			createBibleTokenLocationRef(bookIDChapter, target)
		);
	}

	/** Selects the exact Bookmark anchor and captures its containing verse text. */
	function selectBookmarkLocation(target: BibleChapterClickTarget): void {
		const previewText = getBibleBookmarkVersePreview(verses, target);
		if (!previewText) {
			console.error('Cannot bookmark a verse without loaded text');
			return;
		}
		const bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		void readerEdit.completeBookmarkLocationSelection(
			createBibleTokenLocationRef(bookIDChapter, target),
			previewText
		);
	}

	/** Destination selection shares the loaded verse preview, not the Add operation. */
	function selectBookmarkRelocationLocation(target: BibleChapterClickTarget): void {
		const previewText = getBibleBookmarkVersePreview(verses, target);
		if (!previewText) return;
		const chapterRef = bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		void readerEdit.completeBookmarkRelocationLocationSelection(
			createBibleTokenLocationRef(chapterRef, target), previewText
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
				{bookmarks}
				verse={chapter?.verses[k] as VerseModel}
				{bibleLocationRef}
			></Verse>
		</span>
	{/each}
{/snippet}

<div
	use:bibleTextMarkupDrag={{
		enabled:
			mode.value === BIBLE_MODES.EDIT &&
			!noteLocationSelectionActive &&
			!bookmarkLocationSelectionActive &&
			!bookmarkRelocationLocationSelectionActive,
		onApply: applyDragMarkup,
		onRemove: removeDragMarkup
	}}
	use:bibleChapterClick={{
		intent: noteLocationSelectionActive
			? BIBLE_CHAPTER_CLICK_INTENTS.NOTE_LOCATION
			: bookmarkLocationSelectionActive
				? BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_LOCATION
			: bookmarkRelocationLocationSelectionActive
				? BIBLE_CHAPTER_CLICK_INTENTS.BOOKMARK_RELOCATION_LOCATION
			: mode.value === BIBLE_MODES.EDIT
				? BIBLE_CHAPTER_CLICK_INTENTS.TEXT_MARKUP
				: BIBLE_CHAPTER_CLICK_INTENTS.READING,
		onReadingActivate: activateReadingToken,
		onTextMarkupToggle: toggleClickedMarkup,
		onNoteLocationSelect: selectNoteLocation,
		onBookmarkLocationSelect: selectBookmarkLocation,
		onBookmarkRelocationLocationSelect: selectBookmarkRelocationLocation,
		onOpenNote: openInlineNote,
		onOpenBookmark: openInlineBookmark
	}}
	class="px-4 leading-loose"
	class:touch-pan-y={mode.value === BIBLE_MODES.EDIT}
>
	{#if toggleVersesView}
		{@render versesView()}
	{:else}
		{@render versesView()}
	{/if}
	<div class="mt-18"></div>
</div>
