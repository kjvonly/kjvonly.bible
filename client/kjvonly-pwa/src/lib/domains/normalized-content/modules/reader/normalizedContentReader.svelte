<script lang="ts">
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	import {
		Modules,
		type NavigationState,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	import {
		KJVHeader
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
		navigationState
	} = useNavigationEntryContext();

	validateNavigationState(
		navigationState
	);

	const descriptor =
		navigationState.state.descriptor;

	const title =
		readDescriptorName(
			descriptor
		) ??
		'Document';

	const textMarkupSubscriberId =
		uuid4();

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
			unsubscribeAuthentication();
			textMarkupEditAttemptVersion += 1;
			textMarkupLoadVersion += 1;
			normalizedContentTextMarkupService.unsubscribe(
				textMarkupSubscriberId
			);
		};
	});

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
			const installed =
				await normalizedContentTextMarkupService.get(
					publisher,
					descriptor
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
		try {
			document =
				await normalizedContentService
					.getByDescriptor(
						descriptor
					);
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'Unable to load document.';
		} finally {
			loading = false;
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
			!isRecord(value.state.descriptor)
		) {
			throw new Error(
				'Invalid Normalized Content navigation state'
			);
		}
	}

	function readDescriptorName(
		value: unknown
	): string | undefined {
		if (!isRecord(value)) {
			return undefined;
		}

		const metadata =
			value.metadata;

		if (!isRecord(metadata)) {
			return undefined;
		}

		return typeof metadata.name === 'string' &&
			metadata.name.length > 0
			? metadata.name
			: undefined;
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

	type NormalizedContentNavigationState =
		NavigationState<
			typeof NORMALIZED_CONTENT_VIEWS.READER
		> & {
			readonly state: {
				readonly descriptor:
					Record<string, unknown>;
			};
		};
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet header()}
	<KJVHeader
		{title}
		{leadingContent}
		actions={editing
			? [
				{
					icon: 'edit-off',
					label: 'Cancel edits',
					onClick: onCancelEdit,
					disabled: savingTextMarkup
				},
				{
					icon: 'save',
					label: 'Save Text Markup',
					onClick: () => {
						void onSaveEdit();
					},
					disabled: savingTextMarkup
				}
			]
			: [
				{
					icon: 'edit',
					label: 'Edit',
					onClick: () => {
						void onEnterEdit();
					},
					disabled:
						!document ||
						textMarkupLoading ||
						enteringTextMarkupEdit
				}
			]}
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
	{clientHeight}
	{headerHeight}
>
	{@render body()}
</ViewBody>

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
