<script lang="ts">
	import { onMount, tick } from 'svelte';
	import uuid4 from 'uuid4';

	import {
		Modules,
		type NavigationStateValue,
		type ResourceModuleOpenItem,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	import {
		KJVBackButton,
		KJVMoreActionsButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	import {
		KJVHeader,
		type HeaderActions
	} from '$lib/components';

	import type { NormalizedDocument } from '@kjvonly/normalized-content';
	import {
		NOTES_COLLECTION_CHANGED,
		NOTES_VIEWS,
		createNormalizedDocumentWordNoteMarkers,
		type NotesSearchResult
	} from '$lib/domains/notes';
	import {
		BOOKMARKS_VIEWS,
		parseBookmarkTarget,
		parseNormalizedBookmarkBrowseNavigationResult,
		parseNormalizedBookmarkRelocationConfirmedResult,
		type NormalizedBookmarkRelocationConfirmedResult,
		type NormalizedDocumentBookmarkTarget
	} from '$lib/domains/bookmarks';
	import type { ResourceDescriptor } from '$lib/resource';
	import { createNormalizedContentBookmarkSelection, type NormalizedContentBookmarkSelection } from './runtime/normalized-content-bookmark-selection';
	import { createNormalizedContentBookmarkMarkers } from './runtime/normalized-content-bookmark-markers';
	import {
		createNormalizedReaderLoadProfile,
			isNormalizedReaderProfilingEnabled,
		logNormalizedReaderServiceDuration,
		type NormalizedReaderLoadProfile
	} from '../../runtime/normalized-content-reader-performance';

	import {
		assertNormalizedContentWordAddress,
		type NormalizedContentAddress
	} from '../../models/normalized-content-address.model';
	import {
		NORMALIZED_CONTENT_VIEWS,
		NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES
	} from '../../models/normalized-content-navigation.model';
	import type {
		NormalizedContentTextMarkup,
		NormalizedContentTextMarkupMap
	} from '../../models/normalized-content-text-markup.model';
	import {
		cloneNormalizedContentTextMarkupMap,
		hasNormalizedContentTextMarkupDraftChanges
	} from './normalized-content-text-markup-draft';
	import {
		applyNormalizedContentTextMarkupWord,
		removeNormalizedContentTextMarkupWord,
		toggleNormalizedContentTextMarkupWord,
		type NormalizedContentTextMarkupEditSelection
	} from './normalized-content-text-markup-edit';
	import {
		normalizedContentTextMarkupDrag
	} from './interactions/normalized-content-text-markup-drag';
	import NormalizedContentTextMarkupEditOptions from './normalizedContentTextMarkupEditOptions.svelte';
	import NormalizedContentNavButtons from './normalizedContentNavButtons.svelte';
	import { NormalizedContentBlockWindow, type NormalizedContentBlockWindowChange } from './runtime/normalized-content-block-window';
	import { attachScrollAndReconcileNormalizedBlockWindow } from './runtime/normalized-content-block-window-scroll';
	import { retrieveAndCompleteNormalizedReaderDocument } from './runtime/normalized-content-reader-document-load';
	import { validateNormalizedContentReaderNavigationState } from './runtime/normalized-content-reader-navigation-state';
import {
	parseNormalizedContentTextMarkupLookupResult,
	type NormalizedContentTextMarkupLookupResult
} from './runtime/normalized-content-text-markup-lookup-result';
	import {
		captureNormalizedContentTextMarkupSave
	} from './runtime/normalized-content-text-markup-save';
	import {
		handleNormalizedContentOverflowNavigationResult
	} from './runtime/normalized-content-overflow-navigation-result';
	import {
		createNormalizedContentDocumentNotesIntent
	} from './runtime/normalized-content-document-notes-navigation';
	import {
		requireNormalizedContentDocumentIdentity,
		type NormalizedContentDocumentIdentity
	} from './runtime/normalized-content-document-identity';
	import {
		createNormalizedContentWordNotesIntent
	} from './runtime/normalized-content-word-notes-navigation';

	import {
		resolveNormalizedContentReaderTitle
	} from './normalized-content-reader-title';

	import type {
		NormalizedContentWordMarkers
	} from '../../ui/models/normalized-content-word-marker-handler';
	import NormalizedContentRenderer from '../../ui/components/normalizedContentRenderer.svelte';
	import { findNormalizedContentWordElement } from '../../ui/addressing/normalized-content-word-target';
	import {
		findNormalizedContentLocalTarget,
		readNormalizedContentLocalTargetId
	} from '../../ui/presentation/normalized-content-local-target';

	const {
		applicationReferenceResolver,
		authenticationService,
		bookmarksService,
		normalizedContentService,
		notesService,
		normalizedContentTextMarkupService,
		toastService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		isActive,
		onActivation,
		navigationState,
		onResult,
		whenActive,
		updateState
	} = useNavigationEntryContext();

	validateNormalizedContentReaderNavigationState(
		navigationState
	);

	const unsubscribeNavigationResult = onResult(onNavigationResult);

	// Persisted reader sequences are generic Resource descriptors, not FileManager
	// objects. Snapshot navigation state to keep Svelte proxies out of Workers.
	const initialDescriptor = $state.snapshot(
		navigationState.state.descriptor
	);
	// Main Bookmarks passes the canonical word as launch intent. It does not
	// manufacture a filesystem path or hold a document snapshot in navigation.
	const launchBookmarkTarget = navigationState.state.bookmarkTarget === undefined
		? undefined
		: parseBookmarkTarget(navigationState.state.bookmarkTarget);
	if (launchBookmarkTarget && launchBookmarkTarget.kind !== 'normalized-document') {
		throw new Error('Invalid Normalized Content Bookmark launch target');
	}

	const initialFileName = typeof navigationState.state.fileName === 'string'
		? navigationState.state.fileName
		: undefined;
	const sequence = navigationState.state.sequence
		? $state.snapshot(navigationState.state.sequence) as ResourceModuleOpenItem[]
		: undefined;
	let currentIndex = $state(
		sequence ? navigationState.state.sequenceIndex as number : 0
	);
	const descriptor = $derived(
		sequence?.[currentIndex]?.descriptor ?? initialDescriptor
	);
	const title = $derived(resolveNormalizedContentReaderTitle(
		descriptor,
		sequence?.[currentIndex]?.fileName ?? initialFileName
	));

	const textMarkupSubscriberId =
		uuid4();
	const readerId = uuid4();
	const notesCollectionSubscriberId = uuid4();
	const notesResultSubscriberId = uuid4();
	let wordMarkers = $state.raw<NormalizedContentWordMarkers>(new Map());
	let bookmarkMarkers = $state.raw<NormalizedContentWordMarkers>(new Map());

	const paneLayout =
		usePaneLayoutContext();

	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	let headerHeight: number =
		$state(0);

	let document =
		$state<NormalizedDocument>();

	let errorMessage =
		$state<string>();

	let loading =
		$state(true);

	// The launch Bookmark is consumed only by the initial document load.
	let initialDocumentLoadPending = true;

	let documentEditMode =
		$state(false);

	// One canonical word action can be selected at a time in document action mode.
	// Word clicks change Text Markup only when no word selection is active and markup is enabled.
	type ReaderWordAction = 'note' | 'bookmark-add' | 'bookmark-relocate' | null;
	type BookmarkSelectionMode = 'add' | 'relocate';
	let selectedWordAction = $state<ReaderWordAction>(null);
	let choosingWordNote = $derived(selectedWordAction === 'note');
	let bookmarkWordSelectionMode = $derived<BookmarkSelectionMode | null>(
		selectedWordAction === 'bookmark-add' ? 'add'
		: selectedWordAction === 'bookmark-relocate' ? 'relocate'
		: null
	);
	let choosingBookmarkWord = $derived(bookmarkWordSelectionMode !== null);
	let savingBookmark = $state(false);

	let acceptedTextMarkup =
		$state<NormalizedContentTextMarkup>();

	let textMarkupLoading =
		$state(false);

	// A failed relay verification remains unresolved until a successful retry
	// or a document/authentication change. A local copy can still be displayed.
	let textMarkupLookupFailed = $state(false);

	// Current action-mode choice: Notes/Bookmarks remain available without markup.
	let textMarkupSkippedForDocument = $state(false);

	let savingTextMarkup =
		$state(false);

	// Last identity observed by the authentication subscription; avoids resetting on re-emissions.
	let observedAuthenticationPublisher: string | undefined;

	let textMarkupMarkings =
		$state<NormalizedContentTextMarkupMap>({});

	let textMarkupSelection =
		$state<NormalizedContentTextMarkupEditSelection>({
			type: 'bg',
			colorMarkup: 'bg-highlighta'
		});

	let renderedDocumentRoot:
		HTMLDivElement | undefined =
		$state();

	/** Nested leaf projection: structural ancestors are retained, other leaves are not mounted. */
	let blockProjection = $state.raw<NormalizedContentBlockWindowChange>({
		blocks: [], indices: new Map(), orderedListStarts: new Map(), start: 0, end: 0, total: 0
	});
	const blockWindow = new NormalizedContentBlockWindow((change) => {
		blockProjection = change;
	});
	// The window has reached the final leaf; earlier leaves may be unmounted.
	const atDocumentEnd = $derived(blockProjection.end >= blockProjection.total);
	let reconcileBlocks: (() => void) | undefined;

	/** ViewBody remains the only scroll container. */
	function attachScrollAndRegisterBlockWindowReconciliation(root: HTMLElement): () => void {
		const dispose = attachScrollAndReconcileNormalizedBlockWindow(
			root,
			blockWindow,
			isActive
		);
		reconcileBlocks = dispose.reconcile;
		return () => {
			reconcileBlocks = undefined;
			dispose.destroy();
		};
	}

	/** Pane already reports reactive width/height; no resize observer is needed. */
	$effect(() => {
		const height = paneLayout.clientHeight;
		const width = paneLayout.clientWidth;
		if (height > 0 && width > 0) reconcileBlocks?.();
	});

	/**
	 * Keeps collection notifications scoped to this mounted Reader instance.
	 * Unlike Notes search results, these listeners remain registered across
	 * document changes and are released only when the Reader is unmounted.
	 */
	function subscribeToReaderCollections(): () => void {
		notesService.subscribe(
			notesCollectionSubscriberId,
			NOTES_COLLECTION_CHANGED,
			() => requestWordMarkers()
		);
		const unsubscribeBookmarks = bookmarksService.subscribe(() => requestBookmarkMarkers());
		return () => {
			unsubscribeBookmarks();
			notesService.unsubscribe(notesCollectionSubscriberId);
		};
	}

	/**
	 * Cancels account-bound word actions and reloads Text Markup when the
	 * authenticated publisher changes. Notes and Bookmark markers are
	 * refreshed by their Domain subscriptions, not authentication events.
	 * Re-emitting the same publisher preserves the active Text Markup draft.
	 */
	function handleReaderAuthenticationChange(): void {
		const publisher = authenticationService.tryGetUserId();

		if (publisher !== observedAuthenticationPublisher && selectedWordAction !== null) {
			selectedWordAction = null;
		}
		if (publisher === observedAuthenticationPublisher) {
			return;
		}

		observedAuthenticationPublisher = publisher;
		resetTextMarkupAndStartLookup(publisher);
	}

	/**
	 * Releases the Reader's subscriptions and clears its collection indicators.
	 * Called after detaching activation and navigation listeners.
	 */
	function releaseReaderSubscriptionsAndClearMarkers(
		stopCollections: () => void,
		stopAuthentication: () => void
	): void {
		clearWordMarkers();
		clearBookmarkMarkers();
		stopCollections();
		stopAuthentication();
		observedAuthenticationPublisher = undefined;
		acceptedTextMarkup = undefined;
		normalizedContentTextMarkupService.unsubscribe(textMarkupSubscriberId);
	}

	onMount(() => {
		// Hidden Readers recheck geometry when the navigation entry reactivates.
		const unsubscribeActivation = onActivation(() => reconcileBlocks?.());
		const unsubscribeCollections = subscribeToReaderCollections();
		// Preserve startup order: begin the document request before authentication
		// delivers its current state synchronously through subscribe().
		void resetAndLoadReaderDocument();
		const unsubscribeAuthentication = authenticationService.subscribe(handleReaderAuthenticationChange);

		return () => {
			unsubscribeActivation();
			unsubscribeNavigationResult();
			releaseReaderSubscriptionsAndClearMarkers(
				unsubscribeCollections,
				unsubscribeAuthentication
			);
		};
	});

	/** Handles navigation results returned by child views to this mounted Reader. */
	function onNavigationResult(result: NavigationStateValue): void {
		const lookupResult = parseNormalizedContentTextMarkupLookupResult(result);
		if (lookupResult) {
			whenActive(() => { completeTextMarkupLookupResult(lookupResult); });
			return;
		}
		const relocation = parseNormalizedBookmarkRelocationConfirmedResult(result);
		if (relocation) {
			whenActive(() => { void completeNormalizedBookmarkRelocation(relocation); });
			return;
		}
		const selected = parseNormalizedBookmarkBrowseNavigationResult(result);
		if (selected) {
			whenActive(() => { void revealBookmarkedWord(selected.target); });
			return;
		}
		handleNormalizedContentOverflowNavigationResult(result, {
			navigation,
			whenActive,
			onBrowseDocumentBookmarks
		});
	}

	/** Browse only this Reader's logical Resource; no fabricated cross-document descriptor. */
	function onBrowseDocumentBookmarks(): void {
		if (!document || loading || documentEditMode) {
			return;
		}
		const { publisher, resourceId } = descriptor.metadata;
		if (!publisher || !resourceId) {
			return;
		}
		navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
			mode: 'browse', normalizedDocument: { publisher, resourceId }
		});
	}

	/** Restore the mounted Reader and scroll to the exact canonical word. */
	async function revealBookmarkedWord(target: NormalizedDocumentBookmarkTarget): Promise<void> {
		await tick();
		if (!document || loading || !renderedDocumentRoot) {
			return;
		}
		const { publisher, resourceId } = descriptor.metadata;
		if (target.document.publisher !== publisher || target.document.resourceId !== resourceId) {
			toastService.showToast('Bookmark belongs to another document');
			return;
		}
		try {
			assertNormalizedContentWordAddress(document, target.address);
		} catch {
			toastService.showToast('Bookmarked word is no longer available');
			return;
		}
		const index = blockWindow.findBlockIndex(target.address.blockId);
		if (index === undefined) {
			return;
		}
		blockWindow.prepareIndex(index);
		await tick();
		const word = findNormalizedContentWordElement(renderedDocumentRoot, target.address);
		if (!word) {
			toastService.showToast('Bookmarked word is not rendered');
			return;
		}
		word.scrollIntoView({ block: 'center' });
		reconcileBlocks?.();
	}

	/**
	 * Apply a confirmed relocation from the Bookmarks picker. The Reader validates
	 * its current canonical destination; Bookmarks owns write authorization.
	 */
	async function completeNormalizedBookmarkRelocation(
		result: NormalizedBookmarkRelocationConfirmedResult
	): Promise<void> {
		if (!document || loading || savingBookmark) {
			return;
		}

		const { publisher, resourceId } = descriptor.metadata;
		if (result.target.document.publisher !== publisher || result.target.document.resourceId !== resourceId) {
			toastService.showToast('Bookmark destination document changed');
			return;
		}
		try {
			assertNormalizedContentWordAddress(document, result.target.address);
		} catch {
			toastService.showToast('Bookmark destination word is no longer available');
			return;
		}
		savingBookmark = true;
		try {
			await bookmarksService.relocate(result.bookmarkId, result.target, result.previewText);
			await revealBookmarkedWord(result.target);
		} catch (error) {
			console.error('Could not relocate normalized Bookmark', error);
			toastService.showToast('Could not move Bookmark');
		} finally {
			savingBookmark = false;
		}
	}

	/** Stops the previous Notes response subscription and clears its indicators. */
	function clearWordMarkers(): void {
		notesService.unsubscribe(notesResultSubscriberId);
		wordMarkers = new Map();
	}

	/**
	 * Replaces the current Notes result subscription and queries all accepted Notes.
	 * The returned collection is projected into word markers for this document;
	 * getAllNotes() does not filter the query by document identity.
	 * A fresh result ID lets the Notes worker return into this Reader's current
	 * subscription. Older result listeners are removed when the document changes.
	 */
	function requestWordMarkers(): void {
		clearWordMarkers();
		if (!document || loading) {
			return;
		}

		const profiling = isNormalizedReaderProfilingEnabled();
		const startedAt = profiling ? performance.now() : 0;
		let documentIdentity: NormalizedContentDocumentIdentity;
		try {
			// Only the logical identity is used; no Resource is passed to the Notes worker.
			documentIdentity = requireNormalizedContentDocumentIdentity(descriptor as ResourceDescriptor);
		} catch {
			return;
		}

		const resultId = uuid4();
		notesService.subscribe(
			notesResultSubscriberId,
			resultId,
			(result: NotesSearchResult) => {
				wordMarkers = createNormalizedDocumentWordNoteMarkers(
					result.notes,
					documentIdentity
				);
				if (profiling) {
					logNormalizedReaderServiceDuration('Notes marker lookup + projection', startedAt);
				}
			}
		);
		notesService.getAllNotes(resultId);
	}

	/** Clears the Bookmark indicators for the next document-scoped read. */
	function clearBookmarkMarkers(): void {
		bookmarkMarkers = new Map();
	}

	/**
	 * Reads accepted Bookmarks once for the current Resource and reprojects on
	 * create/delete/relocate/import notifications. Each result is associated
	 * with the document identity used to make the request.
	 */
	function requestBookmarkMarkers(): void {
		clearBookmarkMarkers();
		if (!document || loading) {
			return;
		}
		const profiling = isNormalizedReaderProfilingEnabled();
		const startedAt = profiling ? performance.now() : 0;
		let identity: NormalizedContentDocumentIdentity;
		try {
			identity = requireNormalizedContentDocumentIdentity(descriptor as ResourceDescriptor);
		} catch {
			return;
		}
		void bookmarksService.listForNormalizedDocument(identity)
			.then((bookmarks) => {
				if (descriptor.metadata.publisher !== identity.publisher ||
					descriptor.metadata.resourceId !== identity.resourceId) {
					return;
				}
				bookmarkMarkers = createNormalizedContentBookmarkMarkers(bookmarks);
				if (profiling) {
					logNormalizedReaderServiceDuration('Bookmark marker lookup + projection', startedAt);
				}
			})
			.catch((error) => {
				console.error('Could not load normalized Bookmark markers', error);
			});
	}

	/**
	 * Opens the existing Bookmarks Module filtered to the indicator's exact
	 * logical Resource and canonical word. No Bookmark is selected by recency.
	 */
	async function onBookmarkMarkerActivate(address: NormalizedContentAddress): Promise<void> {
		if (!document || loading || choosingWordNote || choosingBookmarkWord ||
			savingTextMarkup || savingBookmark) {
			return;
		}
		let target: ReturnType<typeof createNormalizedContentBookmarkSelection>['target'];
		try {
			target = createNormalizedContentBookmarkSelection(
				$state.snapshot(descriptor) as ResourceDescriptor,
				document, address
			).target;
		} catch {
			return;
		}
		if (documentEditMode && !await saveTextMarkupDraftAndExitEdit()) {
			return;
		}
		navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
			mode: 'browse', normalizedTarget: target
		});
	}

	/**
	 * Opens installed Notes scoped to the marker's exact canonical word.
	 * As with the toolbar Notes actions, changed markup is saved first;
	 * marker activation never toggles a word's Text Markup or follows its link.
	 */
	async function onWordMarkerActivate(address: NormalizedContentAddress): Promise<void> {
		if (!document || loading || choosingWordNote || savingTextMarkup) {
			return;
		}

		if (documentEditMode && !await saveTextMarkupDraftAndExitEdit()) {
			return;
		}

		try {
			const documentIdentity = requireNormalizedContentDocumentIdentity(
				$state.snapshot(descriptor) as ResourceDescriptor
			);
			navigation.pushModule(Modules.NOTES, NOTES_VIEWS.ROOT, {
				normalizedDocument: {
					scope: {
						kind: 'word',
						document: documentIdentity,
						address
					},
					title: ''
				}
			});
		} catch {
			toastService.showToast('Unable to open word notes');
		}
	}

	/**
	 * Saves the current markup draft and opens Notes for the logical document.
	 * Notes navigation closes document actions after saving changed markup.
	 */
	async function onOpenDocumentNotes(): Promise<void> {
		if (!document || loading || !documentEditMode || choosingWordNote || savingTextMarkup) {
			return;
		}

		if (!await saveTextMarkupDraftAndExitEdit()) {
			return;
		}

		try {
			const intent = createNormalizedContentDocumentNotesIntent(
				$state.snapshot(descriptor) as ResourceDescriptor,
				''
			);
			navigation.pushModule(Modules.NOTES, NOTES_VIEWS.ROOT, intent);
		} catch {
			toastService.showToast('Unable to open document notes');
		}
	}

	/**
	 * Starts explicit word Note selection without mutating Text Markup. The
	 * Notes editor is opened only after a canonical word is chosen.
	 */
	function onChooseWordNote(): void {
		if (!document || loading) {
			toastService.showToast('Document unavailable');
			return;
		}
		if (!documentEditMode || savingTextMarkup || selectedWordAction !== null) {
			return;
		}

		const publisher = authenticationService.tryGetUserId();
		if (!publisher) {
			toastService.showToast('Login first');
			return;
		}

		selectedWordAction = 'note';
	}

	/** Exits Note selection without creating or saving a Note. */
	function onCancelWordNoteSelection(): void {
		if (!choosingWordNote) {
			return;
		}
		selectedWordAction = null;
	}

	/** Start choosing the destination for a new Bookmark. */
	function onChooseBookmarkWord(): void {
		startBookmarkWordSelection('add');
	}

	/** Start choosing a new destination before selecting the existing Bookmark ID. */
	function onChooseBookmarkRelocationWord(): void {
		startBookmarkWordSelection('relocate');
	}

	/** Shared gesture setup; create and relocation remain separate outcomes. */
	function startBookmarkWordSelection(mode: BookmarkSelectionMode): void {
		if (!document || loading || !documentEditMode || choosingWordNote || choosingBookmarkWord || savingTextMarkup || savingBookmark) {
			return;
		}
		const publisher = authenticationService.tryGetUserId();
		if (!publisher) {
			toastService.showToast('Login first');
			return;
		}
		selectedWordAction = mode === 'add' ? 'bookmark-add' : 'bookmark-relocate';
	}

	/** Cancel either destination selection without persisting changes. */
	function onCancelBookmarkSelection(): void {
		if (savingBookmark || !choosingBookmarkWord) {
			return;
		}
		selectedWordAction = null;
	}

	/**
	 * Create a new Bookmark or open the Bookmarks picker to choose an existing
	 * Bookmark ID for relocation. Domain persistence remains in bookmarksService.
	 */
	async function createBookmarkOrOpenRelocationPicker(
		selection: NormalizedContentBookmarkSelection,
		mode: BookmarkSelectionMode
	): Promise<void> {
		if (mode === 'relocate') {
			navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
				mode: 'relocate',
				normalizedDestination: selection.target,
				destinationPreviewText: selection.previewText
			});
			return;
		}
		await bookmarksService.create(selection.target, selection.previewText);
	}

	/**
	 * Capture a canonical destination and save changed Text Markup before dispatching
	 * Bookmark creation or relocation. Recheck owner, document, and selection
	 * after the save, so a cancelled selection does not dispatch an action.
	 */
	async function onBookmarkWordSelected(address: NormalizedContentAddress): Promise<void> {
		if (savingBookmark || !choosingBookmarkWord || !document) {
			return;
		}
		const publisher = authenticationService.tryGetUserId();
		const mode = bookmarkWordSelectionMode;
		if (!publisher || !mode) {
			return;
		}
		let selection: NormalizedContentBookmarkSelection;
		try {
			selection = createNormalizedContentBookmarkSelection(
				$state.snapshot(descriptor) as ResourceDescriptor, document, address
			);
		} catch {
			toastService.showToast('Unable to select word for bookmark');
			return;
		}

		savingBookmark = true;
		try {
			if (!await saveTextMarkupDraftAndExitEdit()) {
				return;
			}
			// An account change cancels selection; the service owns write authorization.
			if (authenticationService.tryGetUserId() !== publisher || bookmarkWordSelectionMode !== mode) {
				return;
			}
			await createBookmarkOrOpenRelocationPicker(selection, mode);
			selectedWordAction = null;
		} catch (error) {
			console.error('Unable to add normalized Bookmark', error);
			if (authenticationService.tryGetUserId() === publisher) {
				documentEditMode = true;
				toastService.showToast('Could not add Bookmark');
			}
		} finally {
			savingBookmark = false;
		}
	}

	/**
	 * Suppresses native link navigation during word selection, including
	 * modified clicks that intentionally bypass generic link delegation.
	 * Outside selection mode browser link gestures are unchanged.
	 */
	function onDocumentLinkClickCapture(event: MouseEvent): void {
		if ((choosingWordNote || choosingBookmarkWord) && event.target instanceof Element && event.target.closest('a')) {
			event.preventDefault();
		}
	}

	/** Opens the Reader-local overflow view without changing the document. */
	function onOverflowClick(): void {
		navigation.pushView(
			NORMALIZED_CONTENT_VIEWS.OVERFLOW_ACTIONS,
			{}
		);
	}

	/**
	 * Handles normalized link targets in canonical order.
	 *
	 * Document-local fragments are resolved against this mounted document before
	 * application references are considered, preserving the document-local ID
	 * namespace without teaching the generic renderer application routing rules.
	 * Unresolved local fragments are also consumed so native browser navigation
	 * cannot scroll a different Pane with the same document-local ID.
	 */
	function onLinkActivate(
		hrefs: readonly string[]
	): boolean {
		if (choosingWordNote || choosingBookmarkWord) {
			return true;
		}
		let unresolvedLocalFragment = false;
		for (const href of hrefs) {
			if (readNormalizedContentLocalTargetId(href) !== undefined) {
				if (requestDocumentLocalTargetScroll(href)) {
					return true;
				}
				// Missing document-local IDs must not fall through to native
				// fragment navigation, which can target another mounted Pane.
				unresolvedLocalFragment = true;
				continue;
			}

			const destination =
				applicationReferenceResolver
					.resolve(href);

			if (!destination) {
				continue;
			}

			navigation.pushModule(
				destination.module,
				destination.view,
				destination.state
			);

			return true;
		}

		return unresolvedLocalFragment;
	}

	/**
	 * Scrolls to an already mounted local target immediately, or prepares its
	 * windowed leaf and schedules scrolling after Svelte commits the DOM.
	 *
	 * @returns Whether this Reader owns the target (mounted or indexed). A true
	 * return does not guarantee that the deferred scroll has completed.
	 */
	function requestDocumentLocalTargetScroll(
		href: string
	): boolean {
		if (!renderedDocumentRoot) {
			return false;
		}

		const target = findNormalizedContentLocalTarget(renderedDocumentRoot, href);
		if (target) {
			target.scrollIntoView({ block: 'start' });
			return true;
		}

		// A local fragment can belong to a block outside the mounted window.
		const id = readNormalizedContentLocalTargetId(href);
		const index = id === undefined ? undefined : blockWindow.findBlockIndex(id);
		if (index === undefined) {
			return false;
		}
		blockWindow.prepareIndex(index);
		void tick().then(() => {
			if (!renderedDocumentRoot) {
				return;
			}
			findNormalizedContentLocalTarget(renderedDocumentRoot, href)
				?.scrollIntoView({ block: 'start' });
			reconcileBlocks?.();
		});
		return true;
	}

	/** Advances within the caller-provided sequence, without pushing a Pane view. */
	function moveDocument(offset: number): void {
		if (
			!sequence || documentEditMode || savingTextMarkup || choosingWordNote || choosingBookmarkWord || savingBookmark
		) {
			return;
		}

		const nextIndex = currentIndex + offset;
		if (nextIndex < 0 || nextIndex >= sequence.length) {
			return;
		}

		// ViewBody remains the only scroll owner, including while changing files.
		renderedDocumentRoot?.closest('[id$="-scroll-container"]')
			?.scrollTo({ top: 0 });
		currentIndex = nextIndex;
		updateState('sequenceIndex', nextIndex);
		renderedDocumentRoot = undefined;
		resetTextMarkupAndStartLookup(
			authenticationService.tryGetUserId()
		);
		void resetAndLoadReaderDocument();
	}

	/**
	 * Opens document actions from already verified markup, or presents the
	 * recovery choices when relay verification failed. Loading and remote
	 * verification complete independently before Edit becomes available.
	 */
	function onEditRequested(): void {
		if (!document || documentEditMode || textMarkupLoading || savingTextMarkup || choosingWordNote || choosingBookmarkWord) {
			return;
		}

		const publisher =
			authenticationService.tryGetUserId();
		if (!publisher) {
			toastService.showToast(
				'Login first'
			);
			return;
		}

		if (textMarkupLookupFailed) {
			navigation.pushView(NORMALIZED_CONTENT_VIEWS.TEXT_MARKUP_LOOKUP, {
				descriptor: $state.snapshot(descriptor) as unknown as NavigationStateValue
			});
			return;
		}

		if (!acceptedTextMarkup) {
			toastService.showToast(
				'Unable to load Text Markup'
			);
			return;
		}

		textMarkupMarkings =
			cloneNormalizedContentTextMarkupMap(
				acceptedTextMarkup.markings
			);
		documentEditMode = true;
	}

	/** Cancels document actions and restores the latest accepted markings. */
	function onCancelEdit(): void {
		if (savingTextMarkup || savingBookmark) {
			return;
		}

		if (acceptedTextMarkup) {
			textMarkupMarkings =
				cloneNormalizedContentTextMarkupMap(
					acceptedTextMarkup.markings
				);
		}

		documentEditMode = false;
	}

	/**
	 * Closes document actions without writing if the visible markings are unchanged.
	 * Otherwise saves the signed-in user's draft before leaving for Notes or
	 * Bookmarks. One save per Reader may be pending; only the active markup object
	 * is replaced after persistence finishes.
	 *
	 * @returns True when actions closed, with or without a markup write.
	 */
	async function saveTextMarkupDraftAndExitEdit(): Promise<boolean> {
		if (!documentEditMode || savingTextMarkup) {
			return false;
		}

		const publisher = authenticationService.tryGetUserId();
		if (!publisher || publisher !== observedAuthenticationPublisher) {
			return false;
		}

		// This session opted out of Text Markup: closing actions is not a save.
		if (textMarkupSkippedForDocument) {
			documentEditMode = false;
			return true;
		}
		if (!acceptedTextMarkup) {
			return false;
		}

		// No visual change to persist: a Note or Bookmark action can proceed.
		if (!hasNormalizedContentTextMarkupDraftChanges(
			acceptedTextMarkup.markings,
			textMarkupMarkings
		)) {
			textMarkupMarkings = cloneNormalizedContentTextMarkupMap(acceptedTextMarkup.markings);
			documentEditMode = false;
			return true;
		}

		const saved = captureNormalizedContentTextMarkupSave(
			acceptedTextMarkup,
			textMarkupMarkings
		);
		savingTextMarkup = true;

		try {
			// put() notifies the current subscriber after the local write commits.
			await normalizedContentTextMarkupService.put(saved);
			if (acceptedTextMarkup?.id === saved.id) {
				documentEditMode = false;
				return true;
			}
		} catch {
			if (acceptedTextMarkup?.id === saved.id) {
				toastService.showToast('Unable to save Text Markup');
			}
		} finally {
			savingTextMarkup = false;
		}
		return false;
	}

	/**
	 * Consumes a canonical word during Note selection or edits Text Markup.
	 * Note selection takes precedence over markup and application links.
	 */
	function onWordActivate(address: NormalizedContentAddress): boolean {
		if (choosingBookmarkWord) {
			if (!savingBookmark && !savingTextMarkup) void onBookmarkWordSelected(address);
			return true;
		}
		if (choosingWordNote) {
			if (!savingTextMarkup) {
				void onNoteWordSelected(address);
			}
			return true;
		}

		if (!documentEditMode || !document) {
			return false;
		}

		// Document actions are open, but no word action is selected yet.
		if (textMarkupSkippedForDocument) {
			return true;
		}
		if (savingTextMarkup) {
			return true;
		}

		toggleNormalizedContentTextMarkupWord(
			document,
			textMarkupMarkings,
			address,
			textMarkupSelection
		);

		return true;
	}

	/**
	 * Validates the selected word, saves changed Text Markup, then opens one Note draft.
	 * A failed save leaves selection active so no unsaved markup is lost.
	 */
	async function onNoteWordSelected(address: NormalizedContentAddress): Promise<void> {
		if (!document || !choosingWordNote || !authenticationService.tryGetUserId()) {
			onCancelWordNoteSelection();
			return;
		}

		try {
			const intent = createNormalizedContentWordNotesIntent(
				$state.snapshot(descriptor) as ResourceDescriptor,
				'',
				$state.snapshot(document),
				address
			);
			if (!await saveTextMarkupDraftAndExitEdit()) {
				return;
			}
			if (!choosingWordNote) {
				return;
			}
			onCancelWordNoteSelection();
			navigation.pushModule(Modules.NOTES, NOTES_VIEWS.ROOT, intent);
		} catch {
			toastService.showToast('Unable to select word for note');
		}
	}

	/** Ensures the selected markup family is applied during a drag stroke. */
	function applyDragMarkup(
		address: NormalizedContentAddress
	): void {
		if (!document || savingTextMarkup || textMarkupSkippedForDocument) {
			return;
		}

		applyNormalizedContentTextMarkupWord(
			document,
			textMarkupMarkings,
			address,
			textMarkupSelection
		);
	}

	/** Ensures the selected markup family is removed during a drag stroke. */
	function removeDragMarkup(
		address: NormalizedContentAddress
	): void {
		if (!document || savingTextMarkup || textMarkupSkippedForDocument) {
			return;
		}

		removeNormalizedContentTextMarkupWord(
			document,
			textMarkupMarkings,
			address,
			textMarkupSelection
		);
	}

	/** Updates the Reader-owned markup tool selection used by click/drag edits. */
	function onTextMarkupSelectionChange(
		selection: NormalizedContentTextMarkupEditSelection
	): void {
		textMarkupSelection = selection;
	}

	/**
	 * Synchronously clears the previous document/owner's Text Markup state and
	 * subscription, then starts a local read followed by relay verification.
	 * Signing out only clears state; callers do not wait for verification.
	 */
	function resetTextMarkupAndStartLookup(publisher: string | undefined): void {
		normalizedContentTextMarkupService.unsubscribe(
			textMarkupSubscriberId
		);

		acceptedTextMarkup = undefined;
		textMarkupMarkings = {};
		textMarkupLookupFailed = false;
		textMarkupSkippedForDocument = false;
		documentEditMode = false;

		if (!publisher) {
			textMarkupLoading = false;
			return;
		}

		void displayLocalTextMarkupAndVerifyRelay(publisher);
	}

	/**
	 * Displays persisted Text Markup before waiting for the relay.
	 *
	 * Always verifies the latest published Resource through the normal installer
	 * before enabling document actions. A relay failure does not remove locally
	 * accepted markings: Edit will offer the recovery navigation view instead.
	 */
	async function displayLocalTextMarkupAndVerifyRelay(publisher: string): Promise<void> {
		const requestedDescriptor = $state.snapshot(descriptor);
		const isCurrentRequest = () =>
			publisher === observedAuthenticationPublisher &&
			requestedDescriptor.metadata.publisher === descriptor.metadata.publisher &&
			requestedDescriptor.metadata.resourceId === descriptor.metadata.resourceId &&
			requestedDescriptor.metadata.modifiedAt === descriptor.metadata.modifiedAt;

		textMarkupLoading = true;
		const profiling = isNormalizedReaderProfilingEnabled();
		const startedAt = profiling ? performance.now() : 0;

		try {
			// Render the IndexedDB snapshot immediately, without a relay round trip.
			const local = await normalizedContentTextMarkupService.getLocal(
				publisher,
				requestedDescriptor
			);
			if (!isCurrentRequest()) {
				return;
			}
			if (local) {
				applyAcceptedTextMarkup(local);
			}

			// The normal Resource loader installs a newer event before get() reads
			// the resulting accepted Domain object back from IndexedDB.
			const installed = await normalizedContentTextMarkupService.get(
				publisher,
				requestedDescriptor
			);
			if (!isCurrentRequest()) {
				return;
			}
			applyAcceptedTextMarkup(installed);
		} catch {
			if (!isCurrentRequest()) {
				return;
			}
			// Keep an already rendered local copy; uncertainty only blocks editing.
			textMarkupLookupFailed = true;
		} finally {
			if (profiling) {
				logNormalizedReaderServiceDuration('Text Markup local display and relay verification', startedAt);
			}
			if (isCurrentRequest()) textMarkupLoading = false;
		}
	}

	/** Applies accepted markings; subscribes only when the markup identity changes. */
	function applyAcceptedTextMarkup(markup: NormalizedContentTextMarkup): void {
		const previousId = acceptedTextMarkup?.id;
		acceptedTextMarkup = markup;
		textMarkupMarkings = cloneNormalizedContentTextMarkupMap(markup.markings);
		if (previousId !== markup.id) {
			normalizedContentTextMarkupService.subscribe(
				textMarkupSubscriberId,
				markup.id,
				onTextMarkupChange
			);
		}
	}

	/**
	 * Applies a completed lookup decision. A local copy opens document actions,
	 * but only a successful Retry resolves the uncertain relay lookup.
	 */
	function completeTextMarkupLookupResult(
		result: NormalizedContentTextMarkupLookupResult
	): void {
		if (!document || !textMarkupLookupFailed || textMarkupLoading) {
			return;
		}
		const publisher = authenticationService.tryGetUserId();
		if (!publisher || publisher !== observedAuthenticationPublisher) {
			return;
		}

		if (result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP) {
			continueWithoutTextMarkup();
			return;
		}
		if (result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW) {
			continueWithNewTextMarkup(publisher);
			return;
		}

		const markup = result.markup;
		if (
			publisher !== result.publisher ||
			markup.document.publisher !== descriptor.metadata.publisher ||
			markup.document.resourceId !== descriptor.metadata.resourceId ||
			markup.document.modifiedAt !== descriptor.metadata.modifiedAt
		) {
			return;
		}

		applyAcceptedTextMarkup(markup);
		textMarkupLookupFailed = result.outcome !== NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED;
		textMarkupSkippedForDocument = false;
		documentEditMode = true;
	}

	/**
	 * Skips Text Markup after an uncertain lookup while keeping Notes/Bookmarks
	 * available. Does not create a markup object or subscribe to its updates.
	 */
	function continueWithoutTextMarkup(): void {
		// Eligibility is checked once by completeTextMarkupLookupResult().
		// Keep the failed lookup unresolved so the next Edit asks again.
		textMarkupSkippedForDocument = true;
		documentEditMode = true;
	}

	/**
	 * Explicitly starts fresh when existing remote markup could not be checked.
	 * This only opens the document actions; no write occurs until changed
	 * markings are saved using the normal Text Markup Domain service.
	 */
	function continueWithNewTextMarkup(publisher: string): void {
		// Publisher and lookup eligibility are checked by the navigation-result handler.
		try {
			// A previous Continue choice may already have prepared (or saved) local markup.
			// Re-entering must not replace it with another empty object.
			if (acceptedTextMarkup) {
				textMarkupMarkings = cloneNormalizedContentTextMarkupMap(acceptedTextMarkup.markings);
			} else {
				applyAcceptedTextMarkup(normalizedContentTextMarkupService.create(
					publisher,
					$state.snapshot(descriptor)
				));
			}
			// Keep the failed lookup unresolved so the next Edit asks again.
			textMarkupSkippedForDocument = false;
			documentEditMode = true;
		} catch {
			toastService.showToast('Unable to start new Text Markup');
		}
	}

	/**
	 * Accepts notifications for the currently displayed Text Markup object.
	 * Uses the same update path as local and relay loads so a new accepted
	 * snapshot also replaces the in-progress draft in document action mode.
	 */
	function onTextMarkupChange(
		updated: NormalizedContentTextMarkup
	): void {
		// Ignore callbacks from a subscription replaced on document/user change.
		if (updated.id !== acceptedTextMarkup?.id) {
			return;
		}

		applyAcceptedTextMarkup(updated);
	}

	/** Measures Svelte DOM commit and an approximate painted frame after loading. */
	async function reportNormalizedReaderFirstFrame(
		profile: NormalizedReaderLoadProfile
	): Promise<void> {
		await tick();
		profile.mark('Svelte DOM flush completed');
		// The second animation frame runs after the browser has had a paint opportunity.
		requestAnimationFrame(() => requestAnimationFrame(() => {
			profile.mark('Frame after DOM commit');
			profile.finish();
		}));
	}

	/**
	 * Clears Reader-local state and captures the selected descriptor for loading.
	 */
	function resetReaderStateForDocumentLoad(profile?: NormalizedReaderLoadProfile) {
		onCancelWordNoteSelection();
		onCancelBookmarkSelection();
		clearWordMarkers();
		clearBookmarkMarkers();
		const isInitialLoad = initialDocumentLoadPending;
		initialDocumentLoadPending = false;
		const requestedDescriptor = $state.snapshot(descriptor) as ResourceDescriptor;
		blockWindow.reset();
		document = undefined;
		errorMessage = undefined;
		loading = true;
		profile?.mark('Reader initialized; descriptor available');
		return { isInitialLoad, requestedDescriptor };
	}

	/** Retrieves the captured descriptor independently of later sequence changes. */
	async function retrieveReaderDocument(
		requestedDescriptor: unknown,
		profile?: NormalizedReaderLoadProfile
	): Promise<NormalizedDocument> {
		profile?.mark('Document retrieval started');
		const loaded = await normalizedContentService.getByDescriptor(requestedDescriptor);
		profile?.mark('Document retrieved');
		return loaded;
	}

	/** Initializes the visible window and reveals the initial Bookmark's block. */
	function acceptLoadedReaderDocument(
		loaded: NormalizedDocument,
		isInitialLoad: boolean,
		profile?: NormalizedReaderLoadProfile
	): void {
		blockWindow.reset(loaded);
		// Opening a Bookmark must start at its destination rather than page one.
		if (isInitialLoad && launchBookmarkTarget) {
			const targetIndex = blockWindow.findBlockIndex(launchBookmarkTarget.address.blockId);
			if (targetIndex !== undefined) blockWindow.prepareIndex(targetIndex);
		}
		document = loaded;
		profile?.mark('Document assigned to Svelte state');
	}

	/**
	 * Clears loading, refreshes markers, and reveals the initial Bookmark word.
	 * Called only for the current request, including after retrieval failures.
	 */
	async function completeReaderDocumentLoad(
		isInitialLoad: boolean,
		profile?: NormalizedReaderLoadProfile
	): Promise<void> {
		loading = false;
		profile?.mark('Loading state cleared');
		requestWordMarkers();
		profile?.mark('Notes marker lookup requested');
		requestBookmarkMarkers();
		profile?.mark('Bookmark marker lookup requested');
		if (profile) void reportNormalizedReaderFirstFrame(profile);
		// Subsequent Previous/Next transitions must not replay launch intent.
		if (isInitialLoad && launchBookmarkTarget && document) {
			const revealStartedAt = profile ? performance.now() : 0;
			await revealBookmarkedWord(launchBookmarkTarget);
			if (profile) profile.duration('Bookmark target word reveal', performance.now() - revealStartedAt);
		}
	}

	/**
	 * Coordinates reset, retrieval, and completion for the selected descriptor.
	 * A result is applied only while the same Resource identity is selected.
	 * Concurrent lookups for that identity use last-completion-wins behavior.
	 */
	async function resetAndLoadReaderDocument(): Promise<void> {
		const profile = createNormalizedReaderLoadProfile();
		const { isInitialLoad, requestedDescriptor } = resetReaderStateForDocumentLoad(profile);
		// Guard the selected document identity, not a request generation.
		const isCurrentDocument = () =>
			requestedDescriptor.metadata.publisher === descriptor.metadata.publisher &&
			requestedDescriptor.metadata.resourceId === descriptor.metadata.resourceId &&
			requestedDescriptor.metadata.modifiedAt === descriptor.metadata.modifiedAt;
		await retrieveAndCompleteNormalizedReaderDocument({
			isCurrent: isCurrentDocument,
			retrieve: () => retrieveReaderDocument(requestedDescriptor, profile),
			accept: (loaded) => acceptLoadedReaderDocument(loaded, isInitialLoad, profile),
			reportError: (error) => {
				errorMessage = error instanceof Error ? error.message : 'Unable to load document.';
			},
			complete: () => completeReaderDocumentLoad(isInitialLoad, profile)
		});
	}


	/** Header actions remain separate from floating document navigation. */
	let actions = $derived.by((): HeaderActions => {
		if (choosingWordNote || choosingBookmarkWord) {
			// The selection prompt owns Cancel, as in Bible edit options.
			return [];
		}
		if (documentEditMode) {
			if (textMarkupSkippedForDocument) {
				return [{
					icon: 'edit-off',
					label: 'Close actions',
					onClick: onCancelEdit,
					disabled: savingBookmark
				}];
			}
			return [
				{
					icon: 'edit-off',
					label: 'Cancel edits',
					onClick: onCancelEdit,
					disabled: savingTextMarkup || savingBookmark
				},
				{
					icon: 'save',
					label: 'Save Text Markup',
					onClick: () => { void saveTextMarkupDraftAndExitEdit(); },
					disabled: savingTextMarkup || savingBookmark
				}
			];
		}

		return [{
			icon: 'edit' as const,
			label: 'Edit',
			onClick: onEditRequested,
			disabled: !document || textMarkupLoading || savingTextMarkup
		}];
	});

