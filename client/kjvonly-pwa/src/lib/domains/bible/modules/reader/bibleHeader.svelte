<script lang="ts">
	import {
		KJVBackButton
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

	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '../../resources/booknames/bible-booknames-interpreter';
	import { BIBLE_TEXT_MARKUP_RESOURCE_TYPE } from '../../resources/text-markup/bible-text-markup-interpreter';

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

	let {
		mode = $bindable(),
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		onExitEdit
	}: {
		mode: BibleMode;
		bibleLocationRef: string;
		bibleVersion: string;
		onExitEdit: () => Promise<void>;
	} = $props();

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

	function hasTextMarkupSelection(): boolean {
		return moduleResourceSelectionResolver.find(
			navigationState,
			BIBLE_TEXT_MARKUP_RESOURCE_TYPE
		) !== undefined;
	}

	// ============================== CLICK FUNCS ==============================

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

	function onOverflowClick(): void {
		navigation.pushView(
			BIBLE_VIEWS.OVERFLOW_ACTIONS,
			{}
		);
	}

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
		},
		{
			icon: 'more-vertical',
			label: 'More actions',
			onClick: onOverflowClick
		}
	]}
></KJVHeader>
