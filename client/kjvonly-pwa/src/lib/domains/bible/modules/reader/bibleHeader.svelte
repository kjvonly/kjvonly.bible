<script lang="ts">
	// SVELTE
	import { onDestroy, onMount, untrack } from 'svelte';

	// COMPONENTS
	import Edit from '$lib/components/svgs/edit.svelte';
	import EditOff from '$lib/components/svgs/editOff.svelte';

	// // TOOLBAR
	import Close from '$lib/components/svgs/close.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';
	import SettingsIcon from '$lib/components/svgs/settings.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Menu from '$lib/components/svgs/menu.svelte';
	import Search from '$lib/components/svgs/search.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		ToolbarItems,
		type BibleMode
	} from '../../models/bible.model';
	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';
	import {
		Modules,
		SETTINGS_VIEWS
	} from '$lib/application';
	import { SEARCH_VIEWS } from '../../models/search-navigation.model';

	// SERVICES
	import { PaneSplit } from '$lib/application';
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

	import type { Settings as AppSettings } from '$lib/application';
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

	let id = uuid4();
	let bookName: string = $state('');
	let bookChapter: number = $state(0);
	let headerGridCols = $state(7);
	let showBibleVersion = $state(false);
	let verses: string = $state('');

	// TODO this will become dynamic option allowing users to configure their
	// toolbar to their liking
	let toolbar = [
		ToolbarItems.EDIT,
		ToolbarItems.SETTINGS,
		ToolbarItems.Copy,
		ToolbarItems.BOOK_CHAPTER_VERSE,
		ToolbarItems.SEARCH,
		ToolbarItems.MENU,
		ToolbarItems.Close
	];

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
			setVerses();
		});
	});

	// ================================ FUNCS ==================================

	async function setBookNameAndChapter(): Promise<void> {
		const locationRef = bibleLocationRef;

		const bookID = bibleLocationReferenceService.extractBookID(locationRef);

		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_BOOKNAMES_RESOURCE_TYPE
		);

		const booknames = await bibleBooknamesService.get(source);

		if (bibleLocationRef !== locationRef) {
			return;
		}

		bookName = booknames.shortNames[bookID] ?? '';

		bookChapter = bibleLocationReferenceService.extractChapter(locationRef);
	}

	function setVerses() {
		let [start, end] =
			bibleLocationReferenceService.extractVersesOrOne(bibleLocationRef);
		if (start + end > 0) {
			verses = `:${start + 1}-${end}`;
		} else {
			verses = '';
		}
	}

	function subscribeToSettings() {
		settingsService.subscribe(id, onSettingsChange);
		onSettingsChange(settingsService.getSettings());
	}

	function unsubscribeToSettings() {
		settingsService.unsubscribe(id);
	}

	function onSettingsChange(settings: AppSettings) {
		showBibleVersion = settings.showBibleVersion;
	}

	// ============================== CLICK FUNCS ==============================

	function onBookChapterClick(event: Event): void {
		event.stopPropagation();

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
			BIBLE_VIEWS.BOOK_CHAPTER_VERSE,
			{}
		);
	}

	function onSettingsClick(event: Event): void {
		event.stopPropagation();

		navigation.pushModule(
			Modules.SETTINGS,
			SETTINGS_VIEWS.ROOT,
			{}
		);
	}

	function onMenuClick(e: Event): void {
		e.stopPropagation();

		navigation.pushView(
			BIBLE_VIEWS.MENU,
			{
				bibleLocationRef
			}
		);
	}

	function hasTextMarkupSelection(): boolean {
		return moduleResourceSelectionResolver.find(
			navigationState,
			BIBLE_TEXT_MARKUP_RESOURCE_TYPE
		) !== undefined;
	}

	function onEditClick(e: Event): void {
		e.stopPropagation();

		if (mode.value === BIBLE_MODES.EDIT) {
			void onExitEdit();
			return;
		}

		if (!hasTextMarkupSelection()) {
			toastService.showToast('Login first');
			return;
		}
		let bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		let verseNumber =
			bibleLocationReferenceService.extractVerse(bibleLocationRef);
		let wordIdx =
			bibleLocationReferenceService.extractWordIndexOrDefault(bibleLocationRef);
		mode.bibleLocationRef = `${bookIDChapter}_${verseNumber}_${wordIdx}`;
		mode.bibleVersion = bibleVersion;
		mode.value = BIBLE_MODES.EDIT;
	}

	function onCloseClick(): void {
		navigation.back();
	}

	function onSearchClick(): void {
		navigation.split(
			PaneSplit.HORIZONTAL,
			Modules.SEARCH,
			SEARCH_VIEWS.RESULTS,
			{}
		);
	}

	function onCopyClick(): void {
		navigation.pushView(
			BIBLE_VIEWS.COPY_VERSE,
			{
				bibleLocationRef
			}
		);
	}
</script>

<!-- =============================== TOOLBAR =============================== -->

{#snippet bookChapterVerseButton()}
	<button onclick={onBookChapterClick} class=" text-center text-neutral-700">
		<span class="kjvonly-noselect whitespace-wrap text-center">
			{#if bookName && bookChapter}
				{#if showBibleVersion}{extractBibleVersion(
						bibleVersion
					).toUpperCase()}<br />{/if}
				{bookName}
				{bookChapter}{verses}
			{/if}
		</span>
	</button>
{/snippet}

{#snippet closeButton()}
	<KJVButton onClick={onCloseClick} classes="">
		<Close classes=""></Close>
	</KJVButton>
{/snippet}

{#snippet copyButton()}
	<KJVButton onClick={onCopyClick} classes="">
		<Copy classes=""></Copy>
	</KJVButton>
{/snippet}

{#snippet editButton()}
	<KJVButton onClick={onEditClick} classes="">
		{#if mode.value === BIBLE_MODES.EDIT}
			<EditOff classes=""></EditOff>
		{:else}
			<Edit classes=""></Edit>
		{/if}
	</KJVButton>
{/snippet}

{#snippet menuButton()}
	<KJVButton onClick={onMenuClick} classes="">
		<Menu classes=""></Menu>
	</KJVButton>
{/snippet}

{#snippet searchButton()}
	<KJVButton onClick={onSearchClick} classes="">
		<Search classes=""></Search>
	</KJVButton>
{/snippet}

{#snippet settingsButton()}
	<KJVButton classes="" onClick={onSettingsClick}>
		<SettingsIcon classes=""></SettingsIcon>
	</KJVButton>
{/snippet}

{#snippet header()}
	<div
		class="w-full bg-neutral-100 py-2 leading-tight"
	>
		<span
			class="grid {'grid-cols-' +
				headerGridCols} w-full place-items-center bg-neutral-100 text-neutral-700"
		>
			{#each toolbar as item}
				{#if item === ToolbarItems.EDIT}
					{@render editButton()}
				{/if}
				{#if item === ToolbarItems.Copy}
					{@render copyButton()}
				{/if}
				{#if item === ToolbarItems.SETTINGS}
					{@render settingsButton()}
				{/if}
				{#if item === ToolbarItems.BOOK_CHAPTER_VERSE}
					{@render bookChapterVerseButton()}
				{/if}
				{#if item === ToolbarItems.SEARCH}
					{@render searchButton()}
				{/if}
				{#if item === ToolbarItems.MENU}
					{@render menuButton()}
				{/if}
				{#if item === ToolbarItems.Close}
					{@render closeButton()}
				{/if}
			{/each}
		</span>
	</div>
{/snippet}

{@render header()}

<span class="hidden grid-cols-7"></span>
