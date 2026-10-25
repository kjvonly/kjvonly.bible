<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount, tick } from 'svelte';

	// COMPONENTS
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
	import NormalizedContentTextMarkupEditOptions from './normalizedContentTextMarkupEditOptions.svelte';
	import NormalizedContentNavButtons from './normalizedContentNavButtons.svelte';
	import NormalizedDocumentProgress from './normalizedDocumentProgress.svelte';
	import NormalizedContentRenderer from '../../ui/components/normalizedContentRenderer.svelte';

	// MODELS
	import type { NormalizedDocument } from '@kjvonly/normalized-content';
	import type { ResourceDescriptor } from '$lib/resource';
	import {
		assertNormalizedContentWordAddress,
		type NormalizedContentAddress
	} from '../../models/normalized-content-address.model';
	import {
		NORMALIZED_CONTENT_VIEWS
	} from '../../models/normalized-content-navigation.model';
	import type {
		NormalizedContentTextMarkup
	} from '../../models/normalized-content-text-markup.model';
	import type { NormalizedContentTextMarkupEditSelection } from './normalized-content-text-markup-edit';
	import type {
		NormalizedContentWordMarkers
	} from '../../ui/models/normalized-content-word-marker-handler';

	// SERVICES
	import {
		Modules,
		type Settings,
		type NavigationStateValue,
		type ResourceModuleOpenItem,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
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

	// ACTION STATES
	import { ReaderActionController } from './actions/reader-action-controller.svelte';
	import { ReaderActionExitReason, ReaderActionKind, ReaderActionOutcome } from './actions/reader-action-state';
	import { ReadingState } from './actions/reading-state';
	import { TextMarkupState, TextMarkupRecoveryDecision } from './actions/text-markup-state.svelte';
	import { WithoutMarkupState } from './actions/without-markup-state';
	import { AddNoteState } from './actions/add-note-state.svelte';
	import { AddBookmarkState } from './actions/add-bookmark-state.svelte';
	import { MoveBookmarkState } from './actions/move-bookmark-state.svelte';
	import type { ReaderWordActionPorts } from './actions/word-action-ports';

	// RUNTIME
	import { createNormalizedContentBookmarkTarget } from './runtime/normalized-content-bookmark-selection';
	import { createNormalizedContentBookmarkMarkers } from './runtime/normalized-content-bookmark-markers';
	import {
		createNormalizedReaderLoadProfile,
		isNormalizedReaderProfilingEnabled,
		logNormalizedReaderServiceDuration,
		type NormalizedReaderLoadProfile
	} from '../../runtime/normalized-content-reader-performance';
	import {
		normalizedContentTextMarkupDrag
	} from './interactions/normalized-content-text-markup-drag';
	import { NormalizedContentBlockWindow, type NormalizedContentBlockWindowChange } from './runtime/normalized-content-block-window';
	import { attachScrollAndReconcileNormalizedBlockWindow } from './runtime/normalized-content-block-window-scroll';
	import { useNormalizedContentFloatingControlsVisibility } from './runtime/normalized-content-floating-controls-visibility.svelte';
	import { retrieveAndCompleteNormalizedReaderDocument } from './runtime/normalized-content-reader-document-load';
	import { validateNormalizedContentReaderNavigationState } from './runtime/normalized-content-reader-navigation-state';
	import {
		parseNormalizedContentTextMarkupLookupResult,
		type NormalizedContentTextMarkupLookupResult
	} from './runtime/normalized-content-text-markup-lookup-result';
	import {
		handleNormalizedContentOverflowNavigationResult
	} from './runtime/normalized-content-overflow-navigation-result';
	import {
		createNormalizedContentDocumentNotesIntent
	} from './runtime/normalized-content-document-notes-navigation';
	import { createNormalizedContentWordNotesBrowseIntent } from './runtime/normalized-content-word-notes-navigation';
	import {
		requireNormalizedContentDocumentIdentity,
		type NormalizedContentDocumentIdentity
	} from './runtime/normalized-content-document-identity';
	import {
		resolveNormalizedContentReaderTitle
	} from './normalized-content-reader-title';
	import { findNormalizedContentWordElement } from '../../ui/addressing/normalized-content-word-target';
	import {
		findNormalizedContentLocalTarget,
		readNormalizedContentLocalTargetId
	} from '../../ui/presentation/normalized-content-local-target';

	// OTHER
	import uuid4 from 'uuid4';

	// =============================== BINDINGS ================================
	// APPLICATION SERVICES
	const {
		applicationReferenceResolver,
		authenticationService,
		settingsService,
		bookmarksService,
		normalizedContentService,
		notesService,
		normalizedContentTextMarkupService,
		toastService
	} = useApplicationContext();

	// NAVIGATION CONTEXT
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

	// PANE LAYOUT
	const paneLayout =
		usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	// ================================= VARS ==================================
	// NAVIGATION & DOCUMENT IDENTITY
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

	// INSTANCE IDS & MARKERS
	const textMarkupSubscriberId =
		uuid4();
	const readerId = uuid4();
	const settingsSubscriberId = `${readerId}-settings`;
	const notesCollectionSubscriberId = uuid4();
	const notesResultSubscriberId = uuid4();
	let wordMarkers = $state.raw<NormalizedContentWordMarkers>(new Map());
	let bookmarkMarkers = $state.raw<NormalizedContentWordMarkers>(new Map());


	// LAYOUT
	let headerHeight: number =
		$state(0);
	let showNormalizedDocumentProgress = $state(
		settingsService.getSettings().showNormalizedDocumentProgress
	);
	let documentProgress = $state(0);

	// DOCUMENT LOAD
	let document =
		$state<NormalizedDocument>();

	let errorMessage =
		$state<string>();

	let loading =
		$state(true);

	// The launch Bookmark is consumed only by the initial document load.
	let initialDocumentLoadPending = true;

	// TEXT MARKUP & AUTHENTICATION
	let acceptedTextMarkup =
		$state<NormalizedContentTextMarkup>();

	let textMarkupLoading =
		$state(false);

	// A failed relay verification remains unresolved until a successful retry
	// or a document/authentication change. A local copy can still be displayed.
	let textMarkupLookupFailed = $state(false);

	// Last identity observed by the authentication subscription; avoids resetting on re-emissions.
	let observedAuthenticationPublisher: string | undefined;

	// ACTION STATES
	// Per-Reader state objects: only the controller chooses the next action state.
	const readingState = new ReadingState();
	const withoutMarkupState = new WithoutMarkupState();
	const actionController = new ReaderActionController(readingState);
	const textMarkupState = new TextMarkupState({
		read: () => ({
			document,
			reference: {
				publisher: descriptor.metadata.publisher,
				resourceId: descriptor.metadata.resourceId,
				modifiedAt: descriptor.metadata.modifiedAt
			},
			publisher: authenticationService.tryGetUserId(),
			observedPublisher: observedAuthenticationPublisher,
			accepted: acceptedTextMarkup,
			lookupLoading: textMarkupLoading,
			lookupFailed: textMarkupLookupFailed
		}),
		openRecovery: () => navigation.pushView(NORMALIZED_CONTENT_VIEWS.TEXT_MARKUP_LOOKUP, {
			descriptor: $state.snapshot(descriptor) as unknown as NavigationStateValue
		}),
		accept: applyAcceptedTextMarkup,
		create: (publisher) => normalizedContentTextMarkupService.create(publisher, $state.snapshot(descriptor)),
		persist: (markup) => normalizedContentTextMarkupService.put(markup),
		markLookupVerified: () => { textMarkupLookupFailed = false; },
		showError: (message) => toastService.showToast(message)
	});
	// Shared completion, context, and feedback for the three word-selection actions.
	const wordActionPorts: ReaderWordActionPorts = {
		read: () => ({
			descriptor: $state.snapshot(descriptor) as ResourceDescriptor,
			document: document ? $state.snapshot(document) : undefined,
			publisher: authenticationService.tryGetUserId()
		}),
		complete: async () =>
			(await actionController.returnFromTemporary(ReaderActionExitReason.ActionComplete)) === ReaderActionOutcome.Entered,
		showError: (message) => toastService.showToast(message)
	};
	const addNoteState = new AddNoteState({
		...wordActionPorts,
		openNotes: (intent) => navigation.pushModule(Modules.NOTES, NOTES_VIEWS.ROOT, intent)
	});
	const addBookmarkState = new AddBookmarkState({
		...wordActionPorts,
		create: async (selection) => {
			await bookmarksService.create(selection.target, selection.previewText);
		}
	});
	const moveBookmarkState = new MoveBookmarkState({
		...wordActionPorts,
		openRelocationPicker: (selection) => navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
			mode: 'relocate',
			normalizedDestination: selection.target,
			destinationPreviewText: selection.previewText
		})
	});

	let savingBookmark = $state(false); // Completed relocation result only.

	// DERIVED PRESENTATION
	// Presentation projections only; there are no competing mutable mode flags.
	const actionKind = $derived(actionController.currentState.kind);
	const actionsOpen = $derived(actionKind !== ReaderActionKind.Reading);
	const selectingWord = $derived(
		actionKind === ReaderActionKind.AddNote ||
		actionKind === ReaderActionKind.AddBookmark ||
		actionKind === ReaderActionKind.MoveBookmark
	);
	const actionSelectionBusy = $derived(
		(actionKind === ReaderActionKind.AddNote && addNoteState.busy) ||
		(actionKind === ReaderActionKind.AddBookmark && addBookmarkState.busy) ||
		(actionKind === ReaderActionKind.MoveBookmark && moveBookmarkState.busy)
	);
	const actionBusy = $derived(
		textMarkupState.saving || actionController.transitioning || savingBookmark || actionSelectionBusy
	);
	const markersInteractive = $derived(actionKind === ReaderActionKind.Reading && !actionBusy);
	const documentProgressVisible = $derived(showNormalizedDocumentProgress && Boolean(document) && !loading);
	const wordSelectionGuidance = $derived.by(() => {
		switch (actionKind) {
			case ReaderActionKind.AddNote:
				return 'Select a word to attach a note. Use Cancel to exit.';
			case ReaderActionKind.AddBookmark:
				return 'Select a word to bookmark. Use Cancel to exit.';
			case ReaderActionKind.MoveBookmark:
				return 'Select the new word for the bookmark. Use Cancel to exit.';
			default:
				return undefined;
		}
	});
	const textMarkupMarkings = $derived(
		actionKind === ReaderActionKind.TextMarkup
			? textMarkupState.markings
			: (acceptedTextMarkup?.markings ?? {})
	);
	const textMarkupSelection = $derived(textMarkupState.selection);

	// HEADER ACTIONS
	/** Presentation-only actions; the controller remains the sole action authority. */
	let actions = $derived.by((): HeaderActions => {
		switch (actionKind) {
			case ReaderActionKind.AddNote:
			case ReaderActionKind.AddBookmark:
			case ReaderActionKind.MoveBookmark:
				// Selection prompts contain their own Cancel button.
				return [];
			case ReaderActionKind.WithoutMarkup:
				return [{
					icon: 'edit-off',
					label: 'Close actions',
					onClick: onCancelEdit,
					disabled: actionBusy
				}];
			case ReaderActionKind.TextMarkup:
				return [
					{
						icon: 'edit-off',
						label: 'Cancel edits',
						onClick: onCancelEdit,
						disabled: actionBusy
					},
					{
						icon: 'save',
						label: 'Save Text Markup',
						onClick: onSaveEdit,
						disabled: actionBusy
					}
				];
			case ReaderActionKind.Reading:
				return [{
					icon: 'edit',
					label: 'Edit',
					onClick: onEditRequested,
					disabled: !document || loading || textMarkupLoading || actionBusy
				}];
		}
	});

	// DOCUMENT RENDERING & BLOCK WINDOW
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
	const showSequenceButtons = $derived(Boolean(sequence && sequence.length > 1 && !actionsOpen && !savingBookmark));
	// The runtime hook owns scroll-direction visibility; both floating controls consume it.
	const floatingControls = useNormalizedContentFloatingControlsVisibility({
		scrollContainerId: `${readerId}-scroll-container`,
		currentIndex: () => currentIndex,
		showButtons: () => showSequenceButtons,
		documentReady: () => !loading && Boolean(document),
		atDocumentStart: () => blockProjection.start === 0,
		atDocumentEnd: () => atDocumentEnd
	});
	let reconcileBlocks: (() => void) | undefined;

	// =============================== LIFECYCLE ===============================
	// BLOCK-WINDOW SCROLL BINDING
	/** ViewBody remains the only scroll container. */
	function attachScrollAndRegisterBlockWindowReconciliation(root: HTMLElement): () => void {
		const dispose = attachScrollAndReconcileNormalizedBlockWindow(
			root,
			blockWindow,
			isActive,
			(progress) => { documentProgress = progress; }
		);
		reconcileBlocks = dispose.reconcile;
		return () => {
			reconcileBlocks = undefined;
			dispose.destroy();
		};
	}

	// PANE GEOMETRY RECONCILIATION
	/** Pane already reports reactive width/height; no resize observer is needed. */
	$effect(() => {
		const height = paneLayout.clientHeight;
		const width = paneLayout.clientWidth;
		if (height > 0 && width > 0) reconcileBlocks?.();
	});

	// COLLECTION SUBSCRIPTIONS
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

	// AUTHENTICATION SUBSCRIPTION
	/**
	 * Cancels account-bound word actions and reloads Text Markup when the
	 * authenticated publisher changes. Notes and Bookmark markers are
	 * refreshed by their Domain subscriptions, not authentication events.
	 * Re-emitting the same publisher preserves the active Text Markup draft.
	 */
	function handleReaderAuthenticationChange(): void {
		const publisher = authenticationService.tryGetUserId();

		if (publisher === observedAuthenticationPublisher) {
			return;
		}

		observedAuthenticationPublisher = publisher;
		resetTextMarkupAndStartLookup(publisher);
	}

	// SETTINGS SUBSCRIPTION
	/** Applies changes to the existing ViewBody; the Pane remains the scroll owner. */
	function onReaderSettingsChange(settings: Settings): void {
		showNormalizedDocumentProgress = settings.showNormalizedDocumentProgress;
	}

	// UNMOUNT CLEANUP
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

	// MOUNT & TEARDOWN
	onMount(() => {
		// Hidden Readers recheck geometry when the navigation entry reactivates.
		const unsubscribeActivation = onActivation(() => reconcileBlocks?.());
		const unsubscribeCollections = subscribeToReaderCollections();
		settingsService.subscribe(settingsSubscriberId, onReaderSettingsChange);
		onReaderSettingsChange(settingsService.getSettings());
		// Preserve startup order: begin the document request before authentication
		// delivers its current state synchronously through subscribe().
		void resetAndLoadReaderDocument();
		const unsubscribeAuthentication = authenticationService.subscribe(handleReaderAuthenticationChange);

		return () => {
			unsubscribeActivation();
			unsubscribeNavigationResult();
			settingsService.unsubscribe(settingsSubscriberId);
			releaseReaderSubscriptionsAndClearMarkers(
				unsubscribeCollections,
				unsubscribeAuthentication
			);
		};
	});


	// ================================ FUNCS ==================================
	// READINESS & ACTION GUARDS
	/**
	 * Document retrieval and Text Markup verification belong to the exact
	 * selected Resource revision. Notes and Bookmark markers deliberately use
	 * logical document identity instead, so they ignore modifiedAt.
	 */
	function isSelectedDocumentRevision(requested: ResourceDescriptor): boolean {
		return requested.metadata.publisher === descriptor.metadata.publisher &&
			requested.metadata.resourceId === descriptor.metadata.resourceId &&
			requested.metadata.modifiedAt === descriptor.metadata.modifiedAt;
	}

	/**
	 * Document-scoped commands and marker lookups need a loaded document.
	 * The type predicate also narrows `document` for handlers using its contents.
	 */
	function isDocumentReady(candidate: NormalizedDocument | undefined): candidate is NormalizedDocument {
		return candidate !== undefined && !loading;
	}

	/**
	 * A Note or Bookmark marker opens its destination only in ReadingState.
	 * Indicators remain visible but are disabled during all other action modes.
	 */
	function canActivateMarker(candidate: NormalizedDocument | undefined): candidate is NormalizedDocument {
		return isDocumentReady(candidate) && markersInteractive;
	}

	/** A confirmed Bookmark relocation requires a loaded document and no active relocation. */
	function canCompleteBookmarkRelocation(candidate: NormalizedDocument | undefined): candidate is NormalizedDocument {
		return isDocumentReady(candidate) && !savingBookmark;
	}

	/**
	 * Document Notes preserves the active Reader state when navigated to,
	 * but is unavailable while an action transition or word selection is running.
	 */
	function canOpenDocumentNotes(): boolean {
		return isDocumentReady(document) && !actionController.transitioning && !actionSelectionBusy;
	}

	/**
	 * Previous/Next is available only for a supplied sequence in ReadingState,
	 * with no action transition, selection, or Bookmark relocation in progress.
	 */
	function canMoveToAnotherDocument(
		items: ResourceModuleOpenItem[] | undefined
	): items is ResourceModuleOpenItem[] {
		return items !== undefined && !actionsOpen && !actionController.transitioning &&
			!savingBookmark && !actionSelectionBusy;
	}

	/** Start Text Markup only when the current document is ready and no action is open or changing. */
	function canStartTextMarkup(): boolean {
		return isDocumentReady(document) && !actionsOpen && !actionController.transitioning;
	}

	// NAVIGATION RESULTS
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
			onBrowseDocumentBookmarks,
			onOpenDocumentNotes
		});
	}

	/** The existing lookup view returns one typed choice to enter an action state. */
	function completeTextMarkupLookupResult(result: NormalizedContentTextMarkupLookupResult): void {
		const choice = textMarkupState.applyRecoveryResult(result);
		if (choice === TextMarkupRecoveryDecision.TextMarkup) {
			void actionController.switchTo(textMarkupState);
		} else if (choice === TextMarkupRecoveryDecision.WithoutMarkup) {
			void actionController.switchTo(withoutMarkupState);
		}
	}

	// DOCUMENT LOADING
	/**
	 * Clears Reader-local state and captures the selected descriptor for loading.
	 */
	function resetReaderStateForDocumentLoad(profile?: NormalizedReaderLoadProfile) {
		clearWordMarkers();
		clearBookmarkMarkers();
		const isInitialLoad = initialDocumentLoadPending;
		initialDocumentLoadPending = false;
		const requestedDescriptor = $state.snapshot(descriptor) as ResourceDescriptor;
		blockWindow.reset();
		documentProgress = 0;
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
		const isCurrentDocument = () => isSelectedDocumentRevision(requestedDescriptor);
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

	// TEXT MARKUP LIFECYCLE
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
		textMarkupLookupFailed = false;
		void actionController.resetForContext(readingState);

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
			isSelectedDocumentRevision(requestedDescriptor);

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
		textMarkupState.onAccepted(markup);
		if (previousId !== markup.id) {
			normalizedContentTextMarkupService.subscribe(
				textMarkupSubscriberId,
				markup.id,
				onTextMarkupChange
			);
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

	// NOTE & BOOKMARK MARKERS
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
		if (!isDocumentReady(document)) {
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
		if (!isDocumentReady(document)) {
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

	// BOOKMARK RELOCATION
	/**
	 * Apply a confirmed relocation from the Bookmarks picker. The Reader validates
	 * its current canonical destination; Bookmarks owns write authorization.
	 */
	async function completeNormalizedBookmarkRelocation(
		result: NormalizedBookmarkRelocationConfirmedResult
	): Promise<void> {
		if (!canCompleteBookmarkRelocation(document)) {
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

	// DOCUMENT TARGETS & SCROLLING
	/** Restore the mounted Reader and scroll to the exact canonical word. */
	async function revealBookmarkedWord(target: NormalizedDocumentBookmarkTarget): Promise<void> {
		await tick();
		if (!isDocumentReady(document) || !renderedDocumentRoot) {
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
	 * Seek to a cumulative-text position using this Reader's existing window.
	 * The Pane's ViewBody remains the only vertical scroll container.
	 */
	async function onDocumentProgressSeek(progress: number): Promise<void> {
		if (!isDocumentReady(document) || !renderedDocumentRoot) return;
		const position = blockWindow.findTextPosition(progress);
		if (!position || !blockWindow.prepareIndex(position.index)) return;

		await tick();
		const root = renderedDocumentRoot;
		const viewport = root?.closest<HTMLElement>('[id$="-scroll-container"]');
		const leaf = root?.querySelector<HTMLElement>(
			`[data-normalized-window-index="${position.index + 1}"]`
		);
		if (!viewport || !leaf) return;
		const leafBounds = leaf.getBoundingClientRect();
		viewport.scrollTop += leafBounds.top - viewport.getBoundingClientRect().top
			+ leafBounds.height * position.fraction;
		reconcileBlocks?.();
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


	// ============================== CLICK FUNCS ==============================
	// NOTES & BOOKMARK NAVIGATION
	/** Browse only this Reader's logical Resource; no fabricated cross-document descriptor. */
	function onBrowseDocumentBookmarks(): void {
		if (!isDocumentReady(document)) {
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

	/**
	 * Opens the existing Bookmarks Module filtered to the indicator's exact
	 * logical Resource and canonical word. No Bookmark is selected by recency.
	 */
	function onBookmarkMarkerActivate(address: NormalizedContentAddress): void {
		if (!canActivateMarker(document)) {
			return;
		}
		try {
			const target = createNormalizedContentBookmarkTarget(
				$state.snapshot(descriptor) as ResourceDescriptor,
				document, address
			);
			navigation.pushModule(Modules.BOOKMARKS, BOOKMARKS_VIEWS.ROOT, {
				mode: 'browse', normalizedTarget: target
			});
		} catch {
			toastService.showToast('Unable to open bookmarked word');
		}
	}

	/**
	 * Browses Notes for a marker's exact canonical word in ReadingState.
	 * The marker stays visible but is not interactive during document actions.
	 */
	function onWordMarkerActivate(address: NormalizedContentAddress): void {
		if (!canActivateMarker(document)) {
			return;
		}

		try {
			const intent = createNormalizedContentWordNotesBrowseIntent(
				$state.snapshot(descriptor) as ResourceDescriptor, '', address
			);
			navigation.pushModule(Modules.NOTES, NOTES_VIEWS.ROOT, intent);
		} catch {
			toastService.showToast('Unable to open word notes');
		}
	}

	/** Opening Notes preserves the current action and its unsaved draft. */
	function onOpenDocumentNotes(): void {
		if (!canOpenDocumentNotes()) {
			return;
		}
		try {
			const intent = createNormalizedContentDocumentNotesIntent(
				$state.snapshot(descriptor) as ResourceDescriptor, ''
			);
			navigation.pushModule(Modules.NOTES, NOTES_VIEWS.ROOT, intent);
		} catch {
			toastService.showToast('Unable to open document notes');
		}
	}

	// WORD SELECTION ACTIONS
	/** Switching states saves changed Text Markup before the selection begins. */
	function onChooseWordNote(): void { void actionController.enterTemporary(addNoteState); }

	function onChooseBookmarkWord(): void { void actionController.enterTemporary(addBookmarkState); }

	function onChooseBookmarkRelocationWord(): void { void actionController.enterTemporary(moveBookmarkState); }

	function onCancelWordSelection(): void {
		void actionController.returnFromTemporary(ReaderActionExitReason.Cancel);
	}

	// LINKS & OVERFLOW
	/**
	 * Suppresses native link navigation during word selection, including
	 * modified clicks that intentionally bypass generic link delegation.
	 * Outside selection mode browser link gestures are unchanged.
	 */
	function onDocumentLinkClickCapture(event: MouseEvent): void {
		if (selectingWord && event.target instanceof Element && event.target.closest('a')) {
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
		if (actionController.currentState.onLinkActivate(hrefs)) {
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

	// DOCUMENT SEQUENCE
	/** Advances within the caller-provided sequence, without pushing a Pane view. */
	function moveDocument(offset: number): void {
		if (!canMoveToAnotherDocument(sequence)) {
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

	// TEXT MARKUP ACTIONS & GESTURES
	/** Entry either activates Text Markup or opens the existing recovery Navigation view. */
	function onEditRequested(): void {
		if (!canStartTextMarkup()) {
			return;
		}
		void actionController.switchTo(textMarkupState);
	}

	function onCancelEdit(): void {
		void actionController.switchTo(readingState, ReaderActionExitReason.Cancel);
	}

	function onSaveEdit(): void {
		void actionController.switchTo(readingState, ReaderActionExitReason.SaveAndClose);
	}

	/** Each gesture is dispatched to the current state without Reader action switches. */
	function onWordActivate(address: NormalizedContentAddress): boolean {
		return actionController.currentState.onWordClick(address);
	}

	function applyDragMarkup(address: NormalizedContentAddress): void {
		actionController.currentState.onDragApply(address);
	}

	function removeDragMarkup(address: NormalizedContentAddress): void {
		actionController.currentState.onDragRemove(address);
	}

	function onTextMarkupSelectionChange(selection: NormalizedContentTextMarkupEditSelection): void {
		textMarkupState.setSelection(selection);
	}

</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet trailingContent()}
	<KJVMoreActionsButton
		onClick={onOverflowClick}
		disabled={actionController.transitioning || actionSelectionBusy || savingBookmark}
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
				enabled: actionKind === ReaderActionKind.TextMarkup && !actionBusy,
				onApply: applyDragMarkup,
				onRemove: removeDragMarkup
			}}
			class="py-4"
			class:pb-20={sequence !== undefined && sequence.length > 1}
			class:kjvonly-noselect={actionsOpen}
			class:touch-pan-y={actionsOpen}
			onclickcapture={onDocumentLinkClickCapture}
			onauxclickcapture={onDocumentLinkClickCapture}
			bind:this={renderedDocumentRoot}
			use:attachScrollAndRegisterBlockWindowReconciliation
		>
			{#if wordSelectionGuidance}
				<div class="mb-3 px-4 text-sm text-neutral-500" role="status">
					{wordSelectionGuidance}
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
				{markersInteractive}
				onWordMarkerActivate={onWordMarkerActivate}
				onBookmarkMarkerActivate={onBookmarkMarkerActivate}
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
	classes="px-4"
>
	{@render body()}
</ViewBody>

{#if documentProgressVisible}
	<NormalizedDocumentProgress
		progress={documentProgress}
		visible={floatingControls.visible}
		height={clientHeight - headerHeight}
		onSeek={onDocumentProgressSeek}
	/>
{/if}

<NormalizedContentNavButtons
	visible={floatingControls.visible}
	showButtons={showSequenceButtons}
	canPrevious={Boolean(sequence && currentIndex > 0)}
	canNext={Boolean(sequence && currentIndex < sequence.length - 1)}
	onPrevious={() => moveDocument(-1)}
	onNext={() => moveDocument(1)}
></NormalizedContentNavButtons>

{#if actionsOpen && document}
	<div class="flex w-full justify-center">
		<div class="w-full">
			<div
				style="transform: translate3d(0px, 0px, 0px);"
				class="sticky z-10"
			>
				<div class="absolute bottom-0 w-full">
					<NormalizedContentTextMarkupEditOptions
						{actionKind}
						selection={textMarkupSelection}
						onSelectionChange={onTextMarkupSelectionChange}
						busy={actionBusy}
						onCancelWordSelection={onCancelWordSelection}
						onAddNote={onChooseWordNote}
						onAddBookmark={onChooseBookmarkWord}
						onUpdateBookmark={onChooseBookmarkRelocationWord}
					></NormalizedContentTextMarkupEditOptions>
				</div>
			</div>
		</div>
	</div>
{/if}
