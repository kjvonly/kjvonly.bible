<!-- @component
Renders the Bible Reader edit toolbar for Text Markup, Notes, and Bookmarks.
Owns markup palette/type selection UI and coordinates location-selection intent;
actual chapter click/drag mutations remain owned by chapter.svelte.
-->
<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// MODEL
	import {
		Modules,
		useNavigationRuntimeContext
	} from '$lib/application';
	import {
		NOTES_BIBLE_SCOPE_KINDS,
		NOTES_VIEWS
	} from '$lib/domains/notes';
	import type { BibleMode } from '../../../models/bible.model';

	import {
		KJVExpandableActionCluster,
		type KJVExpandableActionClusterItem
	} from '$lib/components/actions';

	import {
		BIBLE_READER_EDIT_INTENTS,
		useBibleReaderEditContext
	} from '../runtime/bible-reader-edit-context';

	import Highlighter from '$lib/components/svgs/highlighter.svelte';
	import AddNote from '$lib/components/svgs/addNote.svelte';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import BookmarkAdd from '$lib/components/svgs/bookmarkAdd.svelte';
	import BookmarkCheck from '$lib/components/svgs/bookmarkCheck.svelte';
	import TextFormat from '$lib/components/svgs/textFormat.svelte';
	import Underline from '$lib/components/svgs/underline.svelte';

	// =============================== BINDINGS ================================

	interface Props {
		/** Mutable Reader edit mode carrying the selected markup type/color. */
		mode: BibleMode;
		/** Canonical `bookID_chapter` scope used by the Chapter Notes action. */
		bibleChapterRef: string;
		/** Saves Text Markup and returns the Reader to reading mode. */
		onExitEdit: () => Promise<void>;
	}

	let {
		mode = $bindable<BibleMode>(),
		bibleChapterRef,
		onExitEdit
	}: Props = $props();

	const { navigation } =
		useNavigationRuntimeContext();
	const readerEdit =
		useBibleReaderEditContext();

	// ================================= VARS ==================================

	let noteLocationSelectionActive =
		$derived(readerEdit.intent === BIBLE_READER_EDIT_INTENTS.NOTE_LOCATION);
	let bookmarkLocationSelectionActive =
		$derived(readerEdit.intent === BIBLE_READER_EDIT_INTENTS.BOOKMARK_LOCATION);
	let bookmarkRelocationLocationSelectionActive =
		$derived(readerEdit.intent === BIBLE_READER_EDIT_INTENTS.BOOKMARK_RELOCATION_LOCATION);

	let selectedColor = $state('a');
	let selectedMarkup = $state('bg');
	let selectedType = $state(1);

	let underlineColor = $state(5);
	let textColor = $state(5);
	let highlighterColor = $state(0);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		mode.colorMarkup = 'bg-highlighta';
		mode.type = 'bg';
	});

	// ============================== CLICK FUNCS ==============================

	/**
	 * Selects a palette color while preserving the currently active markup type.
	 *
	 * @param color - Palette ID (`a` through `e`) chosen from the shared cluster.
	 */
	function onSelectColor(color: string) {
		selectedColor = color;
		onType(selectedType);
		updateColorMarkup();
	}

	/** Saves pending Text Markup, then opens Notes scoped to the current chapter. */
	async function onChapterNotesClick(): Promise<void> {
		await onExitEdit();

		navigation.pushModule(
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{
				bibleScope: {
					kind: NOTES_BIBLE_SCOPE_KINDS.CHAPTER,
					bibleLocationRef: bibleChapterRef
				}
			}
		);
	}

	/** Rebuilds `mode.colorMarkup` from the selected markup family and palette color. */
	function updateColorMarkup() {
		mode.colorMarkup = selectedMarkup + '-highlight' + selectedColor;
	}

	/**
	 * Selects the active Text Markup family and synchronizes toolbar icon fills.
	 *
	 * @param index - Index into `types`: text, background highlight, or decoration.
	 */
	function onType(index: number) {
		for (let i = 0; i < fill.length; i++) {
			if (i == index) {
				fill[i] = 'fill-highlight' + selectedColor;
				selectedType = index;
				selectedMarkup = types[index];
				mode.type = selectedMarkup;
				updateColorMarkup();
			} else {
				fill[i] = 'fill-neutral-700';
			}
		}

		textColor = fills.indexOf(fill[0]);
		highlighterColor = fills.indexOf(fill[1]);
		underlineColor = fills.indexOf(fill[2]);
	}

	let fill = ['fill-neutral-700', 'fill-highlighta', 'fill-neutral-700'];
	let fills = [
		'fill-highlighta',
		'fill-highlightb',
		'fill-highlightc',
		'fill-highlightd',
		'fill-highlighte',
		'fill-neutral-700'
	];
	let types = ['text', 'bg', 'decoration'];

	const colorOptions = [
		{ color: 'a', classes: 'bg-highlighta' },
		{ color: 'b', classes: 'bg-highlightb' },
		{ color: 'c', classes: 'bg-highlightc' },
		{ color: 'd', classes: 'bg-highlightd' },
		{ color: 'e', classes: 'bg-highlighte' }
	] as const;

	let colorActions: readonly KJVExpandableActionClusterItem[] =
		$derived(
			colorOptions.map((option) => ({
				id: option.color,
				label: `select color ${option.color}`,
				onSelect: () => onSelectColor(option.color),
				pressed: selectedColor === option.color
			}))
		);

	/**
	 * Returns the Tailwind palette class rendered for one shared-cluster action.
	 *
	 * @param id - Palette action ID.
	 */
	function colorActionClass(id: string): string {
		return colorOptions.find(
			(option) => option.color === id
		)?.classes ?? '';
	}