</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet trailingContent()}
	<KJVMoreActionsButton
		onClick={onOverflowClick}
		disabled={documentEditMode || savingTextMarkup || choosingWordNote || choosingBookmarkWord || savingBookmark}
	></KJVMoreActionsButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		{title}
		{leadingContent}
		{trailingContent}
		{actions}
	></KJVHeader>
{/snippet}

{#snippet body()}
	{#if loading}
		<div class="py-4 text-sm text-neutral-500">
			Loading document...
		</div>
	{:else if errorMessage}
		<div class="py-4 text-sm text-red-700">
			{errorMessage}
		</div>
	{:else if document}
		<div
			use:normalizedContentTextMarkupDrag={{
				enabled: documentEditMode && !textMarkupSkippedForDocument && !choosingWordNote && !choosingBookmarkWord && !savingTextMarkup && !savingBookmark,
				onApply: applyDragMarkup,
				onRemove: removeDragMarkup
			}}
			class="py-4"
			class:pb-20={sequence !== undefined && sequence.length > 1}
			class:kjvonly-noselect={documentEditMode || choosingWordNote || choosingBookmarkWord}
			class:touch-pan-y={documentEditMode || choosingWordNote || choosingBookmarkWord}
			onclickcapture={onDocumentLinkClickCapture}
			onauxclickcapture={onDocumentLinkClickCapture}
			bind:this={renderedDocumentRoot}
			use:attachScrollAndRegisterBlockWindowReconciliation
		>
			{#if choosingWordNote || choosingBookmarkWord}
				<div class="mb-3 px-4 text-sm text-neutral-500" role="status">
					{choosingBookmarkWord ? (bookmarkWordSelectionMode === 'relocate'
							? 'Select the new word for the bookmark. Use Cancel to exit.'
							: 'Select a word to bookmark. Use Cancel to exit.') : 'Select a word to attach a note. Use Cancel to exit.'}
				</div>
			{/if}
			<NormalizedContentRenderer
				{document}
				visibleBlocks={blockProjection.blocks}
				windowIndices={blockProjection.indices}
				orderedListStarts={blockProjection.orderedListStarts}
				{textMarkupMarkings}
				{onWordActivate}
				{onLinkActivate}
				{wordMarkers}
				{bookmarkMarkers}
				onWordMarkerActivate={choosingWordNote || choosingBookmarkWord ? undefined : onWordMarkerActivate}
				onBookmarkMarkerActivate={choosingWordNote || choosingBookmarkWord ? undefined : onBookmarkMarkerActivate}
			></NormalizedContentRenderer>
			{#if !atDocumentEnd}
				<div class="flex w-full items-center justify-center py-4" role="status" aria-label="More document blocks to render">
					<span
						class="size-7 animate-spin rounded-full border-[3px] border-support-a-500 border-t-transparent motion-reduce:animate-none"
						aria-hidden="true"
					></span>
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>

<ViewBody
	ID={readerId}
	{clientHeight}
	{headerHeight}
>
	{@render body()}
</ViewBody>

{#if sequence && sequence.length > 1 && !documentEditMode && !choosingWordNote && !choosingBookmarkWord && !savingBookmark}
	<NormalizedContentNavButtons
		scrollContainerId={`${readerId}-scroll-container`}
		{currentIndex}
		canPrevious={currentIndex > 0}
		canNext={currentIndex < sequence.length - 1}
		documentReady={!loading && Boolean(document)}
		atDocumentStart={blockProjection.start === 0}
		atDocumentEnd={atDocumentEnd}
		onPrevious={() => moveDocument(-1)}
		onNext={() => moveDocument(1)}
	></NormalizedContentNavButtons>
{/if}

{#if documentEditMode && document}
	<div class="flex w-full justify-center">
		<div class="w-full">
			<div
				style="transform: translate3d(0px, 0px, 0px);"
				class="sticky z-10"
			>
				<div class="absolute bottom-0 w-full">
					<NormalizedContentTextMarkupEditOptions
						allowTextMarkup={!textMarkupSkippedForDocument}
						selection={textMarkupSelection}
						onSelectionChange={onTextMarkupSelectionChange}
						{choosingWordNote}
						{choosingBookmarkWord}
						relocatingBookmarkWord={bookmarkWordSelectionMode === 'relocate'}
						{savingTextMarkup}
						onCancelNoteSelection={onCancelWordNoteSelection}
						onDocumentNotes={() => { void onOpenDocumentNotes(); }}
						onAddNote={onChooseWordNote}
						onAddBookmark={onChooseBookmarkWord}
						onUpdateBookmark={onChooseBookmarkRelocationWord}
						onCancelBookmarkSelection={onCancelBookmarkSelection}
					></NormalizedContentTextMarkupEditOptions>
				</div>
			</div>
		</div>
	</div>
{/if}
