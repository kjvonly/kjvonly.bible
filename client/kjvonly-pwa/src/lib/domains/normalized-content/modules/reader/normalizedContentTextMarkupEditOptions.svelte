<script lang="ts">
	import Highlighter from '$lib/components/svgs/highlighter.svelte';
	import TextFormat from '$lib/components/svgs/textFormat.svelte';
	import Underline from '$lib/components/svgs/underline.svelte';

	import type {
		NormalizedContentTextMarkupEditSelection
	} from './normalized-content-text-markup-edit';

	let {
		selection,
		onSelectionChange
	}: {
		selection: NormalizedContentTextMarkupEditSelection;
		onSelectionChange: (
			selection: NormalizedContentTextMarkupEditSelection
		) => void;
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
	</div>
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
