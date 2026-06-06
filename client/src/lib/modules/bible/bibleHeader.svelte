<script lang="ts">
	// SVELTE
	import { onDestroy, onMount, untrack } from 'svelte';

	// COMPONENTS
	import BibleMenuPopup from './popups/bibleMenuPopup.svelte';
	import BookChapterPopup from './popups/bookChapterVersePopup/bookChapterPopup.svelte';
	import CopyVersePopup from './popups/copyVersePopup.svelte';
	import NavReadingsList from './plans/navReadingsList.svelte';
	import Notes from '../notes/notes.svelte';
	import Settings from '../settings/settings.svelte';
	import Edit from '$lib/components/svgs/edit.svelte';
	import BibleVersionPopup from './popups/bibleVersionPopup.svelte';

	// // TOOLBAR
	import Close from '$lib/components/svgs/close.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';
	import SettingsIcon from '$lib/components/svgs/settings.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Menu from '$lib/components/svgs/menu.svelte';
	import PopupContainer from './popups/popupContainer.svelte';
	import Search from '$lib/components/svgs/search.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		ToolbarItems,
		type BibleMode
	} from '$lib/models/bible.model';
	import { Modules } from '$lib/models/modules.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
	import { shortBookNamesByIDService } from '$lib/services/bibleMetadata/shortBookNamesByID.service';
	import { settingsService } from '$lib/services/settings.service';
	import { paneService } from '$lib/services/pane.service.svelte';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================

	let {
		mode = $bindable(),
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		clientHeight = $bindable<number>(),
		headerHeight = $bindable<number>(),
		paneID
	}: {
		mode: BibleMode;
		bibleLocationRef: string;
		bibleVersion: string;
		clientHeight: number;
		headerHeight: number;
		paneID: string;
	} = $props();

	// ================================== VARS =================================

	let id = uuid4();
	let bookName: string = $state('');
	let bookChapter: number = $state(0);
	let headerGridCols = $state(7);
	let showBibleVersion = $state(false);
	let verses: string = $state('');

	let showBookChapterPopup: boolean = $state(false);
	let showNavReadingsPopup: boolean = $state(false);
	let showSettingsPopup: boolean = $state(false);
	let showMenuPopup: boolean = $state(false);
	let showCopyVersesPopup: boolean = $state(false);
	let showBibleVersionPopup: boolean = $state(false);

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
		setBookNameAndChapter();
		subscribeToSettings();
	});

	onDestroy(() => {
		unsubscribeToSettings();
	});

	$effect(() => {
		bibleLocationRef;
		untrack(() => {
			setBookNameAndChapter();
			setVerses();
		});
	});

	// ================================ FUNCS ==================================

	function setBookNameAndChapter() {
		let bookID = bibleLocationReferenceService.extractBookID(bibleLocationRef);
		bookName = shortBookNamesByIDService.get(bookID);
		bookChapter =
			bibleLocationReferenceService.extractChapter(bibleLocationRef);
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
		onSettingsChange();
	}

	function unsubscribeToSettings() {
		settingsService.unsubscribe(id);
	}

	function onSettingsChange() {
		showBibleVersion = settingsService.getSettings().showBibleVersion || false;
	}

	// ============================== CLICK FUNCS ==============================

	function onBookChapterClick(event: Event) {
		event.stopPropagation();
		if (mode.navReadings) {
			showNavReadingsPopup = !showNavReadingsPopup;
		} else {
			showBookChapterPopup = !showBookChapterPopup;
		}
	}

	function onSettingsClick(event: Event) {
		event.stopPropagation();
		showSettingsPopup = !showSettingsPopup;
	}

	function onMenuClick(e: Event) {
		e.stopPropagation();
		showMenuPopup = !showMenuPopup;
	}

	function onEditClick(e: Event): void {
		e.stopPropagation();
		if (mode.value === BIBLE_MODES.EDIT) {
			mode.value = BIBLE_MODES.READING;
			return;
		}
		let bookIDChapter =
			bibleLocationReferenceService.extractBookIDChapter(bibleLocationRef);
		let verseNumber =
			bibleLocationReferenceService.extractVerse(bibleLocationRef);
		let wordIdx =
			bibleLocationReferenceService.extractWordIndexOrDefault(bibleLocationRef);
		mode.bibleLocationRef = `${bookIDChapter}_${verseNumber}_${wordIdx}`;
		mode.value = BIBLE_MODES.EDIT;
	}

	function onCloseClick() {
		paneService.onDeletePane(paneService.rootPane, paneID);
	}

	function onSearchClick() {
		paneService.onSplitPane(paneID, 'h', Modules.SEARCH, {
			bibleVersion: bibleVersion
		});
	}

	function onCopyClick() {
		showCopyVersesPopup = true;
	}
