<script lang="ts">
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	import {
		Modules,
		type NavigationState,
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

	import type {
		NormalizedDocument
	} from '@kjvonly/normalized-content';

	import type {
		NormalizedContentAddress
	} from '../../models/normalized-content-address.model';
	import {
		NORMALIZED_CONTENT_VIEWS
	} from '../../models/normalized-content-navigation.model';
	import type {
		NormalizedContentTextMarkup,
		NormalizedContentTextMarkupMap
	} from '../../models/normalized-content-text-markup.model';
	import {
		cloneNormalizedContentTextMarkupMap
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
	import {
		handleNormalizedContentOverflowNavigationResult
	} from './runtime/normalized-content-overflow-navigation-result';

	import {
		resolveNormalizedContentReaderTitle
	} from './normalized-content-reader-title';

	import NormalizedContentRenderer from '../../ui/components/normalizedContentRenderer.svelte';
	import {
		findNormalizedContentLocalTarget
	} from '../../ui/presentation/normalized-content-local-target';

	const {
		applicationReferenceResolver,
		authenticationService,
		normalizedContentService,
		normalizedContentTextMarkupService,
		toastService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		navigationState,
		onResult,
		whenActive,
		updateState
	} = useNavigationEntryContext();

	validateNavigationState(
		navigationState
	);

	const unsubscribeNavigationResult = onResult(onNavigationResult);

	// Persisted reader sequences are generic Resource descriptors, not FileManager
	// objects. Snapshot navigation state to keep Svelte proxies out of Workers.
	const initialDescriptor = $state.snapshot(
		navigationState.state.descriptor
	);
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

	// Invalidate in-flight loads when the reader moves to another Resource.
	let documentLoadVersion = 0;

	let editing =
		$state(false);

	let acceptedTextMarkup =
		$state<NormalizedContentTextMarkup>();

	let textMarkupLoading =
		$state(false);

	let savingTextMarkup =
		$state(false);

	let enteringTextMarkupEdit =
		$state(false);

	let textMarkupEditAttemptVersion = 0;

	let textMarkupLoadVersion = 0;

	let currentTextMarkupPublisher: string | undefined;

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

	onMount(() => {
		void loadDocument();

		const unsubscribeAuthentication =
			authenticationService.subscribe(
				() => {
					const publisher =
						authenticationService.tryGetUserId();

					if (publisher === currentTextMarkupPublisher) {
						return;
					}

					currentTextMarkupPublisher = publisher;
					void loadTextMarkupForCurrentUser(
						publisher
					);
				}
			);

		return () => {
			unsubscribeNavigationResult();
			documentLoadVersion += 1;
			unsubscribeAuthentication();
			textMarkupEditAttemptVersion += 1;
			textMarkupLoadVersion += 1;
			normalizedContentTextMarkupService.unsubscribe(
				textMarkupSubscriberId
			);
		};
	});

	/** Handles actions returned after the Reader's More Actions view closes. */
	function onNavigationResult(result: NavigationStateValue): void {
		handleNormalizedContentOverflowNavigationResult(result, {
			navigation,
			whenActive
		});
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
	 */
	function onLinkActivate(
		hrefs: readonly string[]
	): boolean {
		for (const href of hrefs) {
			if (activateDocumentLocalTarget(href)) {
				return true;
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

		return false;
	}

	/**
	 * Scrolls one resolved document-local block or inline anchor into view.
	 *
	 * @returns True only when the current rendered document owns the target.
	 */
	function activateDocumentLocalTarget(
		href: string
	): boolean {
		if (!renderedDocumentRoot) {
			return false;
		}

		const target =
			findNormalizedContentLocalTarget(
				renderedDocumentRoot,
				href
			);

		if (!target) {
			return false;
		}

		target.scrollIntoView({
			block: 'start'
		});

		return true;
	}

	/** Advances within the caller-provided sequence, without pushing a Pane view. */
	function moveDocument(offset: number): void {
		if (
			!sequence || editing || savingTextMarkup || enteringTextMarkupEdit
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
		void loadTextMarkupForCurrentUser(
			authenticationService.tryGetUserId()
		);
		void loadDocument();
	}

	/** Toggles Reader-local Text Markup editing without persisting the draft. */
	function onEditClick(): void {
		if (!document) {
			return;
		}

		editing = !editing;
	}

	/** Enters edit mode once, even if multiple clicks race an asynchronous reload. */
	async function onEnterEdit(): Promise<void> {
		if (!document || editing || enteringTextMarkupEdit) {
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

		// A user switch invalidates the previous entry attempt. A late
		// completion must not open (or unlock) the new user's editor.
		const attemptVersion = ++textMarkupEditAttemptVersion;
		enteringTextMarkupEdit = true;

		try {
			if (!acceptedTextMarkup) {
				await loadTextMarkup(
					publisher
				);
			}

			if (
				attemptVersion !== textMarkupEditAttemptVersion ||
				authenticationService.tryGetUserId() !== publisher
			) {
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

			onEditClick();
		} finally {
			if (attemptVersion === textMarkupEditAttemptVersion) {
				enteringTextMarkupEdit = false;
			}
		}
	}

	/** Discards the mutable draft and restores the latest accepted markup. */
	function onCancelEdit(): void {
		if (savingTextMarkup) {
			return;
		}

		if (acceptedTextMarkup) {
			textMarkupMarkings =
				cloneNormalizedContentTextMarkupMap(
					acceptedTextMarkup.markings
				);
		}

		if (editing) {
			onEditClick();
		}
	}

	/** Persists the current draft through the Text Markup service. */
	async function onSaveEdit(): Promise<void> {
		if (
			!editing ||
			!acceptedTextMarkup ||
			savingTextMarkup
		) {
			return;
		}

		const publisher = currentTextMarkupPublisher;
		if (
			!publisher ||
			authenticationService.tryGetUserId() !== publisher
		) {
			return;
		}

		// Invalidate this completion if authentication changes, including A → B → A.
		const saveLoadVersion = textMarkupLoadVersion;

		const textMarkup: NormalizedContentTextMarkup = {
			...acceptedTextMarkup,
			document: {
				...acceptedTextMarkup.document
			},
			markings:
				cloneNormalizedContentTextMarkupMap(
					textMarkupMarkings
				)
		};

		savingTextMarkup = true;

		try {
			await normalizedContentTextMarkupService.put(
				textMarkup
			);

			if (
				saveLoadVersion === textMarkupLoadVersion &&
				authenticationService.tryGetUserId() === publisher &&
				acceptedTextMarkup?.id === textMarkup.id
			) {
				acceptedTextMarkup =
					textMarkup;

				textMarkupMarkings =
					cloneNormalizedContentTextMarkupMap(
						textMarkup.markings
					);

				if (editing) {
					onEditClick();
				}
			}
		} catch {
			if (
				saveLoadVersion === textMarkupLoadVersion &&
				authenticationService.tryGetUserId() === publisher
			) {
				toastService.showToast(
					'Unable to save Text Markup'
				);
			}
		} finally {
			// A previous user's save must not unlock a newer user's save.
			if (saveLoadVersion === textMarkupLoadVersion) {
				savingTextMarkup = false;
			}
		}
	}

	/**
	 * Toggles the selected Text Markup family for one activated canonical word.
	 *
	 * @returns True only while edit mode consumes the word activation.
	 */
	function onWordActivate(
		address: NormalizedContentAddress
	): boolean {
		if (!editing || !document) {
			return false;
		}

		// Consume clicks without editing while the captured draft is being saved.
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

	/** Ensures the selected markup family is applied during a drag stroke. */
	function applyDragMarkup(
		address: NormalizedContentAddress
	): void {
		if (!document || savingTextMarkup) {
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
		if (!document || savingTextMarkup) {
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

	/** Resets the Reader only when its authenticated publisher actually changes. */
	async function loadTextMarkupForCurrentUser(
		publisher: string | undefined
	): Promise<void> {

		normalizedContentTextMarkupService.unsubscribe(
			textMarkupSubscriberId
		);

		textMarkupEditAttemptVersion += 1;
		enteringTextMarkupEdit = false;
		textMarkupLoadVersion += 1;
		// The previous user's in-flight save must not lock the new user's editor.
		savingTextMarkup = false;
		acceptedTextMarkup = undefined;
		textMarkupMarkings = {};
		editing = false;

		if (!publisher) {
			textMarkupLoading = false;
			return;
		}

		await loadTextMarkup(
			publisher
		);
	}

	/** Loads and subscribes to markup for one authenticated publisher. */
	async function loadTextMarkup(
		publisher: string
	): Promise<void> {
		const loadVersion =
			++textMarkupLoadVersion;

		textMarkupLoading = true;

		try {
			const requestedDescriptor = $state.snapshot(descriptor);
			const installed =
				await normalizedContentTextMarkupService.get(
					publisher,
					requestedDescriptor
				);

			if (
				loadVersion !==
				textMarkupLoadVersion
			) {
				return;
			}

			acceptedTextMarkup =
				installed;

			textMarkupMarkings =
				cloneNormalizedContentTextMarkupMap(
					installed.markings
				);

			normalizedContentTextMarkupService.subscribe(
				textMarkupSubscriberId,
				installed.id,
				(updated) => {
					if (loadVersion === textMarkupLoadVersion) {
						onTextMarkupChange(updated);
					}
				}
			);
		} catch {
			if (
				loadVersion ===
				textMarkupLoadVersion
			) {
				acceptedTextMarkup = undefined;
			}
		} finally {
			if (
				loadVersion ===
				textMarkupLoadVersion
			) {
				textMarkupLoading = false;
			}
		}
	}

	/** Reconciles accepted updates without overwriting an active edit draft. */
	function onTextMarkupChange(
		updated: NormalizedContentTextMarkup
	): void {
		// Never apply a notification for a different document/user markup object.
		if (updated.id !== acceptedTextMarkup?.id) {
			return;
		}

		acceptedTextMarkup =
			updated;

		if (!editing) {
			textMarkupMarkings =
				cloneNormalizedContentTextMarkupMap(
					updated.markings
				);
		}
	}

	async function loadDocument(): Promise<void> {
		const loadVersion = ++documentLoadVersion;
		const requestedDescriptor = $state.snapshot(descriptor);
		document = undefined;
		errorMessage = undefined;
		loading = true;
		try {
			const loaded = await normalizedContentService
				.getByDescriptor(requestedDescriptor);
			if (loadVersion === documentLoadVersion) {
				document = loaded;
			}
		} catch (error) {
			if (loadVersion === documentLoadVersion) {
				errorMessage = error instanceof Error
					? error.message
					: 'Unable to load document.';
			}
		} finally {
			if (loadVersion === documentLoadVersion) {
				loading = false;
			}
		}
	}

	function validateNavigationState(
		value: unknown
	): asserts value is NormalizedContentNavigationState {
		if (
			!isRecord(value) ||
			value.module !== Modules.NORMALIZED_CONTENT ||
			value.view !== NORMALIZED_CONTENT_VIEWS.READER ||
			!isRecord(value.state) ||
			!isRecord(value.state.descriptor) ||
			(value.state.sequence !== undefined && (
				!Array.isArray(value.state.sequence) ||
				value.state.sequence.length === 0 ||
				!Number.isInteger(value.state.sequenceIndex) ||
				(value.state.sequenceIndex as number) < 0 ||
				(value.state.sequenceIndex as number) >= value.state.sequence.length ||
				!value.state.sequence.every((item: unknown) =>
					isRecord(item) && isRecord(item.descriptor) &&
					typeof item.fileName === 'string'
				)
			))
		) {
			throw new Error(
				'Invalid Normalized Content navigation state'
			);
		}
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

	/** Header actions remain separate from floating document navigation. */
	let actions = $derived.by((): HeaderActions => {
		if (editing) {
			return [
				{
					icon: 'edit-off',
					label: 'Cancel edits',
					onClick: onCancelEdit,
					disabled: savingTextMarkup
				},
				{
					icon: 'save',
					label: 'Save Text Markup',
					onClick: () => { void onSaveEdit(); },
					disabled: savingTextMarkup
				}
			];
		}

		return [{
			icon: 'edit' as const,
			label: 'Edit',
			onClick: () => { void onEnterEdit(); },
			disabled: !document || textMarkupLoading || enteringTextMarkupEdit
		}];
	});

	type NormalizedContentNavigationState =
		NavigationState<
			typeof NORMALIZED_CONTENT_VIEWS.READER
		> & {
			readonly state: {
				readonly descriptor:
					Record<string, unknown>;
				readonly fileName?: string;
				readonly sequence?: readonly ResourceModuleOpenItem[];
				readonly sequenceIndex?: number;
			};
		};
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet trailingContent()}
	<KJVMoreActionsButton
		onClick={onOverflowClick}
		disabled={editing || savingTextMarkup || enteringTextMarkupEdit}
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
				enabled: editing && !savingTextMarkup,
				onApply: applyDragMarkup,
				onRemove: removeDragMarkup
			}}
			class="py-4"
			class:pb-20={sequence !== undefined && sequence.length > 1}
			class:kjvonly-noselect={editing}
			class:touch-pan-y={editing}
			bind:this={renderedDocumentRoot}
		>
			<NormalizedContentRenderer
				{document}
				{textMarkupMarkings}
				{onWordActivate}
				{onLinkActivate}
			></NormalizedContentRenderer>
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

{#if sequence && sequence.length > 1 && !editing}
	<NormalizedContentNavButtons
		scrollContainerId={`${readerId}-scroll-container`}
		{currentIndex}
		canPrevious={currentIndex > 0 && !enteringTextMarkupEdit}
		canNext={currentIndex < sequence.length - 1 && !enteringTextMarkupEdit}
		onPrevious={() => moveDocument(-1)}
		onNext={() => moveDocument(1)}
	></NormalizedContentNavButtons>
{/if}

{#if editing && document}
	<div class="flex w-full justify-center">
		<div class="w-full">
			<div
				style="transform: translate3d(0px, 0px, 0px);"
				class="sticky z-10"
			>
				<div class="absolute bottom-0 w-full">
					<NormalizedContentTextMarkupEditOptions
						selection={textMarkupSelection}
						onSelectionChange={onTextMarkupSelectionChange}
					></NormalizedContentTextMarkupEditOptions>
				</div>
			</div>
		</div>
	</div>
{/if}
