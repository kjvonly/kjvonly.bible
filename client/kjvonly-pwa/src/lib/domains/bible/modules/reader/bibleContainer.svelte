<!-- @component
Owns one Bible Reader instance: navigation state, selected Bible version/location,
Text Markup save/exit flow, Reader-scoped edit intent, and composition of the header,
chapter surface, navigation controls, and edit toolbar.
-->
<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onDestroy, onMount } from 'svelte';

	// COMPONENTS
	import { ViewBody } from '$lib/application/ui';
	import Chapter from './chapter/chapter.svelte';
	import BibleHeader from './bibleHeader.svelte';
	import ChapterNavButtons from './components/chapterNavButtons.svelte';
	import EditOptions from './chapter/editOptions.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		newBibleMode,
		type BibleMode,
		type BibleReadingNavigation
	} from '../../models/bible.model';
	import type {
		BibleTextMarkup
	} from '../../models/bible-text-markup.model';

	// SERVICES
	import {
		Modules,
		type Settings as AppSettings,
		type NavigationState,
		type NavigationStateValue,
		type NavigationViewState,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// OTHER
	import uuid4 from 'uuid4';

	import { attachEvents } from '$lib/application/ui';
	import { ViewHeader } from '$lib/application/ui';

	import type {
		PublishedResourceReference
	} from '$lib/resource';

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE,
		parseBibleChapterResourceId
	} from '../../resources/chapters/bible-chapter-resource';

	import type {
		BibleVersion
	} from '../../models/bible-version.model';


	import {
		createBibleVersionId
	} from '../../utils/bible-identity';

	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';

	import {
		handleBibleMenuNavigationResult
	} from './runtime/bible-menu-navigation-result';

	import {
		createBibleChapterResourceReference,
		handleBibleVersionNavigationResult
	} from '../components/bibleVersion';

	import {
		BIBLE_READER_EDIT_INTENTS,
		provideBibleReaderEditContext,
		type BibleReaderEditContext
	} from './runtime/bible-reader-edit-context';

	import { BOOKMARKS_VIEWS, parseBookmarkBrowseNavigationResult } from '$lib/domains/bookmarks';

	import {
		NOTES_BIBLE_SCOPE_KINDS,
		NOTES_VIEWS
	} from '$lib/domains/notes';

	const {
		moduleResourceSelectionResolver,
		bibleLocationReferenceService,
		bibleTextMarkupService,
		bookmarksService,
		toastService,
		settingsService
	} = useApplicationContext();
	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const {
		navigationState,
		onResult,
		whenActive,
		updateState,
		updateResourceSelection
	} = useNavigationEntryContext();

	validateNavState(
		navigationState
	);

	const {
		navigation
	} = useNavigationRuntimeContext();

	const unsubscribeNavigationResult =
		onResult(
			onNavigationResult
		);

	// ================================= VARS ==================================

	let textMarkup: BibleTextMarkup = $state({
		id: '',
		chapterRef: '',
		markings: {}
	});
	let bibleLocationRef: string = $state('');

	let bibleVersion:
		string =
		$state(
			getBibleVersionId(
				moduleResourceSelectionResolver.require(
					navigationState,
					BIBLE_CHAPTER_RESOURCE_TYPE
				)
			)
		);

	let headerHeight = $state(0);
	/**
	 * The header snippet renders inside the body, so this zero value keeps
	 * the body at the full Pane layout height.
	 */
	let zeroHeaderHeight = $state(0);
	let id = $state(uuid4());
	const settingsSubscriberID = `${id}-bible-scrollbar`;
	const LAST_BIBLE_LOCATION_REF = 'lastBibleLocationReference';
	const DEFAULT_BIBLE_LOCATION_REF = '52_10_9';
	let mode: BibleMode = $state(newBibleMode());

	const readerEdit =
		$state<BibleReaderEditContext>({
			intent:
				BIBLE_READER_EDIT_INTENTS.MARKUP,
			startNoteLocationSelection() {
				readerEdit.intent =
					BIBLE_READER_EDIT_INTENTS.NOTE_LOCATION;
			},
			cancelNoteLocationSelection() {
				readerEdit.intent =
					BIBLE_READER_EDIT_INTENTS.MARKUP;
			},
			completeNoteLocationSelection(
				bibleLocationRef: string
			): Promise<void> {
				return onNoteLocationSelected(bibleLocationRef);
			},
			startBookmarkLocationSelection() {
				readerEdit.intent = BIBLE_READER_EDIT_INTENTS.BOOKMARK_LOCATION;
			},
			cancelBookmarkLocationSelection() {
				readerEdit.intent = BIBLE_READER_EDIT_INTENTS.MARKUP;
			},
			completeBookmarkLocationSelection(selectedBibleLocationRef: string, previewText: string) {
				return onBookmarkLocationSelected(selectedBibleLocationRef, previewText);
			},
			startBookmarkRelocationLocationSelection() {
				readerEdit.intent = BIBLE_READER_EDIT_INTENTS.BOOKMARK_RELOCATION_LOCATION;
			},
			cancelBookmarkRelocationLocationSelection() {
				readerEdit.intent = BIBLE_READER_EDIT_INTENTS.MARKUP;
			},
			completeBookmarkRelocationLocationSelection(selectedBibleLocationRef: string, previewText: string) {
				return onBookmarkRelocationDestinationSelected(selectedBibleLocationRef, previewText);
			}
		});

	provideBibleReaderEditContext(
		readerEdit
	);

	// DOM related vars
	let showNavButtons = $state(true);
	let showBibleScrollbar = $state(
		settingsService.getSettings().showBibleScrollbar
	);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		setNavReadings();
		setBibleLocationRef();
		subscribeToSettings();
		overrideContextMenu();
	});

	onDestroy(() => {
		unsubscribeNavigationResult();
		settingsService.unsubscribe(
			settingsSubscriberID
		);
	});

	$effect(() => {
		bibleLocationRef;
		onBibleLocationRefChanged();
	});

	// ================================ FUNCS ==================================

	/**
	 * Routes child-view results back into this Reader instance.
	 *
	 * Handles Reader menu actions, explicit Bible-location selections, Bible
	 * version changes, and reading-plan navigation results. Unrelated result
	 * payloads are intentionally ignored.
	 *
	 * @param result - Result returned by a child navigation entry.
	 */
	async function onNavigationResult(
		result: NavigationStateValue
	): Promise<void> {
		if (!isRecord(result)) {
			return;
		}

		if (
			handleBibleMenuNavigationResult(
				result,
				{
					bibleLocationRef,
					navigation,
					whenActive
				}
			)
		) {
			return;
		}

		const browseResult = parseBookmarkBrowseNavigationResult(result);
		if (browseResult) {
			whenActive(() => {
				bibleLocationRef = browseResult.bibleLocationRef;
			});
			return;
		}

		if (
			result.type === 'bible-location' &&
			typeof result.bibleLocationRef === 'string'
		) {
			bibleLocationRef = result.bibleLocationRef;
			return;
		}

		if (
			handleBibleVersionNavigationResult(
				result,
				{
					whenActive,
					onVersionSelected:
						onBibleVersionSelected
				}
			)
		) {
			return;
		}

		if (
			result.type === 'bible-nav-reading' &&
			typeof result.index === 'number' &&
			typeof result.bibleLocationRef === 'string' &&
			mode.navReadings
		) {
			mode.navReadings.currentNavReadingsIndex =
				result.index;
			updateState(
				'navReadings',
				mode.navReadings as unknown as NavigationStateValue
			);
			bibleLocationRef = result.bibleLocationRef;
		}
	}

	/** Hydrates optional reading-plan navigation context from persisted view state. */
	function setNavReadings(): void {
		mode.navReadings =
			navigationState.state
				.navReadings;
	}

	
	/**
	 * Derives the active Bible version identity from the selected chapter resource.
	 *
	 * The Reader selection must point at a version-level Bible Chapter Resource,
	 * not a chapter-specific resource identity.
	 *
	 * @param source - Selected Bible Chapter Resource reference.
	 * @returns Canonical Bible version ID used by Reader services.
	 */
	function getBibleVersionId(
		source: PublishedResourceReference
	): string {
		const identity =
			parseBibleChapterResourceId(
				source.resourceId
			);

		if (
			identity.chapterRef !==
				undefined
		) {
			throw new Error(
				`Invalid Bible Chapter Resource selection: ${source.resourceId}`
			);
		}

		return createBibleVersionId(
			source.publisher,
			identity.bibleId
		);
	}

	/**
	 * Initializes the Reader location from navigation state, then persisted local
	 * Reader history, and finally the development/default fallback.
	 */
	function setBibleLocationRef(): void {
		const ref =
			navigationState.state
				.bibleLocationRef;

		if (typeof ref === 'string' && ref) {
			bibleLocationRef = ref;
			return;
		}

		setToLastBibleLocationRef();
	}

	/** Restores the most recent Reader location, normalized to chapter scope. */
	function setToLastBibleLocationRef() {
		let ref = localStorage.getItem(LAST_BIBLE_LOCATION_REF);
		if (!ref) {
			setDefaultBibleLocationRef();
			return;
		}
		bibleLocationRef = bibleLocationReferenceService.extractBookIDChapter(ref);
	}

	/** Uses the Reader fallback location when no navigation/history location exists. */
	function setDefaultBibleLocationRef() {
		bibleLocationRef = DEFAULT_BIBLE_LOCATION_REF;
	}

	/** Suppresses the browser context menu on the chapter interaction surface. */
	function overrideContextMenu() {
		attachEvents(`chapter-container-${id}`, 'contextmenu', (e) =>
			e.preventDefault()
		);
	}

	function subscribeToSettings(): void {
		settingsService.subscribe(
			settingsSubscriberID,
			onSettingsChange
		);
	}

	function onSettingsChange(
		settings: AppSettings
	): void {
		showBibleScrollbar =
			settings.showBibleScrollbar;
	}

	/**
	 * Commits a new active Reader location to navigation state and local history.
	 *
	 * Reader edit intent remains independent of navigation/history changes.
	 */
	function onBibleLocationRefChanged(): void {
		if (
			!bibleLocationRef ||
			!bibleVersion
		) {
			return;
		}

		updateState(
			'bibleLocationRef',
			bibleLocationRef
		);

		localStorage.setItem(
			LAST_BIBLE_LOCATION_REF,
			bibleLocationRef
		);
	}

	/**
	 * Saves the mutable Text Markup draft and returns the Reader to reading mode.
	 *
	 * This is the durable boundary for Bible Text Markup edits; click/drag
	 * interactions only mutate the in-memory draft.
	 */
	async function onExitEdit(): Promise<void> {
		readerEdit.intent = BIBLE_READER_EDIT_INTENTS.MARKUP;

		await bibleTextMarkupService.put(
			JSON.parse(JSON.stringify(textMarkup))
		);

		mode.value = BIBLE_MODES.READING;
	}


	/**
	 * Completes Add Note location selection and opens Notes in direct-create mode.
	 *
	 * The Notes list remains chapter-scoped while the new draft is anchored at
	 * the exact selected verse/word location. Text Markup is saved before leaving
	 * the Reader edit surface.
	 *
	 * @param selectedBibleLocationRef - Exact canonical Bible location selected in the chapter.
	 */
	async function onNoteLocationSelected(
		selectedBibleLocationRef: string
	): Promise<void> {
		const bibleChapterRef =
			bibleLocationReferenceService
				.extractBookIDChapter(
					selectedBibleLocationRef
				);

		await onExitEdit();

		navigation.pushModule(
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{
				bibleScope: {
					kind:
						NOTES_BIBLE_SCOPE_KINDS.CHAPTER,
					bibleLocationRef:
						bibleChapterRef
				},
				createBibleLocationRef:
					selectedBibleLocationRef
			}
		);
	}

	/**
	 * Saves pending Text Markup, then adds an exact verse/word Bookmark with
	 * the selected verse's text snapshot. Remains in the same Bible Reader.
	 * Exiting edit mode synchronously prevents duplicate selection clicks.
	 */
	async function onBookmarkLocationSelected(
		selectedBibleLocationRef: string,
		previewText: string
	): Promise<void> {
		if (readerEdit.intent !== BIBLE_READER_EDIT_INTENTS.BOOKMARK_LOCATION) {
			return;
		}
		try {
			await onExitEdit();
			await bookmarksService.create({
				kind: 'bible',
				bibleLocationRef: selectedBibleLocationRef
			}, previewText);
		} catch (error) {
			console.error('Unable to complete Add Bookmark', error);
			mode.value = BIBLE_MODES.EDIT;
			readerEdit.startBookmarkLocationSelection();
			toastService.showToast('Could not add Bookmark');
		}
	}

	/** Leaves Reader editing, then asks Bookmarks which existing ID to relocate. */
	async function onBookmarkRelocationDestinationSelected(
		selectedBibleLocationRef: string,
		previewText: string
	): Promise<void> {
		if (readerEdit.intent !== BIBLE_READER_EDIT_INTENTS.BOOKMARK_RELOCATION_LOCATION) return;
		try {
			await onExitEdit();
			navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
				mode: 'relocate',
				destinationBibleLocationRef: selectedBibleLocationRef,
				destinationPreviewText: previewText
			});
		} catch (error) {
			console.error('Could not start Bookmark relocation', error);
			mode.value = BIBLE_MODES.EDIT;
			readerEdit.startBookmarkRelocationLocationSelection();
			toastService.showToast('Could not choose Bookmark to move');
		}
	}

	/**
	 * Rebinds the Reader chapter resource selection to a newly selected Bible version.
	 *
	 * @param version - Bible version chosen by the Bible-version child view.
	 */
	function onBibleVersionSelected(
		version: BibleVersion
	): void {
		updateResourceSelection(
			BIBLE_CHAPTER_RESOURCE_TYPE,
			createBibleChapterResourceReference(
				version
			)
		);

		bibleVersion =
			version.id;
	}

	/**
	 * Validates the navigation contract required by the Bible Reader root view.
	 *
	 * @param value - Candidate navigation state owned by this Reader entry.
	 * @throws When module, view, or Reader-owned state fields are invalid.
	 */
	function validateNavState(
		value: unknown
	): asserts value is BibleReaderNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.BIBLE ||
			value.view !== BIBLE_VIEWS.READER ||
			!isRecord(value.state)
		) {
			throw new Error(
				'Invalid Bible reader navigation state'
			);
		}

		if (
			value.state.bibleLocationRef !== undefined &&
			typeof value.state.bibleLocationRef !== 'string'
		) {
			throw new Error(
				'Invalid Bible reader location state'
			);
		}

		if (
			value.state.navReadings !== undefined &&
			!isBibleReadingNavigation(
				value.state.navReadings
			)
		) {
			throw new Error(
				'Invalid Bible reader readings state'
			);
		}
	}

	function isBibleReadingNavigation(
		value: unknown
	): value is BibleReadingNavigation {
		return (
			isRecord(value) &&
			typeof value.currentNavReadingsIndex === 'number' &&
			isRecord(value.readings) &&
			Array.isArray(value.readings.bcvs)
		);
	}

	function isRecord(
		value: unknown
	): value is Record<string, unknown> {
		return (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		);
	}

	type BibleReaderNavigationState =
		NavigationState<typeof BIBLE_VIEWS.READER> & {
			readonly state:
				NavigationViewState & {
					bibleLocationRef?: string;
					navReadings?: BibleReadingNavigation;
				};
		};

