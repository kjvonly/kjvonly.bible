<script lang="ts">
	// BIBLE
	import {
		BibleReferenceLabelService,
		type BibleChapterVerseCountLookup
	} from '$lib/domains/bible';

	// COMPONENTS
	import { KJVAdaptiveText } from '$lib/components';

	// MODELS
	import type { Readings } from '../../../models/plans.model';

	const EMPTY_COMPLETED_READINGS = new Set<number>();
	const bibleReferenceLabelService =
		new BibleReferenceLabelService();

	let {
		readings,
		readingIndexes,
		totalReadings = readings.length,
		nextReadingIndex = undefined,
		completedReadingIndexes = EMPTY_COMPLETED_READINGS,
		verseCountByBookChapter,
		shortBookNamesById,
		onReadingSelected = undefined
	}: {
		readings: Readings[];
		readingIndexes: readonly number[];
		totalReadings?: number;
		nextReadingIndex?: number;
		completedReadingIndexes?: ReadonlySet<number>;
		verseCountByBookChapter: BibleChapterVerseCountLookup;
		shortBookNamesById: Readonly<Record<string, string>>;
		onReadingSelected?: (index: number) => void;
	} = $props();

	function longReferenceLabel(
		readingIndex: number,
		bcvIndex: number
	): string {
		const bcv =
			readings[readingIndex]?.bcvs[bcvIndex];

		if (!bcv) {
			return '';
		}

		return bibleReferenceLabelService.format(
			bcv,
			verseCountByBookChapter
		);
	}

	function shortReferenceLabel(
		readingIndex: number,
		bcvIndex: number
	): string {
		const bcv =
			readings[readingIndex]?.bcvs[bcvIndex];

		if (!bcv) {
			return '';
		}

		return bibleReferenceLabelService.format(
			bcv,
			verseCountByBookChapter,
			shortBookNamesById[String(bcv.bookID)] ??
				bcv.bookName
		);
	}
</script>

{#snippet readingRow(readingIndex: number)}
	{@const reading = readings[readingIndex]}
	{@const statusLabel = completedReadingIndexes.has(readingIndex)
		? 'Completed'
		: readingIndex === nextReadingIndex
			? 'Next'
			: undefined}
	<div class="grid w-full min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-stretch py-3">
		<div class="flex min-w-0 flex-col justify-start border-r border-neutral-300 pr-3 text-left">
			{#if statusLabel}
				<span class="text-xs text-support-a-500">{statusLabel}</span>
			{/if}
			<span class="text-sm text-neutral-500">
				{readingIndex + 1} / {totalReadings}
			</span>
		</div>

		<div class="min-w-0 pl-3 text-left italic">
			{#if statusLabel}
				<span aria-hidden="true" class="invisible block text-xs">{statusLabel}</span>
			{/if}
			<div class="flex min-w-0 flex-col gap-1">
				{#each reading?.bcvs ?? [] as _, bcvIndex}
					<KJVAdaptiveText
						longText={longReferenceLabel(readingIndex, bcvIndex)}
						shortText={shortReferenceLabel(readingIndex, bcvIndex)}
						wrap
					></KJVAdaptiveText>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

<div class="flex w-full min-w-0 flex-col">
	{#each readingIndexes as readingIndex}
		{#if readings[readingIndex]}
			{#if onReadingSelected}
				<button
					type="button"
					data-kjv-scrubber-value={readingIndex + 1}
					onclick={() => onReadingSelected(readingIndex)}
					class="w-full min-w-0 text-left transition-colors duration-150 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-500"
				>
					{@render readingRow(readingIndex)}
				</button>
			{:else}
				<div data-kjv-scrubber-value={readingIndex + 1} class="w-full min-w-0">
					{@render readingRow(readingIndex)}
				</div>
			{/if}
		{/if}
	{/each}
</div>
