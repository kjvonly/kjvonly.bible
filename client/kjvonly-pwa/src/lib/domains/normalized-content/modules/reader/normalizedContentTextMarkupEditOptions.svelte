<script lang="ts">
	import Highlighter from '$lib/components/svgs/highlighter.svelte';
	import TextFormat from '$lib/components/svgs/textFormat.svelte';
	import Underline from '$lib/components/svgs/underline.svelte';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import AddNote from '$lib/components/svgs/addNote.svelte';
	import BookmarkAdd from '$lib/components/svgs/bookmarkAdd.svelte';
	import BookmarkCheck from '$lib/components/svgs/bookmarkCheck.svelte';

	import type {
		NormalizedContentTextMarkupEditSelection
	} from './normalized-content-text-markup-edit';

	let {
		selection,
		onSelectionChange,
		allowTextMarkup = true,
		choosingWordNote = false,
		choosingBookmarkWord = false,
		relocatingBookmarkWord = false,
		savingTextMarkup = false,
		onDocumentNotes = () => {},
		onAddNote = () => {},
		onCancelNoteSelection = () => {},
		onAddBookmark = () => {},
		onUpdateBookmark = () => {},
		onCancelBookmarkSelection = () => {}
	}: {
		/** Reader-owned Text Markup palette and type. */
		selection: NormalizedContentTextMarkupEditSelection;
		/** Hide all markup controls when the user explicitly skipped an uncertain lookup. */
		allowTextMarkup?: boolean;
		/** Updates the markup palette/type without persisting it. */
		onSelectionChange: (
			selection: NormalizedContentTextMarkupEditSelection
		) => void;
		/** Replaces the toolbar with a word-selection prompt. */
		choosingWordNote?: boolean;
		/** Exclusive selection mode for one normalized word Bookmark. */
		choosingBookmarkWord?: boolean;
		/** Whether the selected word is a relocation destination. */
		relocatingBookmarkWord?: boolean;
		/** Disables cancellation while saving the existing markup draft. */
		savingTextMarkup?: boolean;
		/** Saves markup and opens Notes scoped to the current document. */
		onDocumentNotes?: () => void;
		/** Starts selecting the canonical word for a new Note. */
		onAddNote?: () => void;
		/** Cancels Note selection and restores the markup toolbar. */
		onCancelNoteSelection?: () => void;
		/** Starts selecting a canonical word for a new Bookmark. */
		onAddBookmark?: () => void;
		/** Choose the new destination before picking an existing Bookmark. */
		onUpdateBookmark?: () => void;
		/** Leaves Bookmark selection without creating anything. */
		onCancelBookmarkSelection?: () => void;
	} = $props();

	let colorPickerExpanded = $state(false);

	const colorOptions = [
		{ color: 'a', classes: 'bg-highlighta' },
		{ color: 'b', classes: 'bg-highlightb' },
		{ color: 'c', classes: 'bg-highlightc' },
		{ color: 'd', classes: 'bg-highlightd' },
		{ color: 'e', classes: 'bg-highlighte' }
	] as const;

	const collapsedColorZClasses = [
		'z-50',
		'z-40',
		'z-30',
		'z-20',
		'z-10'
	] as const;

	const selectedColor = $derived(
		selection.colorMarkup.slice(-1)
	);

	const visibleColorOptions = $derived(
		colorPickerExpanded
			? colorOptions
			: [
				...colorOptions.filter(
					(option) => option.color === selectedColor
				),
				...colorOptions.filter(
					(option) => option.color !== selectedColor
				)
			]
	);

	function onColorOptionClick(
		color: string
	): void {
		if (!colorPickerExpanded) {
			colorPickerExpanded = true;
			return;
		}

		onSelectionChange({
			type: selection.type,
			colorMarkup: `${selection.type}-highlight${color}`
		});
		colorPickerExpanded = false;
	}

	function onType(
		type: 'text' | 'bg' | 'decoration'
	): void {
		onSelectionChange({
			type,
			colorMarkup: `${type}-highlight${selectedColor}`
		});
	}

	function resolveTypeFill(
		type: 'text' | 'bg' | 'decoration'
	): string {
		return selection.type === type
			? `fill-highlight${selectedColor}`
			: 'fill-neutral-700';
	}
</script>