</script>

<!-- =============================== TOOLBAR =============================== -->

{#snippet bookChapterVerseButton()}
	<button onclick={onBookChapterClick} class=" text-center text-neutral-700">
		<span class="kjvonly-noselect text-center whitespace-nowrap">
			{#if bookName && bookChapter}
				{#if showBibleVersion}{bibleVersion?.toUpperCase()}/{/if}{bookName}
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
		<Edit classes=""></Edit>
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
		class="w-full bg-neutral-100 py-2 leading-tight outline outline-neutral-400"
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

<!-- =============================== POPUPS ================================ -->

{#snippet bookChapterPopup()}
	{#if showBookChapterPopup}
		<PopupContainer bind:clientHeight>
			<BookChapterPopup bind:showBookChapterPopup bind:bibleLocationRef
			></BookChapterPopup>
		</PopupContainer>
	{/if}
{/snippet}

{#snippet navReadingsPopup()}
	{#if showNavReadingsPopup}
		<PopupContainer bind:clientHeight>
			<NavReadingsList
				bind:showNavReadingsPopup
				bind:navReadings={mode.navReadings}
				bind:bibleLocationRef
			></NavReadingsList>
		</PopupContainer>
	{/if}
{/snippet}

{#snippet settingsPopup()}
	{#if showSettingsPopup}
		<PopupContainer bind:clientHeight>
			<Settings
				onClose={() => {
					showSettingsPopup = false;
				}}
			></Settings>
		</PopupContainer>
	{/if}
{/snippet}

{#snippet actionsPopup()}
	{#if showMenuPopup}
		<PopupContainer bind:clientHeight>
			<BibleMenuPopup
				{paneID}
				bind:showCopyVersesPopup
				bind:showMenuPopup
				bind:showBibleVersionPopup
			></BibleMenuPopup>
		</PopupContainer>
	{/if}
{/snippet}

{#snippet bibleVersionPopup()}
	{#if showBibleVersionPopup}
		<PopupContainer bind:clientHeight>
			<BibleVersionPopup bind:bibleVersion bind:showBibleVersionPopup
			></BibleVersionPopup>
		</PopupContainer>
	{/if}
{/snippet}

{#snippet notePopup()}
	{#if mode.notePopup.show}
		<PopupContainer bind:clientHeight>
			<Notes bind:mode allNotes={false}></Notes>
		</PopupContainer>
	{/if}
{/snippet}

{#snippet copyVersePopup()}
	{#if showCopyVersesPopup}
		<PopupContainer bind:clientHeight>
			<CopyVersePopup
				{paneID}
				bind:showCopyVersePopup={showCopyVersesPopup}
				bind:bibleLocationRef
				bind:bibleVersion
			></CopyVersePopup>
		</PopupContainer>
	{/if}
{/snippet}

<!-- =========================== POPUP CONTAINER =========================== -->

{@render header()}
{@render bookChapterPopup()}
{@render navReadingsPopup()}
{@render settingsPopup()}
{@render actionsPopup()}
{@render bibleVersionPopup()}
{@render notePopup()}
{@render copyVersePopup()}

<span class="hidden grid-cols-7"></span>
