<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// MODEL
	import {
		Modules,
		useNavigationRuntimeContext
	} from '$lib/application';
	import { NOTES_VIEWS } from '$lib/domains/notes';
	import type { BibleMode } from '../../../models/bible.model';

	import Highlighter from '$lib/components/svgs/highlighter.svelte';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import TextFormat from '$lib/components/svgs/textFormat.svelte';
	import Underline from '$lib/components/svgs/underline.svelte';

	// =============================== BINDINGS ================================
	let {
		mode = $bindable<BibleMode>(),
		onExitEdit
	}: {
		mode: BibleMode;
		onExitEdit: () => Promise<void>;
	} = $props();

	const { navigation } =
		useNavigationRuntimeContext();

	// ================================= VARS ==================================

	let selectedColor = $state('a');
	let selectedMarkup = $state('bg');
	let selectedType = $state(1);

	let underlineColor = $state(5);
	let textColor = $state(5);
	let highlighterColor = $state(0);
	let colorPickerExpanded = $state(false);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		mode.colorMarkup = 'bg-highlighta';
		mode.type = 'bg';
	});

	// ============================== CLICK FUNCS ==============================

	function onSelectColor(color: string) {
		selectedColor = color;
		onType(selectedType);
		updateColorMarkup();
	}

	function onColorOptionClick(color: string): void {
		if (!colorPickerExpanded) {
			colorPickerExpanded = true;
			return;
		}

		onSelectColor(color);
		colorPickerExpanded = false;
	}

	async function onNoteClick(): Promise<void> {
		await onExitEdit();

		navigation.pushModule(
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{
				bibleLocationRef:
					mode.bibleLocationRef
			}
		);
	}

	function updateColorMarkup() {
		mode.colorMarkup = selectedMarkup + '-highlight' + selectedColor;
	}

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

	const collapsedColorZClasses = ['z-50', 'z-40', 'z-30', 'z-20', 'z-10'] as const;

	let visibleColorOptions = $derived(
		colorPickerExpanded
			? colorOptions
			: [
				...colorOptions.filter((option) => option.color === selectedColor),
				...colorOptions.filter((option) => option.color !== selectedColor)
			]
	);
</script>

<div class="w-full overflow-x-auto border bg-neutral-50">
	<div class="flex min-w-max items-center gap-4 px-3 py-2">
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
			onclick={() => onType(0)}
			aria-label="text color"
			class="h-8 w-8 shrink-0"
		>
			<TextFormat classes={`h-full w-full ${fills[textColor]}`}></TextFormat>
		</button>

		<button
			onclick={() => onType(1)}
			aria-label="highlight color"
			class="h-8 w-8 shrink-0"
		>
			<Highlighter classes={`h-full w-full ${fills[highlighterColor]}`}></Highlighter>
		</button>

		<button
			onclick={() => onType(2)}
			aria-label="underline color"
			class="h-8 w-8 shrink-0"
		>
			<Underline classes={`h-full w-full ${fills[underlineColor]}`}></Underline>
		</button>

		<button onclick={onNoteClick} aria-label="note" class="h-8 w-8 shrink-0">
			<NoteStack classes="h-full w-full fill-neutral-700"></NoteStack>
		</button>
	</div>
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