</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<BibleHeader
		bind:mode
		bind:bibleLocationRef
		bind:bibleVersion
		{onExitEdit}
	></BibleHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="kjvonly-noselect flex justify-center">
		<div>
			<div id="chapter-container-{id}" class="w-full">
				<Chapter
					bind:bibleLocationRef
					bind:bibleVersion
					bind:id
					bind:mode
					bind:textMarkup
				></Chapter>
			</div>
		</div>
	</div>
{/snippet}

<!-- ================================ FOOTER =============================== -->

{#snippet footer()}
	<div class="flex w-full justify-center">
		<div class="w-full">
			{#if mode.value === BIBLE_MODES.READING}
				<ChapterNavButtons
					bind:mode
					bind:bibleLocationRef
					bind:bibleVersion
					bind:showNavButtons
					ID={id}
				></ChapterNavButtons>
			{:else}
				<div
					style="transform: translate3d(0px, 0px, 0px); "
					class="sticky z-10"
				>
					<div class="absolute bottom-0 w-full">
						<EditOptions
							bind:mode
							bibleChapterRef={bibleLocationReferenceService
								.extractBookIDChapter(
									bibleLocationRef
								)}
							{onExitEdit}
						></EditOptions>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{#if bibleLocationRef}
		{@render header()}
	{/if}
</ViewHeader>
<ViewBody
	ID={id}
	{clientHeight}
	{headerHeight}
	classes={showBibleScrollbar
		? 'clear-default-classes kjv-scrollbar-visible'
		: 'clear-default-classes'}
>
	{#if bibleLocationRef}
		{@render body()}
	{/if}
</ViewBody>
{#if bibleLocationRef}
	{@render footer()}
{/if}
