<!-- @component
Renders the Bible Reader header and owns Reader-level navigation actions such as
book/chapter selection, overflow actions, and entering/exiting Text Markup edit mode.
-->
<script lang="ts">
	import {
		KJVBackButton,
		KJVMoreActionsButton
	} from '$lib/application/ui';

	// SVELTE
	import { onDestroy, onMount, untrack } from 'svelte';

	// COMPONENTS
	import { KJVAdaptiveHeaderTitle, KJVHeader } from '$lib/components';

	// MODELS
	import {
		BIBLE_MODES,
		type BibleMode
	} from '../../models/bible.model';
	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';
	import type { Settings as AppSettings } from '$lib/application';

	// SERVICES
	import {
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '../../resources/booknames/bible-booknames-resource';
	import { BIBLE_TEXT_MARKUP_RESOURCE_TYPE } from '../../resources/text-markup/bible-text-markup-resource';

	// OTHER
	import uuid4 from 'uuid4';
	import { extractBibleVersion } from '../../utils/bible-identity';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		settingsService,
		bibleLocationReferenceService,
		toastService
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	interface Props {
		/** Mutable Reader interaction mode shared with the chapter/edit toolbar. */
		mode: BibleMode;
		/** Active canonical Bible location displayed by this Reader. */
		bibleLocationRef: string;
		/** Canonical Bible version ID selected for this Reader. */
		bibleVersion: string;
		/** Saves the current Text Markup draft and returns to reading mode. */
		onExitEdit: () => Promise<void>;
	}

	let {
		mode = $bindable(),
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		onExitEdit
	}: Props = $props();

	// ================================== VARS =================================

	const id = uuid4();
	let fullBookName = $state('');
	let shortBookName = $state('');
	let bookChapter = $state(0);
	let showBibleVersion = $state(false);

	let longTitle = $derived(
		fullBookName && bookChapter
			? `${fullBookName} ${bookChapter}`
			: 'Bible'
	);
	let shortTitle = $derived(
		shortBookName && bookChapter
			? `${shortBookName} ${bookChapter}`
			: longTitle
	);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		subscribeToSettings();
	});

	onDestroy(() => {
		unsubscribeToSettings();
	});

	$effect(() => {
		bibleLocationRef;
		untrack(() => {
			void setBookNameAndChapter();
		});
	});

	// ================================ FUNCS ==================================

	/**
	 * Resolves long/short book names for the current Reader location.
	 *
	 * The captured location is checked after the async resource read so a stale
	 * response cannot overwrite a header that already navigated elsewhere.
	 */
	async function setBookNameAndChapter(): Promise<void> {
		const locationRef = bibleLocationRef;

		const bookID =
			bibleLocationReferenceService.extractBookID(
				locationRef
			);

		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_BOOKNAMES_RESOURCE_TYPE
		);

		const booknames = await bibleBooknamesService.get(source);

		if (bibleLocationRef !== locationRef) {
			return;
		}

		fullBookName =
			booknames.booknamesById[bookID] ??
			booknames.shortNames[bookID] ??
			'';
		shortBookName =
			booknames.shortNames[bookID] ??
			fullBookName;
		bookChapter =
			bibleLocationReferenceService.extractChapter(
				locationRef
			);
	}

	function subscribeToSettings(): void {
		settingsService.subscribe(
			id,
			onSettingsChange
		);
		onSettingsChange(
			settingsService.getSettings()
		);
	}

	function unsubscribeToSettings(): void {
		settingsService.unsubscribe(id);
	}

	function onSettingsChange(
		settings: AppSettings
	): void {
		showBibleVersion = settings.showBibleVersion;
	}

	/** Returns whether this Reader has a Text Markup resource selection available. */
	function hasTextMarkupSelection(): boolean {
		return moduleResourceSelectionResolver.find(
			navigationState,
			BIBLE_TEXT_MARKUP_RESOURCE_TYPE
		) !== undefined;
	}

	// ============================== CLICK FUNCS ==============================

	/**
	 * Opens the appropriate location picker for the Reader context.
	 *
	 * Reading-plan Readers open their plan-reading navigator; ordinary Readers
	 * open the normal book/chapter/verse selector.
	 */
	function onBookChapterClick(): void {
		if (mode.navReadings) {
			navigation.pushView(
				BIBLE_VIEWS.NAV_READINGS,
				{
					navReadings: mode.navReadings
				}
			);
			return;
		}

		navigation.pushView(
			BIBLE_VIEWS.BOOK_CHAPTER_VERSE_BOOK,
			{}
		);
	}

	/** Opens Reader overflow actions as a child navigation view. */
	function onOverflowClick(): void {
		navigation.pushView(
			BIBLE_VIEWS.OVERFLOW_ACTIONS,
			{}
		);
	}

	/**
	 * Toggles Bible Text Markup editing from the header.
	 *
	 * Entering edit mode snapshots the current exact Reader location into the
	 * edit mode. Exiting delegates to the Reader container so the draft is saved.
	 */
	function onEditClick(): void {
		if (mode.value === BIBLE_MODES.EDIT) {
			void onExitEdit();
			return;
		}

		if (!hasTextMarkupSelection()) {
			toastService.showToast('Login first');
			return;
		}

		const bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(
				bibleLocationRef
			);
		const verseNumber =
			bibleLocationReferenceService.extractVerse(
				bibleLocationRef
			);
		const wordIdx =
			bibleLocationReferenceService.extractWordIndexOrDefault(
				bibleLocationRef
			);

		mode.bibleLocationRef =
			`${bookIDChapter}_${verseNumber}_${wordIdx}`;
		mode.bibleVersion = bibleVersion;
		mode.value = BIBLE_MODES.EDIT;
	}
</script>

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		{longTitle}
		shortTitle={shortTitle}
		secondary={showBibleVersion
			? extractBibleVersion(bibleVersion).toUpperCase()
			: undefined}
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet trailingContent()}
	<KJVMoreActionsButton onClick={onOverflowClick}></KJVMoreActionsButton>
{/snippet}

<KJVHeader
	title="Bible"
	{leadingContent}
	titleAction={{
		label: mode.navReadings
			? 'Show plan readings'
			: 'Choose Bible book, chapter, and verse',
		onClick: onBookChapterClick
	}}
	{titleContent}
	{trailingContent}
	actions={[
		{
			icon:
				mode.value === BIBLE_MODES.EDIT
					? 'edit-off'
					: 'edit',
			label:
				mode.value === BIBLE_MODES.EDIT
					? 'Exit edit mode'
					: 'Edit',
			onClick: onEditClick
		}
	]}
></KJVHeader>