</script>

{#snippet colorActionIcon(item: KJVExpandableActionClusterItem)}
	<span
		class="block h-full w-full rounded-full {colorActionClass(item.id)} {item.pressed
			? 'ring-2 ring-neutral-700'
			: ''}"
	></span>
{/snippet}

{#snippet noteLocationSelectionPrompt()}
	<div class="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2">
		<span class="font-medium text-neutral-700">Select a verse or word for the note</span>
		<button
			type="button"
			onclick={readerEdit.cancelNoteLocationSelection}
			aria-label="cancel note location selection"
			class="shrink-0 px-2 py-1 font-medium text-neutral-700 underline"
		>Cancel</button>
	</div>
{/snippet}

{#snippet bookmarkRelocationLocationSelectionPrompt()}
	<div class="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2">
		<span class="font-medium text-neutral-700">Select the new verse or word for this bookmark</span>
		<button type="button"
			onclick={readerEdit.cancelBookmarkRelocationLocationSelection}
			aria-label="cancel bookmark relocation selection"
			class="shrink-0 px-2 py-1 font-medium text-neutral-700 underline"
		>Cancel</button>
	</div>
{/snippet}

{#snippet bookmarkLocationSelectionPrompt()}
	<div class="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2">
		<span class="font-medium text-neutral-700">Select a verse or word for the bookmark</span>
		<button
			type="button"
			onclick={readerEdit.cancelBookmarkLocationSelection}
			aria-label="cancel bookmark location selection"
			class="shrink-0 px-2 py-1 font-medium text-neutral-700 underline"
		>Cancel</button>
	</div>
{/snippet}

<div class="w-full overflow-x-auto border bg-neutral-50">
	{#if noteLocationSelectionActive}
		{@render noteLocationSelectionPrompt()}
	{:else if bookmarkLocationSelectionActive}
		{@render bookmarkLocationSelectionPrompt()}
	{:else if bookmarkRelocationLocationSelectionActive}
		{@render bookmarkRelocationLocationSelectionPrompt()}
	{:else}
		<div class="flex min-w-max items-center gap-4 px-3 py-2">
			<div
				class="flex h-8 shrink-0 items-center gap-4"
				role="group"
				aria-label="text markup actions"
			>
				<KJVExpandableActionCluster
					items={colorActions}
					label="markup color picker"
					expandLabel="expand colors"
					itemContent={colorActionIcon}
					collapsedPrimaryId={selectedColor}
					collapsedOverlapClass="-ml-6"
				></KJVExpandableActionCluster>

				<button
					type="button"
					onclick={() => onType(0)}
					aria-label="text color"
					class="h-8 w-8 shrink-0"
				>
					<TextFormat classes={`h-full w-full ${fills[textColor]}`}></TextFormat>
				</button>

				<button
					type="button"
					onclick={() => onType(1)}
					aria-label="highlight color"
					class="h-8 w-8 shrink-0"
				>
					<Highlighter classes={`h-full w-full ${fills[highlighterColor]}`}></Highlighter>
				</button>

				<button
					type="button"
					onclick={() => onType(2)}
					aria-label="underline color"
					class="h-8 w-8 shrink-0"
				>
					<Underline classes={`h-full w-full ${fills[underlineColor]}`}></Underline>
				</button>
			</div>

			<div
				class="h-6 w-px shrink-0 bg-neutral-300"
				aria-hidden="true"
			></div>

			<div
				class="flex h-8 shrink-0 items-center gap-4"
				role="group"
				aria-label="note actions"
			>
				<button
					type="button"
					onclick={onChapterNotesClick}
					aria-label="chapter notes"
					class="h-8 w-8 shrink-0"
				>
					<NoteStack classes="h-full w-full fill-neutral-700"></NoteStack>
				</button>

				<button
					type="button"
					onclick={readerEdit.startNoteLocationSelection}
					aria-label="add note"
					class="h-8 w-8 shrink-0"
				>
					<AddNote classes="h-full w-full text-neutral-700"></AddNote>
				</button>
			</div>

			<div class="h-6 w-px shrink-0 bg-neutral-300" aria-hidden="true"></div>

			<div
				class="flex h-8 shrink-0 items-center gap-4"
				role="group"
				aria-label="bookmark actions"
			>
				<button
					type="button"
					onclick={readerEdit.startBookmarkLocationSelection}
					aria-label="add bookmark"
					class="h-8 w-8 shrink-0"
				>
					<BookmarkAdd classes="h-full w-full text-neutral-700"></BookmarkAdd>
				</button>
				<button
					type="button"
					onclick={readerEdit.startBookmarkRelocationLocationSelection}
					aria-label="update bookmark"
					class="h-8 w-8 shrink-0"
				>
					<BookmarkCheck classes="h-full w-full text-neutral-700"></BookmarkCheck>
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- typescript will optimize these out if not used. Must keep them in dom -->

<span class="text-highlighta hidden"></span>
<span class="text-highlightb hidden"></span>
<span class="text-highlightc hidden"></span>
<span class="text-highlightd hidden"></span>
<span class="text-highlighte hidden"></span>

<span class="decoration-highlighta hidden underline"></span>
<span class="decoration-highlightb hidden underline"></span>
<span class="decoration-highlightc hidden underline"></span>
<span class="decoration-highlightd hidden underline"></span>
<span class="decoration-highlighte hidden underline"></span>