<div class="w-full overflow-x-auto border bg-neutral-50">
	{#if choosingWordNote}
		<div class="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2">
			<span class="font-medium text-neutral-700" role="status">Select a word for the note</span>
			<button
				type="button"
				onclick={onCancelNoteSelection}
				disabled={savingTextMarkup}
				aria-label="cancel note location selection"
				class="shrink-0 px-2 py-1 font-medium text-neutral-700 underline"
			>Cancel</button>
		</div>
	{:else if choosingBookmarkWord}
		<div class="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2">
			<span class="font-medium text-neutral-700" role="status">{relocatingBookmarkWord ? 'Select the new word for the bookmark' : 'Select a word for the bookmark'}</span>
			<button
				type="button"
				onclick={onCancelBookmarkSelection}
				disabled={savingTextMarkup}
				aria-label="cancel bookmark location selection"
				class="shrink-0 px-2 py-1 font-medium text-neutral-700 underline"
			>Cancel</button>
		</div>
	{:else}
	<div class="flex min-w-max items-center gap-4 px-3 py-2">
		{#if !allowTextMarkup}
			<span class="shrink-0 text-sm text-neutral-700">Choose an action</span>
		{/if}
		{#if allowTextMarkup}
		<div
			class="flex h-8 shrink-0 items-center"
			role="group"
			aria-label="markup color picker"
		>
			{#each visibleColorOptions as option, index}
				<button
					onclick={() => onColorOptionClick(option.color)}
					aria-label={colorPickerExpanded
						? `select color ${option.color}`
						: 'expand colors'}
					aria-pressed={selectedColor === option.color}
					aria-expanded={colorPickerExpanded}
					class="{option.classes} relative h-8 w-8 shrink-0 rounded-full transition-all duration-200 ease-out {index ===
					0
						? ''
						: colorPickerExpanded
							? 'ml-2'
							: '-ml-6'} {colorPickerExpanded
					? 'z-0'
					: collapsedColorZClasses[index]} {selectedColor === option.color
						? 'ring-2 ring-neutral-700'
						: ''}"
				></button>
			{/each}
		</div>

		<button
			onclick={() => onType('text')}
			aria-label="text color"
			aria-pressed={selection.type === 'text'}
			class="h-8 w-8 shrink-0"
		>
			<TextFormat classes={`h-full w-full ${resolveTypeFill('text')}`}></TextFormat>
		</button>

		<button
			onclick={() => onType('bg')}
			aria-label="highlight color"
			aria-pressed={selection.type === 'bg'}
			class="h-8 w-8 shrink-0"
		>
			<Highlighter classes={`h-full w-full ${resolveTypeFill('bg')}`}></Highlighter>
		</button>

		<button
			onclick={() => onType('decoration')}
			aria-label="underline color"
			aria-pressed={selection.type === 'decoration'}
			class="h-8 w-8 shrink-0"
		>
			<Underline classes={`h-full w-full ${resolveTypeFill('decoration')}`}></Underline>
		</button>

		<div class="h-6 w-px shrink-0 bg-neutral-300" aria-hidden="true"></div>
		{/if}

		<div class="flex h-8 shrink-0 items-center gap-4" role="group" aria-label="note actions">
			<button type="button" onclick={onDocumentNotes} aria-label="document notes" class="h-8 w-8 shrink-0">
				<NoteStack classes="h-full w-full fill-neutral-700"></NoteStack>
			</button>
			<button type="button" onclick={onAddNote} aria-label="add note" class="h-8 w-8 shrink-0">
				<AddNote classes="h-full w-full text-neutral-700"></AddNote>
			</button>
		</div>

		<div class="h-6 w-px shrink-0 bg-neutral-300" aria-hidden="true"></div>
		<div class="flex h-8 shrink-0 items-center gap-4" role="group" aria-label="bookmark actions">
			<button type="button" onclick={onAddBookmark} aria-label="add bookmark" class="h-8 w-8 shrink-0">
				<BookmarkAdd classes="h-full w-full text-neutral-700"></BookmarkAdd>
			</button>
			<button type="button" onclick={onUpdateBookmark} aria-label="update bookmark" class="h-8 w-8 shrink-0">
				<BookmarkCheck classes="h-full w-full text-neutral-700"></BookmarkCheck>
			</button>
		</div>
	</div>
	{/if}
</div>

<!-- Keep dynamic Text Markup classes visible to the utility CSS scanner. -->
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
