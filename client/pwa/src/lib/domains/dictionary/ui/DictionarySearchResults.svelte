<!-- Headword-only results: no definition storage, decoding, or HTML rendering. -->
<script lang="ts">
	import { untrack } from 'svelte';
	import {
		KJVScrubbedViewport,
		ScrubbedWindow,
		type ScrubbedWindowEntry
	} from '$lib/components';
	import type { DictionarySearchMatch } from '../models/dictionary.model';

	type Props = {
		/** Complete, ordered headword references returned by the search worker. */
		matches: readonly DictionarySearchMatch[];
		/** Navigate to the selected headword; no definition is requested by this list. */
		onSelect: (match: DictionarySearchMatch) => void;
		/** Hide navigation for formats without a registered result opener. */
		selectable?: boolean;
	};

	let { matches, onSelect, selectable = true }: Props = $props();
	let activeMatches: readonly DictionarySearchMatch[] = [];
	let visibleMatches: ScrubbedWindowEntry<DictionarySearchMatch>[] = $state([]);
	let scrubberValue = $state(1);
	let error = $state<string | undefined>();

	const resultsWindow = new ScrubbedWindow<DictionarySearchMatch>({
		batchSize: 20,
		maxItems: 40,
		jumpItems: 20,
		loadItem: async index => activeMatches[index],
		onChange: entries => { visibleMatches = [...entries]; }
	});

	/** Formats the absolute scrubber position without reading a definition. */
	function formatScrubberValue(value: number): string {
		return activeMatches[value - 1]?.headword ?? `Word ${value}`;
	}

	/** Reports a failed window operation without leaving an unhandled rejection. */
	function reportFailure(reason: unknown): void {
		error = reason instanceof Error ? reason.message : String(reason);
	}

	$effect(() => {
		const updatedMatches = matches;
		untrack(() => {
			activeMatches = updatedMatches;
			error = undefined;
			scrubberValue = 1;
			void resultsWindow.reset(updatedMatches.length).catch(reason => {
				if (activeMatches === updatedMatches) reportFailure(reason);
			});
		});
	});
</script>

{#if error}
	<p role="alert" class="px-4 py-3 text-sm">{error}</p>
{/if}

<KJVScrubbedViewport
	min={1}
	max={matches.length}
	bind:value={scrubberValue}
	label="Dictionary headwords"
	formatValue={formatScrubberValue}
	onReachStart={() => resultsWindow.prepend().catch(reportFailure)}
	onReachEnd={() => resultsWindow.append().catch(reportFailure)}
	prepareValue={value => resultsWindow.prepareValue(value).catch(reason => {
		reportFailure(reason);
		return undefined;
	})}
>
	{#each visibleMatches as result (result.value)}
		<div data-kjv-scrubber-value={result.value}>
			<button
				type="button"
				disabled={!selectable}
				class="flex min-h-12 w-full min-w-0 items-center py-3 pl-4 pr-12 text-left hover:bg-neutral-100 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-primary-500"
				onclick={() => onSelect(result.item)}
			>
				<span class="grid w-[38ch] max-w-full grid-cols-[minmax(0,1fr)_max-content] items-baseline gap-3">
					<span class="min-w-0 truncate text-base">{result.item.headword}</span>
					{#if result.item.key !== result.item.headword}
						<span class="text-sm text-neutral-600">{result.item.key}</span>
					{/if}
				</span>
			</button>
		</div>
	{/each}
</KJVScrubbedViewport>
